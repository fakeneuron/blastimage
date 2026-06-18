'use client';

/**
 * blastimage — workspace React hook (BI-003)
 *
 * Binds the pure {@link import('./workspace')} mutations to React state and the
 * BI-002 {@link import('./storage')} persistence layer. On mount it loads the
 * active session (bootstrapping a default one if storage is empty), and every
 * mutator applies a pure transform, persists the result, and surfaces a
 * save failure (quota / unavailable) via {@link UseWorkspace.error} instead of
 * throwing.
 *
 * `activeTaskId` is UI-only selection state — the model has no "active task"
 * field — so it is not persisted and resets to the first task on a session
 * switch.
 */

import { useEffect, useRef, useState } from 'react';

import type { ImagegenApi } from './ImagegenContext';
import type { LinkImagegenResult } from './imagegenFs';
import { roundImageFilenameFromUrl, roundImageUrl, roundNumberFromImageUrl } from './imagegenUrl';
import {
  buildApproveSelectionTask,
  buildIterateSelectionTask,
} from './roundSelection';
import type {
  ApprovedImage,
  GeneratedImage,
  ID,
  PromptTask,
  RefImage,
  ReviewDecision,
  Session,
  StarRating,
} from './types';
import {
  downloadBlob,
  downloadManifestBundle,
  downloadReviewSheet,
  downloadSession,
  exportManifestToFolder,
  importSession,
  parseTaskImport,
  slugify,
  supportsDirectoryPicker,
  type SessionMeta,
} from './storage';
import { persistence } from './persistence';
import {
  addRefImage as addRefImageTo,
  addTask as addTaskTo,
  appendIteration as appendIterationTo,
  buildApprovedImages,
  buildExportManifest,
  cloneSessionWithNewIds,
  deleteTask as deleteTaskFrom,
  importTasks as importTasksInto,
  ingestRoundBatch,
  newGeneratedImage,
  newSession,
  newTask,
  removeRefImage as removeRefImageFrom,
  renameSession as renameSessionName,
  renameTask as renameTaskName,
  setImageDecision as setImageDecisionOn,
  setImageFeedback as setImageFeedbackOn,
  setImageRating as setImageRatingOn,
  setTaskPrompt as setTaskPromptOn,
  toggleTaskRefImage as toggleTaskRefImageOn,
} from './workspace';
import { generateBatch } from './generate';
import type { BatchSize } from './types';

const DEFAULT_SESSION_NAME = 'My Website';
const DEFAULT_TASK_NAME = 'Untitled task';
/** Batch size used by `generate()`; also drives TaskDetail's generating skeleton. */
export const DEFAULT_BATCH_SIZE: BatchSize = 4;

/** Stand-in when the hook runs outside {@link ImagegenProvider} (unit tests). */
const NOOP_IMAGEGEN: ImagegenApi = {
  linked: false,
  linkFolder: async () => ({
    status: 'error',
    error: 'Imagegen folder linking is unavailable.',
  }) as LinkImagegenResult,
  listRounds: async () => [],
  readRound: async () => ({ ok: false, error: 'Imagegen folder linking is unavailable.' }),
  writeSelection: async () => ({ ok: false, error: 'Imagegen folder linking is unavailable.' }),
  promoteApproved: async () => ({ ok: false, error: 'Imagegen folder linking is unavailable.' }),
  resolveDisplayUrl: async (url) => url,
};

