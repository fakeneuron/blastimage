/**
 * blastimage — imagegen folder FSA seam (BI-024.1 read · BI-024.2 write)
 *
 * Links the host repo's canonical `imagegen/` directory via the File System
 * Access API, persists the directory handle in IndexedDB for refresh survival,
 * reads `rounds/r<N>/batch.json` plus on-disk images, and writes
 * `selection.json` + approve promotions into (and removals out of) `approved/`.
 */

import {
  mergeRoundSelection,
  parseRoundSelection,
  serializeRoundSelection,
  type RoundSelection,
  type RoundSelectionTask,
  ROUND_SELECTION_SCHEMA_VERSION,
} from './roundSelection';
import { parseRoundBatch, type RoundBatch } from './roundBatch';
import { supportsDirectoryPicker, type Result } from './storage';

// Re-export for callers that feature-detect alongside export.
export { supportsDirectoryPicker };

/** Outcome of linking the imagegen folder. */
export type LinkImagegenResult =
  | { status: 'linked'; handle: FileSystemDirectoryHandle }
  | { status: 'cancelled' }
  | { status: 'error'; error: string };

interface DirectoryPickerWindow {
  showDirectoryPicker(options?: { mode?: 'read' | 'readwrite' }): Promise<FileSystemDirectoryHandle>;
}

/**
 * lib.dom ships `FileSystemDirectoryHandle` without permission helpers or
 * async iteration on some TS versions — extend locally for the methods we call.
 */
type FsaMode = 'read' | 'readwrite';

interface ImagegenDirectoryHandle extends FileSystemDirectoryHandle {
  queryPermission(descriptor: { mode: FsaMode }): Promise<PermissionState>;
  requestPermission(descriptor: { mode: FsaMode }): Promise<PermissionState>;
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
  removeEntry(name: string, options?: { recursive?: boolean }): Promise<void>;
}

interface ImagegenFileHandle extends FileSystemFileHandle {
  createWritable(): Promise<FileSystemWritableFileStream>;
}

const IDB_NAME = 'blastimage-fs';
const IDB_VERSION = 1;
const IDB_STORE = 'handles';
const IMAGEGEN_HANDLE_KEY = 'imagegen-root';

function openFsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Failed to open IndexedDB.'));
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openFsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error ?? new Error('IndexedDB read failed.'));
    tx.oncomplete = () => db.close();
  });
}

async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openFsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write failed.'));
  });
}

async function idbDelete(key: string): Promise<void> {
  const db = await openFsDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).delete(key);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete failed.'));
  });
}

/** Ensures read permission on a restored handle; returns false when denied. */
function isImagegenDirectoryHandle(handle: unknown): handle is ImagegenDirectoryHandle {
  return (
    typeof handle === 'object' &&
    handle !== null &&
    (handle as FileSystemHandle).kind === 'directory' &&
    typeof (handle as ImagegenDirectoryHandle).queryPermission === 'function' &&
    typeof (handle as ImagegenDirectoryHandle).requestPermission === 'function'
  );
}

async function ensurePermission(
  handle: FileSystemDirectoryHandle,
  mode: FsaMode,
): Promise<boolean> {
  if (!isImagegenDirectoryHandle(handle)) return false;
  const opts = { mode };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

export async function ensureReadPermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  return ensurePermission(handle, 'read');
}

/** Ensures readwrite permission on a linked handle (needed for selection writes). */
export async function ensureWritePermission(
  handle: FileSystemDirectoryHandle,
): Promise<boolean> {
  return ensurePermission(handle, 'readwrite');
}

/** Persists the linked `imagegen/` directory handle for refresh survival. */
export async function saveImagegenHandle(handle: FileSystemDirectoryHandle): Promise<void> {
  await idbSet(IMAGEGEN_HANDLE_KEY, handle);
}

/** Restores a previously linked handle from IndexedDB, or `null` when absent. */
export async function loadImagegenHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof indexedDB === 'undefined') return null;
  const handle = await idbGet<FileSystemDirectoryHandle>(IMAGEGEN_HANDLE_KEY);
  return handle ?? null;
}

/** Clears the persisted handle (e.g. when permission is permanently denied). */
export async function clearImagegenHandle(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  await idbDelete(IMAGEGEN_HANDLE_KEY);
}

