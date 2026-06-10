/**
 * blastimage — local persistence layer (BI-002)
 *
 * Saves and restores the root {@link Session} model to/from localStorage so a
 * full workspace survives a page refresh, and provides full-session JSON
 * export/import so a workspace can be backed up to a file and restored.
 *
 * Storage holds **multiple named sessions**:
 * - `blastimage:index`        → JSON {@link SessionMeta}[] (lightweight list)
 * - `blastimage:session:<id>` → JSON {@link Session} (the full workspace)
 * - `blastimage:active`       → the active session's {@link ID}
 *
 * Every read/write is SSR-safe (no-ops when `localStorage` is unavailable) and
 * fails gracefully on corrupt JSON, schema-version drift, and quota errors
 * rather than throwing.
 *
 * Note: this is the *full-workspace* backup. The approved-images
 * {@link import('./types').ExportManifest} is a separate export (BI-008/009)
 * and is not handled here.
 */

import { SCHEMA_VERSION, type ID, type Session, type Timestamp } from './types';

// ─────────────────────────────────────────────────────────────────────────
// Keys & result types
// ─────────────────────────────────────────────────────────────────────────

const KEY_PREFIX = 'blastimage:';
const INDEX_KEY = `${KEY_PREFIX}index`;
const ACTIVE_KEY = `${KEY_PREFIX}active`;
const sessionKey = (id: ID): string => `${KEY_PREFIX}session:${id}`;

/** Lightweight index entry so listing sessions never deserializes every full workspace. */
export interface SessionMeta {
  id: ID;
  name: string;
  updatedAt: Timestamp;
}

/** Discriminated result for operations that can fail with a user-facing reason. */
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────
// SSR-safe accessor
// ─────────────────────────────────────────────────────────────────────────

/** Returns localStorage in the browser, or `null` on the server / when access throws (privacy mode). */
function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Human-readable message for a failed write, distinguishing the quota case. */
function writeErrorMessage(err: unknown): string {
  if (
    err instanceof DOMException &&
    (err.name === 'QuotaExceededError' || err.name === 'NS_ERROR_DOM_QUOTA_REACHED')
  ) {
    return 'Storage quota exceeded — the workspace is too large to save locally.';
  }
  return err instanceof Error ? err.message : 'Failed to write to localStorage.';
}

// ─────────────────────────────────────────────────────────────────────────
// Type guards (hand-rolled, top-level shape only)
// ─────────────────────────────────────────────────────────────────────────

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

function isSessionMeta(x: unknown): x is SessionMeta {
  return (
    isRecord(x) &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.updatedAt === 'string'
  );
}

/** Lightweight structural check that an unknown value is a {@link Session}. */
export function isSession(x: unknown): x is Session {
  return (
    isRecord(x) &&
    typeof x.id === 'string' &&
    typeof x.name === 'string' &&
    typeof x.schemaVersion === 'number' &&
    Array.isArray(x.tasks) &&
    Array.isArray(x.refLibrary) &&
    typeof x.createdAt === 'string' &&
    typeof x.updatedAt === 'string'
  );
}

// ─────────────────────────────────────────────────────────────────────────
// Index helpers
// ─────────────────────────────────────────────────────────────────────────

function readIndex(storage: Storage): SessionMeta[] {
  const raw = storage.getItem(INDEX_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isSessionMeta) : [];
  } catch {
    return [];
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Session CRUD
// ─────────────────────────────────────────────────────────────────────────

/** All known sessions as lightweight metadata; empty when storage is unavailable. */
export function listSessions(): SessionMeta[] {
  const storage = getStorage();
  return storage ? readIndex(storage) : [];
}

/**
 * Loads a full session by id. Returns `null` when storage is unavailable, the
 * id is unknown, the stored JSON is corrupt, the shape is invalid, or the
 * persisted `schemaVersion` does not match {@link SCHEMA_VERSION}.
 */
export function loadSession(id: ID): Session | null {
  const storage = getStorage();
  if (!storage) return null;
  const raw = storage.getItem(sessionKey(id));
  if (!raw) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null; // corrupt JSON
  }
  if (!isSession(parsed)) return null;
  if (parsed.schemaVersion !== SCHEMA_VERSION) return null; // version guard
  return parsed;
}

