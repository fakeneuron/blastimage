/**
 * blastimage — Supabase persistence adapter (BI-022.3)
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
 * Postgres RPC for atomicity is a future refinement (noted for BI-022.4+).
 *
 * **Image bytes** stay inline (data URLs in `url` / `data_url`) this task;
 * moving them to storage buckets is BI-022.4.
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
  data_url: string;
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
  url: string;
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
// Pure mapping (domain ↔ rows) — exported for unit testing without a client
// ─────────────────────────────────────────────────────────────────────────

/** Flattens a {@link Session} into the relational insert payloads. */
export function sessionToRows(session: Session): SessionRows {
  const refImages: RefImageRow[] = session.refLibrary.map((r, position) => ({
    id: r.id,
    session_id: session.id,
    position,
    name: r.name,
    data_url: r.dataUrl,
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
          url: img.url,
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

/** Reassembles a {@link Session} from its relational rows (any row order). */
export function rowsToSession(
  session: SessionRow,
  refRows: RefImageRow[],
  taskRows: TaskRow[],
  iterRows: IterationRow[],
  imgRows: GeneratedImageRow[],
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
    url: row.url,
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
      dataUrl: r.data_url,
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
// Adapter
// ─────────────────────────────────────────────────────────────────────────

/** Resolves the logged-in operator's id, or throws if no session is present. */
async function ownerId(): Promise<ID> {
  const { data, error } = await getSupabaseClient().auth.getUser();
  if (error || !data.user) throw new Error('Not authenticated.');
  return data.user.id;
}

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

    return rowsToSession(
      session as SessionRow,
      (refs.data ?? []) as RefImageRow[],
      (tasks.data ?? []) as TaskRow[],
      (iters.data ?? []) as IterationRow[],
      (imgs.data ?? []) as GeneratedImageRow[],
    );
  },

  async saveSession(session: Session): Promise<Result<SessionMeta>> {
    const sb = getSupabaseClient();
    const rows = sessionToRows(session);

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
    // Cascades to children; app_settings.active_session_id clears via ON DELETE SET NULL.
    await getSupabaseClient().from('sessions').delete().eq('id', id);
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
