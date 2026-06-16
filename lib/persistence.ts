/**
 * blastimage — persistence seam (BI-022.2, async-widened in BI-022.3)
 *
 * Defines the {@link PersistenceAdapter} boundary: the session-persistence
 * surface (CRUD + active-session pointer) that {@link import('./useWorkspace')}
 * depends on, decoupled from any concrete backend. Two adapters implement it:
 * {@link localStorageAdapter} (the default; delegates to the BI-002
 * {@link import('./storage')} functions) and the Supabase adapter for hosted
 * mode ({@link import('./supabaseAdapter')}).
 *
 * The interface is **async** (BI-022.3): a network backend (Supabase) cannot
 * satisfy a synchronous contract. The localStorage adapter wraps its
 * synchronous `storage.ts` calls in resolved promises, so local mode behaves
 * identically — the hook awaits, but the work completes within a microtask.
 *
 * The resolved {@link persistence} export is **config-gated** ({@link isHostedMode}):
 * a build with the hosted env unset resolves to localStorage and never
 * constructs the Supabase client.
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
import { isHostedMode } from './config';
import { supabaseAdapter } from './supabaseAdapter';

/**
 * The session-persistence boundary the workspace hook drives. A backend
 * (localStorage by default, Supabase in hosted mode) implements these and
 * nothing else; everything above it is backend-agnostic.
 */
export interface PersistenceAdapter {
  /** All known sessions as lightweight metadata. */
  listSessions(): Promise<SessionMeta[]>;
  /** Loads a full session by id, or `null` when absent / corrupt / version-mismatched. */
  loadSession(id: ID): Promise<Session | null>;
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
  /** Convenience: loads the active session, or `null` when none is set / it fails the load guards. */
  loadActiveSession(): Promise<Session | null>;
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
 * The active persistence adapter, resolved once at module load: the Supabase
 * adapter in hosted mode, localStorage otherwise. The gate keeps local /
 * submodule builds byte-identical to the pre-hosted app.
 */
export const persistence: PersistenceAdapter = isHostedMode()
  ? supabaseAdapter
  : localStorageAdapter;
