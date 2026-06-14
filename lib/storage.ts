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

import {
  SCHEMA_VERSION,
  type ApprovedImage,
  type ExportManifest,
  type ID,
  type Session,
  type Timestamp,
} from './types';

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

/** File extension (no dot) for an image mime type; falls back to `jpg` for unknown types. */
export function imageExtension(mime: string): string {
  switch (mime) {
    case 'image/png':
      return 'png';
    case 'image/jpeg':
      return 'jpg';
    case 'image/webp':
      return 'webp';
    default:
      return 'jpg';
  }
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

// ─────────────────────────────────────────────────────────────────────────
// Task import (BI-019)
// ─────────────────────────────────────────────────────────────────────────

/** Version of the task-import file contract (independent of {@link SCHEMA_VERSION}). */
export const TASK_IMPORT_VERSION = 1;

/**
 * One importable prompt task — the stageable subset of a
 * {@link import('./types').PromptTask}. Adopter projects emit these so a batch
 * of composed prompts lands as tasks without per-task pasting; the full task
 * (ids, timestamps, iterations) is minted on merge by `importTasks`
 * (lib/workspace.ts). A third JSON shape alongside the full-session backup
 * (above) and the approved-images {@link import('./types').ExportManifest} —
 * not interchangeable with either.
 */
export interface TaskImportDraft {
  name: string;
  basePrompt: string;
}

/**
 * Parses + validates a task-import JSON string —
 * `{"version": 1, "tasks": [{"name", "basePrompt"}, …]}` — into drafts.
 * `name` must be non-empty (trimmed); `basePrompt` must be a string and may be
 * empty (valid in-app, just ineligible for Generate All). Returns a specific
 * error per failure rather than throwing or trusting unvalidated input.
 */
export function parseTaskImport(json: string): Result<TaskImportDraft[]> {
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return { ok: false, error: 'File is not valid JSON.' };
  }
  if (!isRecord(parsed) || !Array.isArray(parsed.tasks)) {
    return { ok: false, error: 'File is not a valid task-import file (expected {version, tasks}).' };
  }
  if (parsed.version !== TASK_IMPORT_VERSION) {
    return {
      ok: false,
      error: `Unsupported task-import version ${String(parsed.version)}; this app expects ${TASK_IMPORT_VERSION}.`,
    };
  }
  if (parsed.tasks.length === 0) {
    return { ok: false, error: 'Task-import file contains no tasks.' };
  }
  const drafts: TaskImportDraft[] = [];
  for (const [i, entry] of parsed.tasks.entries()) {
    if (
      !isRecord(entry) ||
      typeof entry.name !== 'string' ||
      entry.name.trim() === '' ||
      typeof entry.basePrompt !== 'string'
    ) {
      return {
        ok: false,
        error: `Task ${i + 1} is invalid (expected a non-empty "name" and a string "basePrompt").`,
      };
    }
    drafts.push({ name: entry.name.trim(), basePrompt: entry.basePrompt });
  }
  return { ok: true, value: drafts };
}

// ─────────────────────────────────────────────────────────────────────────
// Folder export — File System Access API (BI-021.2)
// ─────────────────────────────────────────────────────────────────────────

/**
 * Narrow shape of the File System Access directory-picker entry point. The
 * handle interfaces (`FileSystemDirectoryHandle` …) ship in TS's `lib.dom`, but
 * `window.showDirectoryPicker` itself is not yet declared there, so we type
 * only the one method we call rather than bumping the ambient lib.
 */
interface DirectoryPickerWindow {
  showDirectoryPicker(options?: {
    mode?: 'read' | 'readwrite';
  }): Promise<FileSystemDirectoryHandle>;
}

/** One named file in an approved-images export bundle. */
interface ExportFile {
  name: string;
  blob: Blob;
}

/** Outcome of a folder export: files written, user cancelled, or a failure. */
export type FolderExportResult =
  | { status: 'written'; images: number; failedImages: number }
  | { status: 'cancelled' }
  | { status: 'error'; error: string };

/** True when the File System Access directory picker is available (Chromium-family). */
export function supportsDirectoryPicker(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/** Bundle filename for an approved image: `<task-slug>-<id8>.<ext>` (matches the per-image download). */
function approvedImageFilename(approved: ApprovedImage, mime: string): string {
  const base = `${slugify(approved.taskName) || 'image'}-${approved.imageId.slice(0, 8)}`;
  return `${base}.${imageExtension(mime)}`;
}

/**
 * Resolves the full file set for an export bundle: `manifest.json` plus one file
 * per approved image (fetched to a blob — data URLs and remote Grok URLs both
 * fetch client-side). Skips images whose fetch fails and reports the count so
 * callers can land a partial bundle. Shared by the folder-write and the
 * download fallback.
 */
async function gatherExportFiles(
  manifest: ExportManifest,
): Promise<{ files: ExportFile[]; failed: number }> {
  const files: ExportFile[] = [
    {
      name: 'manifest.json',
      blob: new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' }),
    },
  ];
  let failed = 0;
  for (const approved of manifest.approved) {
    try {
      const res = await fetch(approved.url);
      const blob = await res.blob();
      files.push({ name: approvedImageFilename(approved, blob.type), blob });
    } catch {
      failed += 1;
    }
  }
  return { files, failed };
}

/**
 * Writes the manifest + every approved image into a user-picked directory via
 * the File System Access API. Returns `cancelled` when the user dismisses the
 * picker, `error` on a picker/write failure, or `written` with the count of
 * images landed (and any whose fetch failed). Caller should feature-detect with
 * {@link supportsDirectoryPicker} first.
 */
export async function exportManifestToFolder(
  manifest: ExportManifest,
): Promise<FolderExportResult> {
  if (!supportsDirectoryPicker()) {
    return { status: 'error', error: 'This browser does not support folder export.' };
  }
  let dir: FileSystemDirectoryHandle;
  try {
    dir = await (window as unknown as DirectoryPickerWindow).showDirectoryPicker({
      mode: 'readwrite',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return { status: 'cancelled' };
    return { status: 'error', error: 'Could not open the selected folder.' };
  }
  try {
    const { files, failed } = await gatherExportFiles(manifest);
    for (const file of files) {
      const handle = await dir.getFileHandle(file.name, { create: true });
      const writable = await handle.createWritable();
      await writable.write(file.blob);
      await writable.close();
    }
    return { status: 'written', images: files.length - 1, failedImages: failed };
  } catch {
    return { status: 'error', error: 'Failed to write files to the selected folder.' };
  }
}

/**
 * Fallback for browsers without the directory picker: downloads `manifest.json`
 * and each approved image as separate files via the existing download path.
 * Returns the count of images whose fetch failed (still downloads the rest).
 */
export async function downloadManifestBundle(manifest: ExportManifest): Promise<number> {
  const { files, failed } = await gatherExportFiles(manifest);
  for (const file of files) downloadBlob(file.blob, file.name);
  return failed;
}