export interface UseWorkspace {
  /** False until the mount-time load completes (render a neutral shell while false). */
  ready: boolean;
  session: Session | null;
  sessions: SessionMeta[];
  activeTask: PromptTask | null;
  activeTaskId: ID | null;
  /** Task ids whose batches are currently being generated (transient; not persisted). */
  generatingTaskIds: ID[];
  /** Last save/generation failure, or `null`. */
  error: string | null;
  /** Approved images derived live from the session; used by the gallery panel (BI-008). */
  approvedImages: ApprovedImage[];
  createSession: (name: string) => void;
  switchSession: (id: ID) => void;
  renameSession: (name: string) => void;
  addTask: (name: string) => void;
  /**
   * Imports prompt tasks from a task-import JSON string (BI-019) and appends
   * them to the current session; parse/validation failures surface via
   * {@link UseWorkspace.error}. Selects the first imported task on success.
   */
  importTasks: (json: string) => void;
  /**
   * Imports a full-session backup JSON (BI-022.7) as a fresh copy: parse +
   * validate via `importSession`, re-id the whole tree (`cloneSessionWithNewIds`)
   * so it never collides with an existing session, persist it through the seam,
   * and switch to it. In hosted mode the BI-022.4 adapter re-hosts the backup's
   * inline images to storage buckets on save. Parse/validation failures surface
   * via {@link UseWorkspace.error}.
   */
  importSessionBackup: (json: string) => void;
  renameTask: (taskId: ID, name: string) => void;
  deleteTask: (taskId: ID) => void;
  setTaskPrompt: (taskId: ID, basePrompt: string) => void;
  /**
   * Generates a batch for a task and appends it as a new iteration. `opts.prompt`
   * overrides the task's base prompt (a refined prompt from the review loop);
   * `opts.primaryRefImageId` records a keeper promoted to the round's primary
   * reference. References are optional — generation runs from prompt and/or
   * reference and never requires one.
   */
  generate: (taskId: ID, opts?: { prompt?: string; primaryRefImageId?: ID }) => Promise<void>;
  /**
   * Fires `generate` concurrently for every eligible task (non-empty base
   * prompt or ≥1 active reference) and returns the fired task ids so the UI
   * can open the bulk-review view (BI-015). Each task's run handles its own
   * failure — one failed batch never blocks the others.
   */
  generateAll: () => ID[];
  selectTask: (taskId: ID) => void;
  /** Sets a generated image's review decision (pass `'undecided'` to clear). */
  setImageDecision: (taskId: ID, imageId: ID, decision: ReviewDecision) => void;
  /** Sets a generated image's star rating (`0` = unrated). */
  setImageRating: (taskId: ID, imageId: ID, rating: StarRating) => void;
  /**
   * Saves an image's feedback and, per the modal action, optionally promotes its
   * decision in the same atomic commit (BI-006): `'save'` persists feedback only,
   * `'keep'` also sets the decision to `kept`, `'approve'` to `approved`.
   */
  submitFeedback: (
    taskId: ID,
    imageId: ID,
    feedback: { text: string; useAsReference: boolean },
    action: 'save' | 'keep' | 'approve',
  ) => void;
  addRefImage: (ref: RefImage) => void;
  removeRefImage: (refId: ID) => void;
  toggleTaskRef: (taskId: ID, refId: ID) => void;
  dismissError: () => void;
  /** Downloads the current session as a full-workspace backup `.json` (BI-022.7). */
  exportSession: () => void;
  /** Downloads the full provenance manifest as a JSON file. */
  exportAll: () => void;
  /**
   * Writes the provenance manifest + every approved image into a user-picked
   * directory via the File System Access API (BI-021.2), falling back to
   * downloading them individually on browsers without the picker. Cancelling
   * the picker is a no-op; write/fetch failures surface via
   * {@link UseWorkspace.error}.
   */
  exportToFolder: () => Promise<void>;
  /**
   * Downloads a self-contained static `review.html` (BI-021.4) — embedded image
   * thumbnails plus prompt/rating/provenance from the manifest — for the
   * repo-durable house-style/consistency pass. Images that can't be fetched
   * render as placeholders and the shortfall surfaces via
   * {@link UseWorkspace.error}.
   */
  exportReviewSheet: () => Promise<void>;
  /** True when an `imagegen/` folder handle is linked (persisted FSA permission). */
  imagegenLinked: boolean;
  /** Prompts a directory picker for the repo's `imagegen/` folder and persists it. */
  linkImagegenFolder: () => Promise<void>;
  /**
   * Loads `rounds/r<N>/batch.json` into the session as review batches. Defaults
   * to the highest available round when `round` is omitted.
   */
  /** Resolves to the ingested task ids on success, or `null` on failure/cancel. */
  loadRound: (round?: number) => Promise<ID[] | null>;
  /** The round number last loaded via {@link UseWorkspace.loadRound}, if any. */
  loadedRound: number | null;
  /**
   * Writes `rounds/r<N>/selection.json` for an iterate-from-keeper request
   * (replaces the iterate modal's in-browser `generateBatch` call).
   */
  requestNextRound: (taskId: ID, imageId: ID, nextPrompt: string) => Promise<void>;
  /** Round numbers under `imagegen/rounds/` that contain a `batch.json`. */
  availableRounds: number[];
  /** Refreshes {@link UseWorkspace.availableRounds} from the linked folder. */
  refreshAvailableRounds: () => Promise<void>;
}

