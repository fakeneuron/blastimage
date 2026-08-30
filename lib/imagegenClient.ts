/**
 * blastimage — browser half of the imagegen folder link (BI-045)
 *
 * Talks to the `app/api/imagegen/*` routes and remembers the linked root in
 * localStorage, replacing the File System Access picker + IndexedDB handle
 * store BI-024.1 built. The FSA version worked only in Chromium; a localhost
 * route works wherever the app itself loads, Safari and Brave included.
 *
 * The root is passed on every call rather than held server-side: Next's dev
 * server hot-reloads route modules, so module-level state there would vanish
 * mid-session. Sending it keeps the exchange stateless — and never widens what
 * a caller may reach, because the routes confine every path under the root
 * they are handed (`lib/imagegenServerFs.ts`) and refuse cross-origin callers
 * outright (`lib/imagegenGuard.ts`).
 *
 * Every function returns the same `Result<T>` the FSA layer returned, so the
 * `ImagegenApi` surface in `lib/ImagegenContext.tsx` is unchanged.
 */

import { parseRoundBatch, type RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import type { Result } from './storage';

const ROOT_KEY = 'blastimage:imagegen-root';

/** Outcome of linking the imagegen folder. */
export type LinkImagegenResult =
  | { status: 'linked'; root: string }
  | { status: 'cancelled' }
  | { status: 'error'; error: string };

/** Shape every route hands back — `resultResponse` in `lib/imagegenRoute.ts`. */
interface RouteEnvelope<T> {
  ok: boolean;
  value?: T;
  error?: string;
}

/** Returns localStorage, or `null` on the server / when access throws (privacy mode). */
function safeStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** The imagegen root this browser last linked, or `null`. */
export function loadStoredRoot(): string | null {
  return safeStorage()?.getItem(ROOT_KEY) ?? null;
}

/** Persists the linked root so the link survives a refresh. */
export function saveStoredRoot(root: string): void {
  try {
    safeStorage()?.setItem(ROOT_KEY, root);
  } catch {
    // Session-only link; the operator re-links after a refresh.
  }
}

/** Forgets the linked root (the folder moved, or was never valid). */
export function clearStoredRoot(): void {
  try {
    safeStorage()?.removeItem(ROOT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/**
 * Unwraps a route response into a `Result`. A non-JSON body (a crashed route,
 * a proxy error page) reads as a failure rather than throwing into the caller,
 * which is what the FSA layer did with a rejected handle operation.
 */
async function envelope<T>(res: Response): Promise<Result<T>> {
  let body: RouteEnvelope<T> | null = null;
  try {
    body = (await res.json()) as RouteEnvelope<T>;
  } catch {
    body = null;
  }
  if (!body || !body.ok) {
    return { ok: false, error: body?.error ?? `imagegen request failed (${res.status}).` };
  }
  return { ok: true, value: body.value as T };
}

async function getJson<T>(path: string, params: Record<string, string>): Promise<Result<T>> {
  try {
    const res = await fetch(`${path}?${new URLSearchParams(params).toString()}`);
    return envelope<T>(res);
  } catch {
    return { ok: false, error: 'Could not reach the blastimage server.' };
  }
}

async function sendJson<T>(
  path: string,
  method: 'POST' | 'DELETE',
  payload: unknown,
): Promise<Result<T>> {
  try {
    const res = await fetch(path, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    return envelope<T>(res);
  } catch {
    return { ok: false, error: 'Could not reach the blastimage server.' };
  }
}

/** Absolute paths the server thinks are worth pre-filling the prompt with. */
async function suggestedRoots(): Promise<string[]> {
  const result = await getJson<string[]>('/api/imagegen/link', {});
  return result.ok ? result.value : [];
}

/** Validates a candidate root against the server, returning its canonical path. */
export async function linkRoot(path: string): Promise<Result<{ root: string; recognized: boolean }>> {
  return sendJson<{ root: string; recognized: boolean }>('/api/imagegen/link', 'POST', { path });
}

/**
 * Asks the operator for their `imagegen/` path — pre-filled with the server's
 * best guess — then validates and stores it. `cancelled` on a dismissed
 * prompt, mirroring the picker-dismissed case it replaces.
 */
export async function promptAndLinkImagegenFolder(): Promise<LinkImagegenResult> {
  if (typeof window === 'undefined' || typeof window.prompt !== 'function') {
    return { status: 'error', error: 'Linking an imagegen folder needs a browser prompt.' };
  }
  const suggestions = await suggestedRoots();
  const entered = window.prompt(
    'Absolute path to your repo’s imagegen/ folder:',
    suggestions[0] ?? loadStoredRoot() ?? '',
  );
  if (entered === null) return { status: 'cancelled' };
  const linked = await linkRoot(entered);
  if (!linked.ok) return { status: 'error', error: linked.error };
  saveStoredRoot(linked.value.root);
  return { status: 'linked', root: linked.value.root };
}

/**
 * Re-validates the stored root on startup — the folder may have been moved or
 * renamed since the last session. Returns `null` (and forgets it) when it no
 * longer resolves, which is how the FSA restore reported a revoked handle.
 */
export async function restoreLinkedRoot(): Promise<string | null> {
  const stored = loadStoredRoot();
  if (!stored) return null;
  const linked = await linkRoot(stored);
  if (!linked.ok) {
    clearStoredRoot();
    return null;
  }
  saveStoredRoot(linked.value.root);
  return linked.value.root;
}

/** Round numbers under `rounds/` that carry a `batch.json`, ascending. */
export async function listRounds(root: string): Promise<number[]> {
  const result = await getJson<number[]>('/api/imagegen/rounds', { root });
  return result.ok ? result.value : [];
}

/** Reads and validates `rounds/r<N>/batch.json` through the shared parser. */
export async function readRoundBatch(root: string, round: number): Promise<Result<RoundBatch>> {
  const text = await getJson<string>('/api/imagegen/round', { root, round: String(round) });
  if (!text.ok) return text;
  const parsed = parseRoundBatch(text.value);
  if (!parsed.ok) return parsed;
  if (parsed.value.round !== round) {
    return {
      ok: false,
      error: `batch.json says round ${parsed.value.round} but folder is r${round}.`,
    };
  }
  return parsed;
}

/** Merges task entries into `rounds/r<N>/selection.json`. */
export async function writeRoundSelection(
  root: string,
  round: number,
  tasks: RoundSelectionTask[],
  selectedAt: string,
): Promise<Result<void>> {
  return sendJson<void>('/api/imagegen/selection', 'POST', { root, round, tasks, selectedAt });
}

/** True when promoting would replace a different image already in `approved/`. */
export async function approvedConflict(
  root: string,
  round: number,
  filename: string,
): Promise<Result<boolean>> {
  return getJson<boolean>('/api/imagegen/approved', {
    root,
    round: String(round),
    filename,
  });
}

/** Copies a keeper from `rounds/r<N>/` into `approved/`. */
export async function promoteApproved(
  root: string,
  round: number,
  filename: string,
): Promise<Result<void>> {
  return sendJson<void>('/api/imagegen/approved', 'POST', { root, round, filename });
}

/** Removes a previously promoted keeper from `approved/`. Idempotent. */
export async function removeApproved(root: string, filename: string): Promise<Result<void>> {
  const query = new URLSearchParams({ root, filename }).toString();
  return sendJson<void>(`/api/imagegen/approved?${query}`, 'DELETE', {});
}

/**
 * URL that serves one file from the linked folder. `epoch` is the provider's
 * staleness counter (BI-042.2), carried as a cache-buster so a reloaded round
 * re-fetches images the terminal loop has since rewritten.
 */
export function imagegenFileUrl(root: string, relativePath: string, epoch: number): string {
  const query = new URLSearchParams({ root, path: relativePath });
  if (epoch > 0) query.set('v', String(epoch));
  return `/api/imagegen/file?${query.toString()}`;
}
