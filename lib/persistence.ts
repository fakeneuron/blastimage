/**
 * blastimage — persistence seam (BI-022.2)
 *
 * Defines the {@link PersistenceAdapter} boundary: the session-persistence
 * surface (CRUD + active-session pointer) that {@link import('./useWorkspace')}
 * depends on, decoupled from any concrete backend. Today the only adapter is
 * {@link localStorageAdapter}, which delegates to the BI-002
 * {@link import('./storage')} functions — so local mode behaves identically.
 *
 * The hosted variation (BI-022.3) adds a Supabase adapter implementing this
 * same interface and makes the resolved {@link persistence} export
 * config-gated. That widening is also where the interface gains async
 * signatures; today it is synchronous to match localStorage and the existing
 * synchronous test suite.
 *
 * The pure / browser-only helpers in `storage.ts` (serialize, slugify,
 * download, export-bundle, review-sheet, task-import parsing) are **not** part
 * of this seam — they are backend-agnostic and stay direct `storage.ts`
 * imports.
 */

import type { ID, Session } from './types';
import {
  clearActiveSessionId,
  deleteSession,
  getActiveSessionId,
  listSessions,
  loadActiveSession,
  loadSession,
  saveSession,
  setActiveSessionId,
  type Result,
  type SessionMeta,
} from './storage';

/**
 * The session-persistence boundary the workspace hook drives. A backend
 * (localStorage today, Supabase in the hosted variation) implements these and
 * nothing else; everything above it is backend-agnostic.
 */
export interface PersistenceAdapter {
  /** All known sessions as lightweight metadata. */
  listSessions(): SessionMeta[];
  /** Loads a full session by id, or `null` when absent / corrupt / version-mismatched. */
  loadSession(id: ID): Session | null;
  /** Persists a session and upserts its index entry; never throws. */
  saveSession(session: Session): Result<SessionMeta>;
  /** Removes a session, its index entry, and clears the active pointer if it pointed here. */
  deleteSession(id: ID): void;
  /** The active session's id, or `null`. */
  getActiveSessionId(): ID | null;
  /** Marks a session as active. */
  setActiveSessionId(id: ID): void;
  /** Clears the active-session pointer. */
  clearActiveSessionId(): void;
  /** Convenience: loads the active session, or `null` when none is set / it fails the load guards. */
  loadActiveSession(): Session | null;
}

/** localStorage-backed adapter — the default; delegates to the BI-002 `storage.ts` functions. */
export const localStorageAdapter: PersistenceAdapter = {
  listSessions,
  loadSession,
  saveSession,
  deleteSession,
  getActiveSessionId,
  setActiveSessionId,
  clearActiveSessionId,
  loadActiveSession,
};

/**
 * The active persistence adapter. Local/submodule mode resolves to
 * {@link localStorageAdapter}; the hosted variation (BI-022.3) makes this
 * config-gated to swap in a Supabase adapter without touching `useWorkspace`.
 */
export const persistence: PersistenceAdapter = localStorageAdapter;
