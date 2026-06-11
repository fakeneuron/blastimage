/**
 * blastimage — pure workspace logic (BI-003)
 *
 * React-free, storage-free factories and immutable mutations over the root
 * {@link Session} model. Every mutation returns a new `Session` (never mutates
 * its argument) and bumps the relevant `updatedAt` stamps, so the React hook
 * ({@link import('./useWorkspace')}) can apply a change, persist the result via
 * the BI-002 storage layer, and set state in one step.
 *
 * Keeping this logic pure (no `window`, no `localStorage`, no React) mirrors
 * BI-002's serialize/DOM split and makes the non-trivial mutation behavior
 * unit-testable without a component-render dependency.
 */

import {
  SCHEMA_VERSION,
  type ApprovedImage,
  type ExportManifest,
  type FeedbackState,
  type GeneratedImage,
  type ID,
  type Iteration,
  type PromptTask,
  type RefImage,
  type ReviewDecision,
  type Session,
  type StarRating,
  type Timestamp,
} from './types';

/** Maximum library references a single task may have active at once (VISION / BI-004). */
export const MAX_ACTIVE_REFS = 3;

/** Warning threshold for total generated-image data-URL bytes stored in localStorage. */
export const GENERATED_QUOTA_WARN_BYTES = 4 * 1024 * 1024;

// ─────────────────────────────────────────────────────────────────────────
// Clock / id helpers
// ─────────────────────────────────────────────────────────────────────────

function now(): Timestamp {
  return new Date().toISOString();
}

