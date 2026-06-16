/**
 * blastimage — Supabase persistence adapter (BI-022.3; image buckets BI-022.4)
 *
 * Implements the {@link PersistenceAdapter} seam against the owner-scoped
 * Postgres schema in `supabase/migrations`. It maps the nested domain
 * {@link Session} (tasks → iterations → generated_images, plus the ref-image
 * library) to and from the relational rows, and stores the active-session
 * pointer in `app_settings` — the cloud mirror of localStorage's single
 * active-session key.
 *
 * **Owner scoping.** Inserts omit `owner`; the column defaults to `auth.uid()`
 * and RLS `with check (owner = auth.uid())` guarantees rows belong to the
 * logged-in operator. The login flow is BI-022.6 — this adapter assumes a
 * Supabase session is present.
 *
 * **saveSession is replace-then-insert** (delete the session's children, then
 * re-insert from the current state) rather than a per-row diff: the app always
 * saves whole sessions, so a full replace matches the localStorage semantics
 * exactly. The deletes + inserts are issued sequentially, not in one
 * transaction — acceptable for a single-operator instance; wrapping them in a
 * Postgres RPC for atomicity is a future refinement.
 *
 * **Image bytes live in a private storage bucket** (BI-022.4), not inline in
 * the rows. Each generated/reference image is uploaded once to
 * `{owner}/{session_id}/{image_id}` in the `images` bucket; the row carries the
 * object's `storage_path`. `saveSession` uploads bytes not yet present (decoding
 * data URLs and re-hosting remote Grok URLs alike, keyed by image id so a
 * re-save never re-uploads); `loadSession` mints short-lived signed URLs and
 * places them in the domain `url` / `dataUrl`, so the UI renders unchanged.
 * `deleteSession` removes the session's bucket objects.
 */

import type {
  FeedbackState,
  GeneratedImage,
  ID,
  Iteration,
  PromptTask,
  RefImage,
  Session,
} from './types';
import type { PersistenceAdapter } from './persistence';
import type { Result, SessionMeta } from './storage';
import { getSupabaseClient } from './supabaseClient';
import type { SupabaseClient } from '@supabase/supabase-js';

/** Private bucket holding all generated + reference image bytes. */
const BUCKET = 'images';
/**
 * Signed-URL lifetime for loaded images. Generous (single-operator instance;
 * images render once at session load and the browser caches the bytes) — long
 * enough to outlast a working session without a re-sign.
 */
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 8;