export function useWorkspace(imagegen: ImagegenApi = NOOP_IMAGEGEN): UseWorkspace {
  const [ready, setReady] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<ID | null>(null);
  const [generatingTaskIds, setGeneratingTaskIds] = useState<ID[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [availableRounds, setAvailableRounds] = useState<number[]>([]);
  const [loadedRound, setLoadedRound] = useState<number | null>(null);

  // Latest-session ref so async callbacks (generate's post-await commit) can
  // see commits that landed after they captured `session` from a render.
  const sessionRef = useRef<Session | null>(null);
  sessionRef.current = session;

  // Discover loadable rounds when the imagegen folder link becomes available.
  useEffect(() => {
    if (!imagegen.linked) {
      setAvailableRounds([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      const rounds = await imagegen.listRounds();
      if (!cancelled) setAvailableRounds(rounds);
    })();
    return () => {
      cancelled = true;
    };
  }, [imagegen, imagegen.linked]);

  // Mount-time load: restore the active session, or bootstrap + persist a default.
  // The persistence seam is async (BI-022.3); `cancelled` guards against a state
  // update after unmount.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const existing = await persistence.loadActiveSession();
      if (cancelled) return;
      if (existing) {
        setSession(existing);
        setSessions(await persistence.listSessions());
        if (cancelled) return;
        setActiveTaskId(existing.tasks[0]?.id ?? null);
        setReady(true);
        return;
      }
      const fresh = newSession(DEFAULT_SESSION_NAME);
      const res = await persistence.saveSession(fresh);
      if (cancelled) return;
      if (res.ok) {
        await persistence.setActiveSessionId(fresh.id);
        if (cancelled) return;
        setSession(fresh);
        setSessions(await persistence.listSessions());
      } else {
        // Storage unavailable: keep the session in memory so the UI still works.
        setSession(fresh);
        setError(res.error);
      }
      if (cancelled) return;
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /**
   * Reflects a mutated session in state immediately (optimistic), then persists
   * it through the async seam (BI-022.3) in the background, surfacing a save
   * failure via {@link UseWorkspace.error}. Reflecting synchronously keeps
   * local-mode behaviour identical and keeps `sessionRef` current before any
   * await — concurrent generate() commits (BI-015 fires all tasks at once)
   * chain off the latest session instead of silently dropping all but the last.
   */
  function commit(next: Session): void {
    setError(null);
    sessionRef.current = next;
    setSession(next);
    void (async () => {
      const res = await persistence.saveSession(next);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSessions(await persistence.listSessions());
    })();
  }

  function createSession(name: string): void {
    const fresh = newSession(name.trim() || DEFAULT_SESSION_NAME);
    setError(null);
    sessionRef.current = fresh;
    setSession(fresh);
    setActiveTaskId(null);
    void (async () => {
      const res = await persistence.saveSession(fresh);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await persistence.setActiveSessionId(fresh.id);
      setSessions(await persistence.listSessions());
    })();
  }

  function switchSession(id: ID): void {
    void (async () => {
      const loaded = await persistence.loadSession(id);
      if (!loaded) return;
      await persistence.setActiveSessionId(id);
      sessionRef.current = loaded;
      setSession(loaded);
      setActiveTaskId(loaded.tasks[0]?.id ?? null);
    })();
  }

  function renameSession(name: string): void {
    if (!session) return;
    commit(renameSessionName(session, name.trim() || session.name));
  }

  function addTask(name: string): void {
    if (!session) return;
    const task = newTask(name.trim() || DEFAULT_TASK_NAME);
    commit(addTaskTo(session, task));
    setActiveTaskId(task.id);
  }

  function importTasks(json: string): void {
    if (!session) return;
    const parsed = parseTaskImport(json);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const next = importTasksInto(session, parsed.value);
    const firstImported = next.tasks[session.tasks.length];
    commit(next);
    if (firstImported) setActiveTaskId(firstImported.id);
  }

  function importSessionBackup(json: string): void {
    const parsed = importSession(json);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    // Land a fresh copy (new ids throughout) so a re-import never collides with
    // an existing session. Mirrors createSession's optimistic-then-persist shape;
    // in hosted mode saveSession re-hosts the backup's images to buckets (BI-022.4).
    const fresh = cloneSessionWithNewIds(parsed.value);
    setError(null);
    sessionRef.current = fresh;
    setSession(fresh);
    setActiveTaskId(fresh.tasks[0]?.id ?? null);
    void (async () => {
      const res = await persistence.saveSession(fresh);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      await persistence.setActiveSessionId(fresh.id);
      setSessions(await persistence.listSessions());
    })();
  }

  function renameTask(taskId: ID, name: string): void {
    if (!session) return;
    const trimmed = name.trim();
    if (!trimmed) return;
    commit(renameTaskName(session, taskId, trimmed));
  }

  function deleteTask(taskId: ID): void {
    if (!session) return;
    const next = deleteTaskFrom(session, taskId);
    commit(next);
    if (activeTaskId === taskId) setActiveTaskId(next.tasks[0]?.id ?? null);
  }

  function setTaskPrompt(taskId: ID, basePrompt: string): void {
    if (!session) return;
    commit(setTaskPromptOn(session, taskId, basePrompt));
  }

  async function generate(
    taskId: ID,
    opts?: { prompt?: string; primaryRefImageId?: ID },
  ): Promise<void> {
    if (!session) return;
    if (generatingTaskIds.includes(taskId)) return; // re-entrancy guard: one in-flight batch per task
    const task = session.tasks.find((t) => t.id === taskId);
    if (!task) return;
    const prompt = (opts?.prompt ?? task.basePrompt).trim();
    const primaryRefImageId = opts?.primaryRefImageId ?? null;
    // References are optional, but a round needs a prompt or at least one reference.
    const hasRef = primaryRefImageId !== null || task.activeRefImageIds.length > 0;
    if (!prompt && !hasRef) return;

    setGeneratingTaskIds((prev) => [...prev, taskId]);
    try {
      // Resolve reference images to data URLs for the real seam (BI-013 / GROK-AGENT).
      // Covers both library RefImages (active refs + library primaries) and previous
      // GeneratedImages (when a kept image seeds the next round as primaryRefImageId).
      // In the mock era these were opaque ID strings folded into a hash seed.
      const refDataById = new Map(session.refLibrary.map((r) => [r.id, r.dataUrl] as const));
      const allGeneratedById = new Map(
        session.tasks.flatMap((t) =>
          t.iterations.flatMap((it) => it.images.map((img) => [img.id, img.url] as const)),
        ),
      );
      const resolveRefData = (id: ID): string | undefined =>
        refDataById.get(id) || allGeneratedById.get(id);

      const referenceImages = [
        ...(primaryRefImageId ? [primaryRefImageId] : []),
        ...task.activeRefImageIds,
      ]
        .map((id) => resolveRefData(id))
        .filter((d): d is string => Boolean(d));

      const candidates = await generateBatch({
        prompt,
        batchSize: DEFAULT_BATCH_SIZE,
        referenceImages,
      });
      const images = candidates.map((c) => newGeneratedImage(c.url, c.prompt));
      // Provenance records the inputs actually sent (captured before the await).
      const draft = {
        prompt,
        refImageIds: task.activeRefImageIds,
        primaryRefImageId,
        images,
      };
      const latest = sessionRef.current;
      if (latest && latest.id === session.id) {
        // Append onto the freshest state so commits that landed during the
        // await (rename, decision, feedback) are not silently overwritten.
        commit(appendIterationTo(latest, taskId, draft));
      } else {
        // The user switched sessions mid-generate: persist the batch into the
        // originating stored session without flipping the UI back to it.
        const origin = await persistence.loadSession(session.id);
        if (origin) {
          const res = await persistence.saveSession(appendIterationTo(origin, taskId, draft));
          if (res.ok) setSessions(await persistence.listSessions());
          else setError(res.error);
        }
      }
    } catch {
      setError('Generation failed. Please try again.');
    } finally {
      setGeneratingTaskIds((prev) => prev.filter((id) => id !== taskId));
    }
  }

  function generateAll(): ID[] {
    if (!session) return [];
    // Eligibility mirrors generate()'s own guard: a prompt or ≥1 active reference.
    const eligible = session.tasks.filter(
      (t) =>
        !generatingTaskIds.includes(t.id) &&
        (t.basePrompt.trim() !== '' || t.activeRefImageIds.length > 0),
    );
    // Fire-and-forget: each generate() catches its own failure and clears its
    // own generating flag, so the batches run truly concurrently.
    for (const t of eligible) void generate(t.id);
    return eligible.map((t) => t.id);
  }

  function selectTask(taskId: ID): void {
    setActiveTaskId(taskId);
  }

  function findGeneratedImage(
    sess: Session,
    taskId: ID,
    imageId: ID,
  ): { task: PromptTask; image: GeneratedImage } | null {
    const task = sess.tasks.find((t) => t.id === taskId);
    if (!task) return null;
    for (const it of task.iterations) {
      const image = it.images.find((img) => img.id === imageId);
      if (image) return { task, image };
    }
    return null;
  }

  async function handleImagegenApprove(taskId: ID, imageId: ID): Promise<void> {
    if (!session || !imagegen.linked) return;
    const hit = findGeneratedImage(session, taskId, imageId);
    if (!hit) return;
    const round = roundNumberFromImageUrl(hit.image.url) ?? loadedRound;
    const keeper = roundImageFilenameFromUrl(hit.image.url);
    if (round === null || !keeper) return;
    const slug = slugify(hit.task.name);
    const selectedAt = new Date().toISOString();
    const promote = await imagegen.promoteApproved(round, keeper);
    if (!promote.ok) {
      setError(promote.error);
      return;
    }
    const sel = await imagegen.writeSelection(
      round,
      [buildApproveSelectionTask(slug, keeper)],
      selectedAt,
    );
    if (!sel.ok) setError(sel.error);
    else setError(null);
  }

  function setImageDecision(taskId: ID, imageId: ID, decision: ReviewDecision): void {
    if (!session) return;
    commit(setImageDecisionOn(session, taskId, imageId, decision));
    if (decision === 'approved') void handleImagegenApprove(taskId, imageId);
  }

  function setImageRating(taskId: ID, imageId: ID, rating: StarRating): void {
    if (!session) return;
    commit(setImageRatingOn(session, taskId, imageId, rating));
  }

  function submitFeedback(
    taskId: ID,
    imageId: ID,
    feedback: { text: string; useAsReference: boolean },
    action: 'save' | 'keep' | 'approve',
  ): void {
    if (!session) return;
    // Compose on the fresh session so feedback + decision land in one commit.
    let next = setImageFeedbackOn(session, taskId, imageId, feedback);
    if (action === 'keep') next = setImageDecisionOn(next, taskId, imageId, 'kept');
    else if (action === 'approve') next = setImageDecisionOn(next, taskId, imageId, 'approved');
    commit(next);
    if (action === 'approve') void handleImagegenApprove(taskId, imageId);
  }

  async function requestNextRound(taskId: ID, imageId: ID, nextPrompt: string): Promise<void> {
    if (!session) return;
    if (!imagegen.linked) {
      setError('Link your imagegen folder first (🔗 in the sidebar).');
      return;
    }
    const hit = findGeneratedImage(session, taskId, imageId);
    if (!hit) return;
    const round = roundNumberFromImageUrl(hit.image.url) ?? loadedRound;
    const keeper = roundImageFilenameFromUrl(hit.image.url);
    if (round === null || !keeper) {
      setError('This image is not from a terminal round — load a round from imagegen first.');
      return;
    }
    const trimmed = nextPrompt.trim();
    if (!trimmed) return;
    const slug = slugify(hit.task.name);
    const entry = buildIterateSelectionTask(slug, keeper, hit.task.basePrompt, trimmed);
    const result = await imagegen.writeSelection(round, [entry], new Date().toISOString());
    if (!result.ok) setError(result.error);
    else setError(null);
  }

  function addRefImage(ref: RefImage): void {
    if (!session) return;
    commit(addRefImageTo(session, ref));
  }

  function removeRefImage(refId: ID): void {
    if (!session) return;
    commit(removeRefImageFrom(session, refId));
  }

  function toggleTaskRef(taskId: ID, refId: ID): void {
    if (!session) return;
    commit(toggleTaskRefImageOn(session, taskId, refId));
  }

  function dismissError(): void {
    setError(null);
  }

  const activeTask = session?.tasks.find((t) => t.id === activeTaskId) ?? null;
  const approvedImages = session ? buildApprovedImages(session) : [];

  function exportSession(): void {
    if (!session) return;
    downloadSession(session);
  }

  function exportAll(): void {
    if (!session) return;
    const manifest = buildExportManifest(session);
    const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
    downloadBlob(blob, `${slugify(session.name) || 'session'}-export.json`);
  }

  async function exportToFolder(): Promise<void> {
    if (!session) return;
    const manifest = buildExportManifest(session);
    const total = manifest.approved.length;
    if (supportsDirectoryPicker()) {
      const result = await exportManifestToFolder(manifest);
      if (result.status === 'cancelled') return;
      if (result.status === 'error') {
        setError(result.error);
        return;
      }
      if (result.failedImages > 0) {
        setError(
          `Exported the manifest and ${result.images} of ${total} images; ${result.failedImages} could not be fetched.`,
        );
        return;
      }
    } else {
      const failed = await downloadManifestBundle(manifest);
      if (failed > 0) {
        setError(
          `Downloaded the manifest and ${total - failed} of ${total} images; ${failed} could not be fetched.`,
        );
        return;
      }
    }
    setError(null);
  }

  async function exportReviewSheet(): Promise<void> {
    if (!session) return;
    const manifest = buildExportManifest(session);
    const total = manifest.approved.length;
    const failed = await downloadReviewSheet(manifest);
    if (failed > 0) {
      setError(
        `Downloaded the review sheet with ${total - failed} of ${total} images embedded; ${failed} could not be fetched.`,
      );
      return;
    }
    setError(null);
  }

  async function linkImagegenFolder(): Promise<void> {
    const result = await imagegen.linkFolder();
    if (result.status === 'cancelled') return;
    if (result.status === 'error') {
      setError(result.error);
      return;
    }
    const rounds = await imagegen.listRounds();
    setAvailableRounds(rounds);
    setError(null);
  }

  async function refreshAvailableRounds(): Promise<void> {
    if (!imagegen.linked) {
      setAvailableRounds([]);
      return;
    }
    setAvailableRounds(await imagegen.listRounds());
  }

  async function loadRound(round?: number): Promise<ID[] | null> {
    if (!session) return null;
    if (!imagegen.linked) {
      setError('Link your imagegen folder first (🔗 in the sidebar).');
      return null;
    }
    let target = round;
    if (target === undefined) {
      const rounds = availableRounds.length ? availableRounds : await imagegen.listRounds();
      if (!rounds.length) {
        setError('No rounds found under imagegen/rounds/ — run /blast-generate in a terminal session first.');
        return null;
      }
      target = rounds[rounds.length - 1]!;
      setAvailableRounds(rounds);
    }
    const parsed = await imagegen.readRound(target);
    if (!parsed.ok) {
      setError(parsed.error);
      return null;
    }
    const batch = parsed.value;
    const next = ingestRoundBatch(session, batch, (filename) => roundImageUrl(batch.round, filename));
    commit(next);
    const loadedIds = batch.tasks
      .map((entry) => next.tasks.find((t) => slugify(t.name) === entry.slug)?.id)
      .filter((id): id is ID => !!id);
    if (loadedIds[0]) setActiveTaskId(loadedIds[0]);
    setLoadedRound(batch.round);
    setError(null);
    return loadedIds;
  }

  return {
    ready,
    session,
    sessions,
    activeTask,
    activeTaskId,
    generatingTaskIds,
    error,
    approvedImages,
    createSession,
    switchSession,
    renameSession,
    addTask,
    importTasks,
    importSessionBackup,
    renameTask,
    deleteTask,
    setTaskPrompt,
    generate,
    generateAll,
    selectTask,
    setImageDecision,
    setImageRating,
    submitFeedback,
    addRefImage,
    removeRefImage,
    toggleTaskRef,
    dismissError,
    exportSession,
    exportAll,
    exportToFolder,
    exportReviewSheet,
    imagegenLinked: imagegen.linked,
    linkImagegenFolder,
    loadRound,
    loadedRound,
    requestNextRound,
    availableRounds,
    refreshAvailableRounds,
  };
}
