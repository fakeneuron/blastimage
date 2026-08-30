/**
 * blastimage — browser half of the imagegen folder link (BI-045 · picker BI-046 · binding BI-047)
 *
 * Talks to the `app/api/imagegen/*` routes, replacing the File System Access
 * picker + IndexedDB handle store BI-024.1 built. The FSA version worked only
 * in Chromium; a localhost route works wherever the app itself loads, Safari
 * and Brave included.
 *
 * It no longer *remembers* the linked root: BI-047 made the folder a property
 * of the project, so the root of record lives on the `Session` and the live
 * link follows whichever project is open. The old app-wide key survives
 * read-only, as the one-time adoption path for a folder linked before that
 * change ({@link loadStoredRoot} / {@link clearStoredRoot}).
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

import type { DirectoryListing } from './imagegenServerFs';
import { parseRoundBatch, type RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import type { Result } from './storage';

/** Pre-BI-047 app-wide linked root. Read once on startup to adopt, then cleared. */
const LEGACY_ROOT_KEY = 'blastimage:imagegen-root';

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

/** The app-wide root linked before BI-047, or `null`. Adoption reads this once. */
export function loadStoredRoot(): string | null {
  return safeStorage()?.getItem(LEGACY_ROOT_KEY) ?? null;
}

/** Drops the pre-BI-047 app-wide root once a project has adopted it. */
export function clearStoredRoot(): void {
  try {
    safeStorage()?.removeItem(LEGACY_ROOT_KEY);
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

/** Absolute paths the server thinks are worth offering as picker shortcuts. */
export async function suggestedRoots(): Promise<string[]> {
  const result = await getJson<string[]>('/api/imagegen/link', {});
  return result.ok ? result.value : [];
}

/** Subdirectories of `path` for the picker's tree; absent `path` starts at home (BI-046). */
export async function browseDirectory(path?: string): Promise<Result<DirectoryListing>> {
  return getJson<DirectoryListing>('/api/imagegen/browse', path ? { path } : {});
}

/** Validates a candidate root against the server, returning its canonical path. */
export async function linkRoot(path: string): Promise<Result<{ root: string; recognized: boolean }>> {
  return sendJson<{ root: string; recognized: boolean }>('/api/imagegen/link', 'POST', { path });
}

/**
 * Validates the folder the operator picked and yields its canonical path. The
 * path arrives from the picker modal (BI-046); until then this asked for it
 * with `window.prompt`, which is why a dismissed-prompt outcome no longer
 * exists — cancelling is closing the dialog, and never reaches here. Since
 * BI-047 it only validates: where the root is *remembered* is the project.
 */
export async function linkImagegenRoot(path: string): Promise<Result<string>> {
  const linked = await linkRoot(path);
  if (!linked.ok) return linked;
  return { ok: true, value: linked.value.root };
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