/** Deterministic bucket object path for an image — owner-prefixed for RLS. */
function imageObjectPath(owner: ID, sessionId: ID, imageId: ID): string {
  return `${owner}/${sessionId}/${imageId}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Row shapes (the columns the adapter reads/writes)
// ─────────────────────────────────────────────────────────────────────────

interface SessionRow {
  id: ID;
  name: string;
  schema_version: number;
  created_at: string;
  updated_at: string;
}
interface RefImageRow {
  id: ID;
  session_id: ID;
  position: number;
  name: string;
  storage_path: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  added_at: string;
}
interface TaskRow {
  id: ID;
  session_id: ID;
  position: number;
  name: string;
  base_prompt: string;
  active_ref_image_ids: ID[];
  created_at: string;
  updated_at: string;
}
interface IterationRow {
  id: ID;
  task_id: ID;
  session_id: ID;
  idx: number;
  prompt: string;
  ref_image_ids: ID[];
  primary_ref_image_id: ID | null;
  created_at: string;
}
interface GeneratedImageRow {
  id: ID;
  iteration_id: ID;
  session_id: ID;
  position: number;
  storage_path: string;
  prompt: string;
  status: GeneratedImage['status'];
  decision: GeneratedImage['decision'];
  rating: number;
  feedback: FeedbackState | null;
  created_at: string;
}

/** The full set of insert payloads for one session, owner omitted (DB default). */
export interface SessionRows {
  session: SessionRow;
  refImages: RefImageRow[];
  tasks: TaskRow[];
  iterations: IterationRow[];
  images: GeneratedImageRow[];
}

// ─────────────────────────────────────────────────────────────────────────
// Image bytes ↔ blobs
// ─────────────────────────────────────────────────────────────────────────

/**
 * Decodes a base64 (or url-encoded) data URL into a {@link Blob}, carrying the
 * declared content type. Pure (browser/jsdom `atob` + `Blob`) for unit testing
 * without a network or Supabase client.
 */
export function dataUrlToBlob(dataUrl: string): Blob {
  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(0, comma);
  const data = dataUrl.slice(comma + 1);
  const contentType = /^data:([^;]+)/.exec(header)?.[1] ?? 'application/octet-stream';
  if (/;base64/i.test(header)) {
    const binary = atob(data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: contentType });
  }
  return new Blob([decodeURIComponent(data)], { type: contentType });
}

/** Resolves an image's bytes to a blob: data URLs decode locally; remote URLs (Grok) are fetched. */
async function imageToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) return dataUrlToBlob(url);
  const res = await fetch(url);
  return res.blob();
}

// ─────────────────────────────────────────────────────────────────────────
// Pure mapping (domain ↔ rows) — exported for unit testing without a client
// ─────────────────────────────────────────────────────────────────────────

/**
 * Flattens a {@link Session} into the relational insert payloads. Image rows
 * carry the deterministic bucket `storage_path` (owner-prefixed); the bytes
 * themselves are uploaded separately by {@link supabaseAdapter.saveSession}.
 */
export function sessionToRows(session: Session, owner: ID): SessionRows {
  const refImages: RefImageRow[] = session.refLibrary.map((r, position) => ({
    id: r.id,
    session_id: session.id,
    position,
    name: r.name,
    storage_path: imageObjectPath(owner, session.id, r.id),
    mime_type: r.mimeType,
    width: r.width ?? null,
    height: r.height ?? null,
    added_at: r.addedAt,
  }));

  const tasks: TaskRow[] = [];
  const iterations: IterationRow[] = [];
  const images: GeneratedImageRow[] = [];

  session.tasks.forEach((task, taskPosition) => {
    tasks.push({
      id: task.id,
      session_id: session.id,
      position: taskPosition,
      name: task.name,
      base_prompt: task.basePrompt,
      active_ref_image_ids: task.activeRefImageIds,
      created_at: task.createdAt,
      updated_at: task.updatedAt,
    });
    for (const it of task.iterations) {
      iterations.push({
        id: it.id,
        task_id: task.id,
        session_id: session.id,
        idx: it.index,
        prompt: it.prompt,
        ref_image_ids: it.refImageIds,
        primary_ref_image_id: it.primaryRefImageId,
        created_at: it.createdAt,
      });
      it.images.forEach((img, imgPosition) => {
        images.push({
          id: img.id,
          iteration_id: it.id,
          session_id: session.id,
          position: imgPosition,
          storage_path: imageObjectPath(owner, session.id, img.id),
          prompt: img.prompt,
          status: img.status,
          decision: img.decision,
          rating: img.rating,
          feedback: img.feedback,
          created_at: img.createdAt,
        });
      });
    }
  });

  return {
    session: {
      id: session.id,
      name: session.name,
      schema_version: session.schemaVersion,
      created_at: session.createdAt,
      updated_at: session.updatedAt,
    },
    refImages,
    tasks,
    iterations,
    images,
  };
}

/**
 * Reassembles a {@link Session} from its relational rows (any row order).
 * `resolveImageUrl` turns a row's `storage_path` into a usable image URL (a
 * signed bucket URL in {@link supabaseAdapter.loadSession}); injected so the
 * mapping stays pure and client-free for unit testing.
 */
export function rowsToSession(
  session: SessionRow,
  refRows: RefImageRow[],
  taskRows: TaskRow[],
  iterRows: IterationRow[],
  imgRows: GeneratedImageRow[],
  resolveImageUrl: (storagePath: string) => string,
): Session {
  // Postgres timestamptz columns come back as e.g. "…+00:00"; the domain model
  // (and the localStorage adapter) use canonical ISO "…Z" strings. Normalize so
  // timestamps are format-identical across both backends. (Timestamps nested in
  // jsonb — e.g. feedback.updatedAt — round-trip verbatim and need no fixup.)
  const toIso = (s: string): string => new Date(s).toISOString();

  const imagesByIteration = new Map<ID, GeneratedImageRow[]>();
  for (const img of imgRows) {
    const list = imagesByIteration.get(img.iteration_id) ?? [];
    list.push(img);
    imagesByIteration.set(img.iteration_id, list);
  }
  const itersByTask = new Map<ID, IterationRow[]>();
  for (const it of iterRows) {
    const list = itersByTask.get(it.task_id) ?? [];
    list.push(it);
    itersByTask.set(it.task_id, list);
  }

  const toImage = (row: GeneratedImageRow): GeneratedImage => ({
    id: row.id,
    url: resolveImageUrl(row.storage_path),
    prompt: row.prompt,
    status: row.status,
    decision: row.decision,
    rating: row.rating as GeneratedImage['rating'],
    feedback: row.feedback,
    createdAt: toIso(row.created_at),
  });

  const toIteration = (row: IterationRow): Iteration => ({
    id: row.id,
    index: row.idx,
    prompt: row.prompt,
    refImageIds: row.ref_image_ids,
    primaryRefImageId: row.primary_ref_image_id,
    images: (imagesByIteration.get(row.id) ?? [])
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toImage),
    createdAt: toIso(row.created_at),
  });

  const toTask = (row: TaskRow): PromptTask => ({
    id: row.id,
    name: row.name,
    basePrompt: row.base_prompt,
    activeRefImageIds: row.active_ref_image_ids,
    iterations: (itersByTask.get(row.id) ?? [])
      .slice()
      .sort((a, b) => a.idx - b.idx)
      .map(toIteration),
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  });

  const refLibrary: RefImage[] = refRows
    .slice()
    .sort((a, b) => a.position - b.position)
    .map((r) => ({
      id: r.id,
      name: r.name,
      dataUrl: resolveImageUrl(r.storage_path),
      mimeType: r.mime_type,
      ...(r.width != null ? { width: r.width } : {}),
      ...(r.height != null ? { height: r.height } : {}),
      addedAt: toIso(r.added_at),
    }));

  return {
    id: session.id,
    name: session.name,
    tasks: taskRows
      .slice()
      .sort((a, b) => a.position - b.position)
      .map(toTask),
    refLibrary,
    createdAt: toIso(session.created_at),
    updatedAt: toIso(session.updated_at),
    schemaVersion: session.schema_version,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Bucket IO (client-bound; verified against a live local stack)
// ─────────────────────────────────────────────────────────────────────────

/** Resolves the logged-in operator's id, or throws if no session is present. */
async function ownerId(): Promise<ID> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated.');
  return data.user.id;
}

/**
 * Uploads every image's bytes to the bucket, skipping ids already present (so a
 * re-save never re-uploads). Returns an error message on failure, or `null` on
 * success. A "resource already exists" upload race is tolerated as success.
 */
async function uploadSessionImages(
  sb: SupabaseClient,
  owner: ID,
  session: Session,
): Promise<string | null> {
  const prefix = `${owner}/${session.id}`;
  const { data: existing } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
  const have = new Set((existing ?? []).map((o) => o.name));

  const items: { id: ID; url: string }[] = [
    ...session.refLibrary.map((r) => ({ id: r.id, url: r.dataUrl })),
    ...session.tasks.flatMap((t) =>
      t.iterations.flatMap((it) => it.images.map((img) => ({ id: img.id, url: img.url }))),
    ),
  ];

  for (const item of items) {
    if (have.has(item.id)) continue;
    let blob: Blob;
    try {
      blob = await imageToBlob(item.url);
    } catch {
      return `Failed to read image ${item.id}.`;
    }
    const { error } = await sb.storage
      .from(BUCKET)
      .upload(`${prefix}/${item.id}`, blob, {
        contentType: blob.type || 'application/octet-stream',
        upsert: false,
      });
    if (error && !/already exists|duplicate/i.test(error.message)) {
      return `Failed to upload image ${item.id}: ${error.message}`;
    }
  }
  return null;
}

/** Maps each storage path to a freshly-minted signed URL (batched). */
async function signedUrlMap(sb: SupabaseClient, paths: string[]): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  if (paths.length === 0) return map;
  const { data } = await sb.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  for (const item of data ?? []) {
    if (item.path && item.signedUrl) map.set(item.path, item.signedUrl);
  }
  return map;
}

// ─────────────────────────────────────────────────────────────────────────
// Adapter
// ─────────────────────────────────────────────────────────────────────────

export const supabaseAdapter: PersistenceAdapter = {
  async listSessions(): Promise<SessionMeta[]> {
    const { data, error } = await getSupabaseClient()
      .from('sessions')
      .select('id, name, updated_at')
      .order('updated_at', { ascending: false });
    if (error || !data) return [];
    return data.map((r) => ({ id: r.id, name: r.name, updatedAt: r.updated_at }));
  },

  async loadSession(id: ID): Promise<Session | null> {
    const sb = getSupabaseClient();
    const { data: session, error } = await sb
      .from('sessions')
      .select('id, name, schema_version, created_at, updated_at')
      .eq('id', id)
      .maybeSingle();
    if (error || !session) return null;

    const [refs, tasks, iters, imgs] = await Promise.all([
      sb.from('ref_images').select('*').eq('session_id', id),
      sb.from('tasks').select('*').eq('session_id', id),
      sb.from('iterations').select('*').eq('session_id', id),
      sb.from('generated_images').select('*').eq('session_id', id),
    ]);

    const refRows = (refs.data ?? []) as RefImageRow[];
    const imgRows = (imgs.data ?? []) as GeneratedImageRow[];

    // Mint signed URLs for every image object, then resolve each row's
    // storage_path to a usable <img src> during reassembly.
    const paths = [...refRows.map((r) => r.storage_path), ...imgRows.map((i) => i.storage_path)]
      .filter((p): p is string => Boolean(p));
    const urlByPath = await signedUrlMap(sb, paths);

    return rowsToSession(
      session as SessionRow,
      refRows,
      (tasks.data ?? []) as TaskRow[],
      (iters.data ?? []) as IterationRow[],
      imgRows,
      (path) => urlByPath.get(path) ?? '',
    );
  },

  async saveSession(session: Session): Promise<Result<SessionMeta>> {
    const sb = getSupabaseClient();
    const owner = await ownerId();
    const rows = sessionToRows(session, owner);

    // Upload image bytes to the bucket before writing rows that reference them.
    const uploadError = await uploadSessionImages(sb, owner, session);
    if (uploadError) return { ok: false, error: uploadError };

    const up = await sb.from('sessions').upsert(rows.session);
    if (up.error) return { ok: false, error: up.error.message };

    // Replace the session's children: deleting tasks cascades to iterations +
    // generated_images; ref_images are deleted separately.
    const delTasks = await sb.from('tasks').delete().eq('session_id', session.id);
    if (delTasks.error) return { ok: false, error: delTasks.error.message };
    const delRefs = await sb.from('ref_images').delete().eq('session_id', session.id);
    if (delRefs.error) return { ok: false, error: delRefs.error.message };

    // Re-insert children (insert([]) is a no-op we skip). Iterations/images are
    // inserted after their parents so the FK chain resolves.
    if (rows.refImages.length > 0) {
      const ins = await sb.from('ref_images').insert(rows.refImages);
      if (ins.error) return { ok: false, error: ins.error.message };
    }
    if (rows.tasks.length > 0) {
      const ins = await sb.from('tasks').insert(rows.tasks);
      if (ins.error) return { ok: false, error: ins.error.message };
    }
    if (rows.iterations.length > 0) {
      const ins = await sb.from('iterations').insert(rows.iterations);
      if (ins.error) return { ok: false, error: ins.error.message };
    }
    if (rows.images.length > 0) {
      const ins = await sb.from('generated_images').insert(rows.images);
      if (ins.error) return { ok: false, error: ins.error.message };
    }

    return { ok: true, value: { id: session.id, name: session.name, updatedAt: session.updatedAt } };
  },

  async deleteSession(id: ID): Promise<void> {
    const sb = getSupabaseClient();
    // Best-effort bucket cleanup for the session's objects; proceed to the row
    // delete regardless (the rows are the source of truth for what's listable).
    try {
      const owner = await ownerId();
      const prefix = `${owner}/${id}`;
      const { data: objs } = await sb.storage.from(BUCKET).list(prefix, { limit: 1000 });
      const paths = (objs ?? []).map((o) => `${prefix}/${o.name}`);
      if (paths.length > 0) await sb.storage.from(BUCKET).remove(paths);
    } catch {
      // ignore — orphaned objects are harmless for a single-operator instance
    }
    // Cascades to children; app_settings.active_session_id clears via ON DELETE SET NULL.
    await sb.from('sessions').delete().eq('id', id);
  },

  async getActiveSessionId(): Promise<ID | null> {
    const { data, error } = await getSupabaseClient()
      .from('app_settings')
      .select('active_session_id')
      .maybeSingle();
    if (error || !data) return null;
    return data.active_session_id ?? null;
  },

  async setActiveSessionId(id: ID): Promise<void> {
    await getSupabaseClient()
      .from('app_settings')
      .upsert({ owner: await ownerId(), active_session_id: id }, { onConflict: 'owner' });
  },

  async clearActiveSessionId(): Promise<void> {
    await getSupabaseClient()
      .from('app_settings')
      .upsert({ owner: await ownerId(), active_session_id: null }, { onConflict: 'owner' });
  },

  async loadActiveSession(): Promise<Session | null> {
    const activeId = await this.getActiveSessionId();
    if (!activeId) return null;
    return this.loadSession(activeId);
  },
};