/**
 * Prompts the user to pick their repo's `imagegen/` directory (read-only) and
 * persists the handle. Returns `cancelled` when the picker is dismissed.
 */
export async function pickAndLinkImagegenFolder(): Promise<LinkImagegenResult> {
  if (!supportsDirectoryPicker()) {
    return { status: 'error', error: 'This browser does not support linking an imagegen folder.' };
  }
  let handle: FileSystemDirectoryHandle;
  try {
    handle = await (window as unknown as DirectoryPickerWindow).showDirectoryPicker({
      mode: 'readwrite',
    });
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') return { status: 'cancelled' };
    return { status: 'error', error: 'Could not open the selected folder.' };
  }
  if (!isImagegenDirectoryHandle(handle)) {
    return { status: 'error', error: 'The selected folder is not a valid imagegen directory handle.' };
  }
  // Best-effort persistence — an in-memory link still works for this session when
  // IndexedDB is unavailable (privacy mode) or the handle is not yet restorable.
  try {
    await saveImagegenHandle(handle);
  } catch {
    // Session-only link; user re-picks after refresh.
  }
  return { status: 'linked', handle };
}

/**
 * Restores a linked handle from IndexedDB and ensures read permission. Returns
 * `null` when nothing is stored or permission is denied.
 */
export async function restoreLinkedImagegenFolder(): Promise<FileSystemDirectoryHandle | null> {
  const handle = await loadImagegenHandle();
  if (!handle) return null;
  if (!isImagegenDirectoryHandle(handle)) {
    await clearImagegenHandle();
    return null;
  }
  const ok = await ensureReadPermission(handle);
  if (!ok) return null;
  return handle;
}

/** Reads a file at `relativePath` under the linked `imagegen/` root. */
export async function readImagegenFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
): Promise<File> {
  const parts = relativePath.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length === 0) throw new Error('Empty imagegen path.');
  let dir = root;
  for (let i = 0; i < parts.length - 1; i++) {
    dir = await dir.getDirectoryHandle(parts[i]);
  }
  const fileHandle = await dir.getFileHandle(parts[parts.length - 1]);
  return fileHandle.getFile();
}

const ROUND_DIR_RE = /^r(\d+)$/;

/**
 * Lists round numbers under `imagegen/rounds/` that contain a `batch.json`.
 * Sorted ascending.
 */
export async function listAvailableRounds(root: FileSystemDirectoryHandle): Promise<number[]> {
  let roundsDir: FileSystemDirectoryHandle;
  try {
    roundsDir = await root.getDirectoryHandle('rounds');
  } catch {
    return [];
  }
  const found: number[] = [];
  for await (const [name, handle] of (roundsDir as ImagegenDirectoryHandle).entries()) {
    if (handle.kind !== 'directory') continue;
    const m = ROUND_DIR_RE.exec(name);
    if (!m) continue;
    try {
      await (handle as FileSystemDirectoryHandle).getFileHandle('batch.json');
      found.push(Number(m[1]));
    } catch {
      // round folder without batch.json — skip
    }
  }
  return found.sort((a, b) => a - b);
}

/** Writes text content to `relativePath` under the linked `imagegen/` root. */
export async function writeImagegenTextFile(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<Result<void>> {
  if (!(await ensureWritePermission(root))) {
    return { ok: false, error: 'Write permission denied for the linked imagegen folder.' };
  }
  const parts = relativePath.replace(/^\/+/, '').split('/').filter(Boolean);
  if (parts.length === 0) return { ok: false, error: 'Empty imagegen path.' };
  try {
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir = await dir.getDirectoryHandle(parts[i]!, { create: true });
    }
    const fileHandle = (await dir.getFileHandle(parts[parts.length - 1]!, {
      create: true,
    })) as ImagegenFileHandle;
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: `Could not write ${relativePath}.` };
  }
}