/**
 * Persists a session and upserts its index entry. Returns the stored
 * {@link SessionMeta} on success, or an error (storage unavailable / quota
 * exceeded) — never throws.
 */
export function saveSession(session: Session): Result<SessionMeta> {
  const storage = getStorage();
  if (!storage) {
    return { ok: false, error: 'localStorage is unavailable (server-side or disabled).' };
  }
  const meta: SessionMeta = { id: session.id, name: session.name, updatedAt: session.updatedAt };
  try {
    storage.setItem(sessionKey(session.id), JSON.stringify(session));
    const index = readIndex(storage).filter((m) => m.id !== session.id);
    index.push(meta);
    storage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch (err) {
    return { ok: false, error: writeErrorMessage(err) };
  }
  return { ok: true, value: meta };
}

/** Removes a session, its index entry, and clears the active pointer if it pointed here. */
export function deleteSession(id: ID): void {
  const storage = getStorage();
  if (!storage) return;
  storage.removeItem(sessionKey(id));
  storage.setItem(INDEX_KEY, JSON.stringify(readIndex(storage).filter((m) => m.id !== id)));
  if (storage.getItem(ACTIVE_KEY) === id) storage.removeItem(ACTIVE_KEY);
}

// ─────────────────────────────────────────────────────────────────────────
// Active-session pointer
// ─────────────────────────────────────────────────────────────────────────

/** The active session's id, or `null`. */
export function getActiveSessionId(): ID | null {
  return getStorage()?.getItem(ACTIVE_KEY) ?? null;
}

/** Marks a session as active. No-op when storage is unavailable. */
export function setActiveSessionId(id: ID): void {
  getStorage()?.setItem(ACTIVE_KEY, id);
}

/** Clears the active-session pointer. No-op when storage is unavailable. */
export function clearActiveSessionId(): void {
  getStorage()?.removeItem(ACTIVE_KEY);
}

/** Convenience: loads the active session, or `null` when none is set or it fails the load guards. */
export function loadActiveSession(): Session | null {
  const id = getActiveSessionId();
  return id ? loadSession(id) : null;
}

// ─────────────────────────────────────────────────────────────────────────
// Export / import (full-session backup)
// ─────────────────────────────────────────────────────────────────────────

/** Pretty-printed JSON for a single session backup. Pure (no DOM) for easy testing. */
export function serializeSession(session: Session): string {
  return JSON.stringify(session, null, 2);
}

/** Filesystem-safe slug for download filenames (lowercase, alphanumerics joined by `-`). */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Triggers a browser download of a blob via a temporary object-URL anchor.
 * No-op outside the browser. Shared by the session backup, the manifest
 * export (useWorkspace.exportAll), and the gallery image download.
 */
export function downloadBlob(blob: Blob, filename: string): void {
  if (typeof document === 'undefined') return;
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/** Triggers a browser download of the session as a `.json` backup file. No-op outside the browser. */
export function downloadSession(session: Session): void {
  const blob = new Blob([serializeSession(session)], { type: 'application/json' });
  downloadBlob(blob, `${slugify(session.name) || 'session'}-${session.id}.json`);
}

/**
 * Parses + validates a JSON backup string into a {@link Session}. Returns an
 * error (not valid JSON / not a session / unsupported schema version) rather
 * than throwing or trusting unvalidated input.
 */
export function importSession(json: string): Result<Session> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (!isSession(parsed)) {
    return { ok: false, error: 'File is not a valid blastimage session backup.' };
  }
  if (parsed.schemaVersion !== SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported schema version ${parsed.schemaVersion}; this app expects ${SCHEMA_VERSION}.`,
    };
  }
  return { ok: true, value: parsed };
}
