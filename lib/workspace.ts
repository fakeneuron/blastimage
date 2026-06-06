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

import { SCHEMA_VERSION, type ID, type PromptTask, type Session, type Timestamp } from './types';

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