function newId(): ID {
  return crypto.randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────
// Factories
// ─────────────────────────────────────────────────────────────────────────

/** Creates an empty session (no tasks, empty reference library) at the current schema version. */
export function newSession(name: string): Session {
  const ts = now();
  return {
    id: newId(),
    name,
    tasks: [],
    refLibrary: [],
    createdAt: ts,
    updatedAt: ts,
    schemaVersion: SCHEMA_VERSION,
  };
}

/** Creates an empty prompt task — blank base prompt, no references, no iterations. */
export function newTask(name: string): PromptTask {
  const ts = now();
  return {
    id: newId(),
    name,
    basePrompt: '',
    activeRefImageIds: [],
    iterations: [],
    createdAt: ts,
    updatedAt: ts,
  };
}

/**
 * Creates a library reference image from already-decoded bytes. The
 * `File`→`dataUrl` conversion (and size/type validation) is a DOM concern and
 * lives in the upload component, mirroring how Sidebar owns `window.prompt`.
 */
export function newRefImage(
  name: string,
  dataUrl: string,
  mimeType: string,
  width?: number,
  height?: number,
): RefImage {
  return { id: newId(), name, dataUrl, mimeType, width, height, addedAt: now() };
}

/**
 * Creates a freshly generated image from a {@link import('./generate').GeneratedCandidate}'s
 * `url` + `prompt`. Lands ready and undecided — review metadata (decision,
 * rating, feedback) is filled in later by the review loop (BI-005/BI-006).
 */
export function newGeneratedImage(url: string, prompt: string): GeneratedImage {
  return {
    id: newId(),
    url,
    prompt,
    status: 'ready',
    decision: 'undecided',
    rating: 0,
    feedback: null,
    createdAt: now(),
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Session mutations (immutable; each bumps the session's updatedAt)
// ─────────────────────────────────────────────────────────────────────────

/** Returns a copy of the session with a fresh `updatedAt`. */
function touch(session: Session): Session {
  return { ...session, updatedAt: now() };
}

/** Renames the session. */
export function renameSession(session: Session, name: string): Session {
  return { ...touch(session), name };
}

/** Appends a task to the session. */
export function addTask(session: Session, task: PromptTask): Session {
  return { ...touch(session), tasks: [...session.tasks, task] };
}

/**
 * Appends a batch of imported prompt tasks (BI-019): each draft is minted into
 * a fresh {@link PromptTask} via {@link newTask} with the draft's base prompt.
 * The drafts are validated upstream (`parseTaskImport`, lib/storage.ts); the
 * structural parameter keeps this module storage-free.
 */
export function importTasks(
  session: Session,
  drafts: ReadonlyArray<{ name: string; basePrompt: string }>,
): Session {
  const tasks = drafts.map((d) => ({ ...newTask(d.name), basePrompt: d.basePrompt }));
  return { ...touch(session), tasks: [...session.tasks, ...tasks] };
}

/** Removes a task by id (no-op if the id is unknown). */
export function deleteTask(session: Session, taskId: ID): Session {
  return { ...touch(session), tasks: session.tasks.filter((t) => t.id !== taskId) };
}

/**
 * Applies a partial update to one task by id, bumping that task's `updatedAt`
 * and the session's. Unknown ids leave the session unchanged.
 */
function updateTask(session: Session, taskId: ID, patch: Partial<PromptTask>): Session {
  return {
    ...touch(session),
    tasks: session.tasks.map((t) =>
      t.id === taskId ? { ...t, ...patch, updatedAt: now() } : t,
    ),
  };
}

/** Renames a task. */
export function renameTask(session: Session, taskId: ID, name: string): Session {
  return updateTask(session, taskId, { name });
}

/** Sets a task's editable base prompt. */
export function setTaskPrompt(session: Session, taskId: ID, basePrompt: string): Session {
  return updateTask(session, taskId, { basePrompt });
}

// ─────────────────────────────────────────────────────────────────────────
// Reference-library mutations (BI-004; immutable; each bumps updatedAt)
// ─────────────────────────────────────────────────────────────────────────

/** Appends a reference image to the session's global library. */
export function addRefImage(session: Session, ref: RefImage): Session {
  return { ...touch(session), refLibrary: [...session.refLibrary, ref] };
}

/**
 * Removes a reference image from the library and cascades the removal into
 * every task — any task that had it active drops it from `activeRefImageIds`
 * (and gets a fresh `updatedAt`). No-op if the id is unknown.
 */
export function removeRefImage(session: Session, refId: ID): Session {
  const ts = now();
  return {
    ...touch(session),
    refLibrary: session.refLibrary.filter((r) => r.id !== refId),
    tasks: session.tasks.map((t) =>
      t.activeRefImageIds.includes(refId)
        ? { ...t, activeRefImageIds: t.activeRefImageIds.filter((id) => id !== refId), updatedAt: ts }
        : t,
    ),
  };
}

/**
 * Toggles a library reference in a task's active selection. Adding past the
 * {@link MAX_ACTIVE_REFS} cap is a defensive no-op (the UI also disables the
 * control at the cap). Unknown task id leaves the session unchanged.
 */
export function toggleTaskRefImage(session: Session, taskId: ID, refId: ID): Session {
  const task = session.tasks.find((t) => t.id === taskId);
  if (!task) return session;
  const active = task.activeRefImageIds.includes(refId);
  if (!active && task.activeRefImageIds.length >= MAX_ACTIVE_REFS) return session;
  const activeRefImageIds = active
    ? task.activeRefImageIds.filter((id) => id !== refId)
    : [...task.activeRefImageIds, refId];
  return updateTask(session, taskId, { activeRefImageIds });
}

// ─────────────────────────────────────────────────────────────────────────
// Generation / iteration mutations (BI-007; immutable; each bumps updatedAt)
// ─────────────────────────────────────────────────────────────────────────

/** The per-round inputs an iteration captures; `index` and provenance stamps are minted by {@link appendIteration}. */
export interface IterationDraft {
  /** Prompt used for this round (the task's base prompt, or an updated/refined prompt). */
  prompt: string;
  /** Library references active for this round (≤ {@link MAX_ACTIVE_REFS}). */
  refImageIds: ID[];
  /** A keeper promoted via "use as reference" that seeded this round, if any. */
  primaryRefImageId: ID | null;
  /** The batch produced for this round. */
  images: GeneratedImage[];
}

/**
 * Appends a new {@link Iteration} to a task, minting its 0-based round index
 * from the task's existing iterations. Bumps the task's and session's
 * `updatedAt`. Unknown task id leaves the session unchanged.
 */
export function appendIteration(session: Session, taskId: ID, draft: IterationDraft): Session {
  const task = session.tasks.find((t) => t.id === taskId);
  if (!task) return session;
  const iteration: Iteration = {
    id: newId(),
    index: task.iterations.length,
    prompt: draft.prompt,
    refImageIds: draft.refImageIds,
    primaryRefImageId: draft.primaryRefImageId,
    images: draft.images,
    createdAt: now(),
  };
  return updateTask(session, taskId, { iterations: [...task.iterations, iteration] });
}

// ─────────────────────────────────────────────────────────────────────────
// Review mutations (BI-005; immutable; each bumps updatedAt)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Applies a partial update to a single {@link GeneratedImage} within a task,
 * located by id across all of the task's iterations. Bumps the task's and
 * session's `updatedAt`. Unknown task or image id leaves the session unchanged.
 */
function updateImage(
  session: Session,
  taskId: ID,
  imageId: ID,
  patch: Partial<GeneratedImage>,
): Session {
  const task = session.tasks.find((t) => t.id === taskId);
  if (!task) return session;
  let found = false;
  const iterations = task.iterations.map((it) => ({
    ...it,
    images: it.images.map((img) => {
      if (img.id !== imageId) return img;
      found = true;
      return { ...img, ...patch };
    }),
  }));
  if (!found) return session;
  return updateTask(session, taskId, { iterations });
}

/**
 * Sets a generated image's review decision. Pass `'undecided'` to clear a prior
 * keep/discard/approve (the review grid toggles the active decision off this way).
 */
export function setImageDecision(
  session: Session,
  taskId: ID,
  imageId: ID,
  decision: ReviewDecision,
): Session {
  return updateImage(session, taskId, imageId, { decision });
}

/** Sets a generated image's star rating (`0` = unrated). */
export function setImageRating(
  session: Session,
  taskId: ID,
  imageId: ID,
  rating: StarRating,
): Session {
  return updateImage(session, taskId, imageId, { rating });
}

/**
 * Sets (or clears, with `null`) a generated image's {@link FeedbackState}. The
 * feedback modal (BI-006) passes the text + `useAsReference` flag; the
 * `updatedAt` stamp is minted here so callers don't have to.
 */
export function setImageFeedback(
  session: Session,
  taskId: ID,
  imageId: ID,
  feedback: { text: string; useAsReference: boolean } | null,
): Session {
  const next: FeedbackState | null = feedback
    ? { text: feedback.text, useAsReference: feedback.useAsReference, updatedAt: now() }
    : null;
  return updateImage(session, taskId, imageId, { feedback: next });
}

// ─────────────────────────────────────────────────────────────────────────
// Gallery & export derivations (BI-008; read-only; no mutations)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Derives the flat list of approved images across all tasks, in task + iteration
 * order. Each entry is a provenance-rich {@link ApprovedImage} ready for the gallery.
 * `approvedAt` proxies `GeneratedImage.createdAt` (no separate approval timestamp
 * on the model).
 */
export function buildApprovedImages(session: Session): ApprovedImage[] {
  const result: ApprovedImage[] = [];
  for (const task of session.tasks) {
    const accumulatedPrompts: string[] = [];
    for (const iteration of task.iterations) {
      accumulatedPrompts.push(iteration.prompt);
      for (const img of iteration.images) {
        if (img.decision === 'approved') {
          result.push({
            imageId: img.id,
            taskId: task.id,
            taskName: task.name,
            url: img.url,
            finalPrompt: img.prompt,
            promptHistory: [...accumulatedPrompts],
            refImageIds: iteration.refImageIds,
            rating: img.rating,
            feedback: img.feedback,
            approvedAt: img.createdAt,
          });
        }
      }
    }
  }
  return result;
}

/**
 * Sums the byte-length of all generated-image data URLs stored in the session.
 * Data URLs are base64/ASCII, so string .length ≈ byte count — close enough for
 * a {@link GENERATED_QUOTA_WARN_BYTES} threshold check.
 */
export function countGeneratedImageBytes(session: Session): number {
  let total = 0;
  for (const task of session.tasks) {
    for (const iteration of task.iterations) {
      for (const img of iteration.images) {
        if (img.url.startsWith('data:')) total += img.url.length;
      }
    }
  }
  return total;
}

/**
 * Builds the {@link ExportManifest} for a session: all approved images plus the
 * subset of library references that were used in at least one approved image's
 * iteration.
 */
export function buildExportManifest(session: Session): ExportManifest {
  const approved = buildApprovedImages(session);
  const usedRefIds = new Set(approved.flatMap((a) => a.refImageIds));
  const references = session.refLibrary.filter((r) => usedRefIds.has(r.id));
  return {
    schemaVersion: SCHEMA_VERSION,
    sessionId: session.id,
    sessionName: session.name,
    exportedAt: now(),
    approved,
    references,
  };
}
