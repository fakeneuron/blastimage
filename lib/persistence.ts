/**
 * blastimage — persistence seam (BI-022.2, local-only in BI-028)
 *
 * Defines the {@link PersistenceAdapter} boundary: the session-persistence
 * surface (CRUD + active-session pointer) that {@link import('./useWorkspace')}
 * depends on, decoupled from any concrete backend. The only current
 * implementation is {@link localStorageAdapter}, which delegates to the BI-002
 * {@link import('./storage')} functions.
 *
 * The interface remains **async** so a future hosted backend can use Neon for
 * relational state and Cloudflare R2 for image bytes without changing
 * workspace callers. The localStorage adapter wraps synchronous `storage.ts`
 * calls in resolved promises, so local mode still completes within a microtask.
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
  type SessionLoad,
  type SessionMeta,
} from './storage';

/**
 * The session-persistence boundary the workspace hook drives. A backend
 * implements these and nothing else; everything above it is backend-agnostic.
 */
export interface PersistenceAdapter {
  /** All known sessions as lightweight metadata. */
  listSessions(): Promise<SessionMeta[]>;
  /** Loads a full session by id, reporting absent / corrupt / version-mismatched (BI-030.4). */
  loadSession(id: ID): Promise<SessionLoad>;
  /** Persists a session and upserts its index entry; never throws. */
  saveSession(session: Session): Promise<Result<SessionMeta>>;
  /** Removes a session, its index entry, and clears the active pointer if it pointed here. */
  deleteSession(id: ID): Promise<void>;
  /** The active session's id, or `null`. */
  getActiveSessionId(): Promise<ID | null>;
  /** Marks a session as active. */
  setActiveSessionId(id: ID): Promise<void>;
  /** Clears the active-session pointer. */
  clearActiveSessionId(): Promise<void>;
  /** Convenience: loads the active session, carrying the same reason on failure. */
  loadActiveSession(): Promise<SessionLoad>;
}

/**
 * localStorage-backed adapter — the default; delegates to the BI-002
 * `storage.ts` functions, wrapping their synchronous results in promises to
 * satisfy the async interface.
 */
export const localStorageAdapter: PersistenceAdapter = {
  async listSessions() {
    return listSessions();
  },
  async loadSession(id) {
    return loadSession(id);
  },
  async saveSession(session) {
    return saveSession(session);
  },
  async deleteSession(id) {
    deleteSession(id);
  },
  async getActiveSessionId() {
    return getActiveSessionId();
  },
  async setActiveSessionId(id) {
    setActiveSessionId(id);
  },
  async clearActiveSessionId() {
    clearActiveSessionId();
  },
  async loadActiveSession() {
    return loadActiveSession();
  },
};

/**
 * The active persistence adapter. BI-028 removed the Supabase hosted adapter;
 * keep this export as the stable seam for a future server-backed adapter.
 */
export const persistence: PersistenceAdapter = localStorageAdapter;