/** Reads `rounds/r<N>/selection.json` when present; returns an empty shell when absent. */
export async function readRoundSelection(
  root: FileSystemDirectoryHandle,
  round: number,
): Promise<Result<RoundSelection>> {
  try {
    const roundsDir = await root.getDirectoryHandle('rounds');
    const roundDir = await roundsDir.getDirectoryHandle(`r${round}`);
    const selHandle = await roundDir.getFileHandle('selection.json');
    const text = await selHandle.getFile().then((f) => f.text());
    const parsed = parseRoundSelection(text);
    if (!parsed.ok) return parsed;
    if (parsed.value.round !== round) {
      return {
        ok: false,
        error: `selection.json says round ${parsed.value.round} but folder is r${round}.`,
      };
    }
    return parsed;
  } catch {
    return {
      ok: true,
      value: {
        schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
        round,
        selectedAt: new Date(0).toISOString(),
        tasks: [],
      },
    };
  }
}

/**
 * Merges `incoming` task entries into `rounds/r<N>/selection.json` and writes
 * the file. Creates parent dirs when needed.
 */
export async function writeRoundSelection(
  root: FileSystemDirectoryHandle,
  round: number,
  incoming: RoundSelectionTask[],
  selectedAt: string,
): Promise<Result<void>> {
  const existing = await readRoundSelection(root, round);
  if (!existing.ok) return existing;
  const merged = mergeRoundSelection(existing.value, incoming, selectedAt);
  return writeImagegenTextFile(
    root,
    `rounds/r${round}/selection.json`,
    serializeRoundSelection(merged),
  );
}

/**
 * Copies a keeper image from `rounds/r<N>/` into `imagegen/approved/` under the
 * same filename (creates `approved/` when absent).
 */
export async function promoteKeeperToApproved(
  root: FileSystemDirectoryHandle,
  round: number,
  keeperFilename: string,
): Promise<Result<void>> {
  if (!(await ensureWritePermission(root))) {
    return { ok: false, error: 'Write permission denied for the linked imagegen folder.' };
  }
  try {
    const source = await readImagegenFile(root, `rounds/r${round}/${keeperFilename}`);
    const approvedDir = await root.getDirectoryHandle('approved', { create: true });
    const destHandle = (await approvedDir.getFileHandle(keeperFilename, {
      create: true,
    })) as ImagegenFileHandle;
    const writable = await destHandle.createWritable();
    await writable.write(await source.arrayBuffer());
    await writable.close();
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: `Could not promote ${keeperFilename} to approved/.` };
  }
}

/**
 * Deletes a previously promoted keeper from `imagegen/approved/` — the inverse
 * of {@link promoteKeeperToApproved}, so clearing an approve decision is not a
 * one-way write into the user's repo (BI-030.2). Idempotent: an absent file or
 * an absent `approved/` directory both count as success.
 */
export async function removeApprovedFile(
  root: FileSystemDirectoryHandle,
  keeperFilename: string,
): Promise<Result<void>> {
  if (!(await ensureWritePermission(root))) {
    return { ok: false, error: 'Write permission denied for the linked imagegen folder.' };
  }
  let approvedDir: ImagegenDirectoryHandle;
  try {
    approvedDir = (await root.getDirectoryHandle('approved')) as ImagegenDirectoryHandle;
  } catch {
    // No approved/ at all — nothing to undo.
    return { ok: true, value: undefined };
  }
  try {
    await approvedDir.removeEntry(keeperFilename);
    return { ok: true, value: undefined };
  } catch (err) {
    if (err instanceof DOMException && err.name === 'NotFoundError') {
      return { ok: true, value: undefined };
    }
    return { ok: false, error: `Could not remove ${keeperFilename} from approved/.` };
  }
}

/** Reads and parses `rounds/r<N>/batch.json` from the linked imagegen root. */
export async function readRoundBatch(
  root: FileSystemDirectoryHandle,
  round: number,
): Promise<Result<RoundBatch>> {
  try {
    const roundsDir = await root.getDirectoryHandle('rounds');
    const roundDir = await roundsDir.getDirectoryHandle(`r${round}`);
    const batchHandle = await roundDir.getFileHandle('batch.json');
    const file = await batchHandle.getFile();
    const text = await file.text();
    const parsed = parseRoundBatch(text);
    if (!parsed.ok) return parsed;
    if (parsed.value.round !== round) {
      return {
        ok: false,
        error: `batch.json says round ${parsed.value.round} but folder is r${round}.`,
      };
    }
    return parsed;
  } catch {
    return { ok: false, error: `Could not read rounds/r${round}/batch.json.` };
  }
}