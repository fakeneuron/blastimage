/**
 * blastimage — imagegen folder access over Node `fs` (BI-045)
 *
 * Server-side replacement for the File System Access layer BI-024.1 built.
 * The FSA directory picker is Chromium-only — WebKit has never shipped it and
 * Brave disables it by default — so linking the repo's `imagegen/` folder from
 * the browser was impossible in Safari and Brave. blastimage always runs on
 * localhost behind its own Next server, which can simply read the folder.
 *
 * Every entry point takes the linked root as the **canonical** absolute path
 * {@link resolveRoot} returns — containment is a prefix comparison against it,
 * so a root still holding an unresolved symlink (macOS `/var` → `/private/var`)
 * would fail every check. Targets resolve through {@link resolveUnderRoot}, so
 * a `../` segment or a symlink pointing outside the root fails rather than
 * escaping. Callers are the route
 * handlers in `app/api/imagegen/`; nothing here is importable from a client
 * component. The one exception is type-only: {@link DirectoryListing} is the
 * shape `/api/imagegen/browse` puts on the wire, so `lib/imagegenClient.ts`
 * imports it with `import type` — erased at build, no `node:fs` in the bundle.
 *
 * Parse/validate stays in the pure modules (`roundBatch`, `roundSelection`) —
 * this module reads and writes bytes, and the client keeps running the same
 * validators it ran against FSA reads.
 */

import { constants } from 'node:fs';
import { access, copyFile, mkdir, readFile, readdir, realpath, stat, unlink, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { isAbsolute, join, resolve, sep } from 'node:path';

import {
  mergeRoundSelection,
  parseRoundSelection,
  serializeRoundSelection,
  ROUND_SELECTION_SCHEMA_VERSION,
  type RoundSelection,
  type RoundSelectionTask,
} from './roundSelection';
import type { Result } from './storage';

/** Directory names under an `imagegen/` root that mark it as the real thing. */
const IMAGEGEN_MARKERS = ['rounds', 'approved', 'tasks.json'] as const;

const ROUND_DIR_RE = /^r(\d+)$/;

/**
 * Resolves a linked-root candidate to its canonical absolute path, rejecting
 * anything that is not an existing directory. Returns the `realpath` so later
 * confinement checks compare canonical paths on both sides — a root reached
 * through a symlink would otherwise fail every containment test against it.
 */
export async function resolveRoot(candidate: string): Promise<Result<string>> {
  const trimmed = candidate.trim();
  if (!trimmed) return { ok: false, error: 'Enter the absolute path to your imagegen/ folder.' };
  if (!isAbsolute(trimmed)) {
    return { ok: false, error: `Path must be absolute (starting with /), got "${trimmed}".` };
  }
  let canonical: string;
  try {
    canonical = await realpath(trimmed);
  } catch {
    return { ok: false, error: `No such folder: ${trimmed}` };
  }
  try {
    if (!(await stat(canonical)).isDirectory()) {
      return { ok: false, error: `Not a folder: ${trimmed}` };
    }
  } catch {
    return { ok: false, error: `Could not read ${trimmed}.` };
  }
  return { ok: true, value: canonical };
}

/**
 * True when `root` looks like an imagegen folder — it holds at least one of
 * `rounds/`, `approved/`, or `tasks.json`. Advisory only: a freshly created
 * folder is legitimately empty before the first `/blast-generate`, so callers
 * warn rather than refuse.
 */
export async function looksLikeImagegenRoot(root: string): Promise<boolean> {
  const found = await Promise.all(
    IMAGEGEN_MARKERS.map(async (marker) => {
      try {
        await access(join(root, marker), constants.F_OK);
        return true;
      } catch {
        return false;
      }
    }),
  );
  return found.some(Boolean);
}

/**
 * Resolves `relativePath` under `root`, refusing anything that lands outside.
 * The check runs twice on purpose: lexically on the joined path (catches `../`
 * before touching the disk) and again on the `realpath` when the target exists
 * (catches a symlink whose *lexical* path is innocent). A non-existent target
 * passes the second check by construction — its parent is verified instead, so
 * a create-write cannot be aimed through a symlinked directory either.
 */
export async function resolveUnderRoot(root: string, relativePath: string): Promise<Result<string>> {
  const cleaned = relativePath.replace(/^\/+/, '');
  if (!cleaned) return { ok: false, error: 'Empty imagegen path.' };
  const target = resolve(root, cleaned);
  if (target !== root && !target.startsWith(root + sep)) {
    return { ok: false, error: `Path escapes the linked imagegen folder: ${relativePath}` };
  }
  const canonical = await canonicalOrParent(target);
  if (canonical && canonical !== root && !canonical.startsWith(root + sep)) {
    return { ok: false, error: `Path escapes the linked imagegen folder: ${relativePath}` };
  }
  return { ok: true, value: target };
}

/**
 * Canonical path of `target` if it exists, else of its nearest existing
 * ancestor — the surface a write would actually land on. `null` when nothing
 * on the chain resolves, which leaves the lexical check as the only verdict.
 */
async function canonicalOrParent(target: string): Promise<string | null> {
  let probe = target;
  for (;;) {
    try {
      return await realpath(probe);
    } catch {
      const parent = resolve(probe, '..');
      if (parent === probe) return null;
      probe = parent;
    }
  }
}

/** Lists round numbers under `rounds/` that contain a `batch.json`. Sorted ascending. */
export async function listRounds(root: string): Promise<number[]> {
  const roundsDir = await resolveUnderRoot(root, 'rounds');
  if (!roundsDir.ok) return [];
  let entries;
  try {
    entries = await readdir(roundsDir.value, { withFileTypes: true });
  } catch {
    return [];
  }
  const found: number[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const m = ROUND_DIR_RE.exec(entry.name);
    if (!m) continue;
    try {
      await access(join(roundsDir.value, entry.name, 'batch.json'), constants.R_OK);
      found.push(Number(m[1]));
    } catch {
      // round folder without batch.json — skip
    }
  }
  return found.sort((a, b) => a - b);
}

/** Reads `rounds/r<N>/batch.json` as text; the client runs the shared parser. */
export async function readBatchText(root: string, round: number): Promise<Result<string>> {
  const target = await resolveUnderRoot(root, `rounds/r${round}/batch.json`);
  if (!target.ok) return target;
  try {
    return { ok: true, value: await readFile(target.value, 'utf8') };
  } catch {
    return { ok: false, error: `Could not read rounds/r${round}/batch.json.` };
  }
}

/** Reads any file under the linked root as bytes. */
export async function readImagegenBytes(root: string, relativePath: string): Promise<Result<Buffer>> {
  const target = await resolveUnderRoot(root, relativePath);
  if (!target.ok) return target;
  try {
    return { ok: true, value: await readFile(target.value) };
  } catch {
    return { ok: false, error: `Could not read ${relativePath}.` };
  }
}

/** Reads `rounds/r<N>/selection.json` when present; an empty shell when absent. */
export async function readRoundSelection(root: string, round: number): Promise<Result<RoundSelection>> {
  const empty: RoundSelection = {
    schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
    round,
    selectedAt: new Date(0).toISOString(),
    tasks: [],
  };
  const target = await resolveUnderRoot(root, `rounds/r${round}/selection.json`);
  if (!target.ok) return target;
  let text: string;
  try {
    text = await readFile(target.value, 'utf8');
  } catch {
    return { ok: true, value: empty };
  }
  const parsed = parseRoundSelection(text);
  if (!parsed.ok) return parsed;
  if (parsed.value.round !== round) {
    return {
      ok: false,
      error: `selection.json says round ${parsed.value.round} but folder is r${round}.`,
    };
  }
  return parsed;
}

/**
 * Merges `incoming` into `rounds/r<N>/selection.json` and writes it back,
 * creating the round directory when the terminal loop has not yet made one.
 */
export async function writeRoundSelection(
  root: string,
  round: number,
  incoming: RoundSelectionTask[],
  selectedAt: string,
): Promise<Result<void>> {
  const existing = await readRoundSelection(root, round);
  if (!existing.ok) return existing;
  const merged = mergeRoundSelection(existing.value, incoming, selectedAt);
  const target = await resolveUnderRoot(root, `rounds/r${round}/selection.json`);
  if (!target.ok) return target;
  try {
    await mkdir(join(root, 'rounds', `r${round}`), { recursive: true });
    await writeFile(target.value, serializeRoundSelection(merged), 'utf8');
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: `Could not write rounds/r${round}/selection.json.` };
  }
}

/**
 * True when promoting `rounds/r<N>/<filename>` would replace a *different*
 * image already sitting at `approved/<filename>` (BI-032). Bytes are compared
 * so re-approving the same image stays silent; an absent `approved/` file is
 * not a conflict.
 */
export async function approvedConflict(
  root: string,
  round: number,
  filename: string,
): Promise<Result<boolean>> {
  const resident = await readImagegenBytes(root, `approved/${filename}`);
  if (!resident.ok) {
    // Distinguish a confinement rejection from "nothing there to replace".
    if (resident.error.startsWith('Path escapes')) return resident;
    return { ok: true, value: false };
  }
  const source = await readImagegenBytes(root, `rounds/r${round}/${filename}`);
  if (!source.ok) return source;
  return { ok: true, value: !resident.value.equals(source.value) };
}

/** Copies a keeper from `rounds/r<N>/` into `approved/`, creating it when absent. */
export async function promoteApproved(
  root: string,
  round: number,
  filename: string,
): Promise<Result<void>> {
  const source = await resolveUnderRoot(root, `rounds/r${round}/${filename}`);
  if (!source.ok) return source;
  const dest = await resolveUnderRoot(root, `approved/${filename}`);
  if (!dest.ok) return dest;
  try {
    await mkdir(join(root, 'approved'), { recursive: true });
    await copyFile(source.value, dest.value);
    return { ok: true, value: undefined };
  } catch {
    return { ok: false, error: `Could not promote ${filename} to approved/.` };
  }
}

/**
 * Deletes a previously promoted keeper — the inverse of
 * {@link promoteApproved}, so clearing an approve decision is not a one-way
 * write into the user's repo (BI-030.2). Idempotent: an absent file or an
 * absent `approved/` directory both count as success.
 */
export async function removeApproved(root: string, filename: string): Promise<Result<void>> {
  const target = await resolveUnderRoot(root, `approved/${filename}`);
  if (!target.ok) return target;
  try {
    await unlink(target.value);
    return { ok: true, value: undefined };
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') return { ok: true, value: undefined };
    return { ok: false, error: `Could not remove ${filename} from approved/.` };
  }
}

/** One navigable subdirectory in the folder picker's tree (BI-046). */
export interface DirectoryEntry {
  name: string;
  /** Absolute path, so navigating into it needs no client-side path joining. */
  path: string;
  /** Advisory {@link looksLikeImagegenRoot} marker — the picker badges these. */
  recognized: boolean;
}

/** Where the picker is, where "up" goes, and what is inside (BI-046). */
export interface DirectoryListing {
  path: string;
  /** `null` at the filesystem root, where there is nowhere further up. */
  parent: string | null;
  entries: DirectoryEntry[];
}

/**
 * True when `entry` is a directory to offer in the tree. Symlinked directories
 * count — people symlink project folders, and one silently missing from the
 * picker is the confusion this replaced a typed path to avoid — so the link is
 * followed with a `stat` rather than trusted from the dirent alone.
 */
async function isNavigableDir(parent: string, entry: { name: string; isDirectory(): boolean; isSymbolicLink(): boolean }): Promise<boolean> {
  if (entry.isDirectory()) return true;
  if (!entry.isSymbolicLink()) return false;
  try {
    return (await stat(join(parent, entry.name))).isDirectory();
  } catch {
    return false;
  }
}

/**
 * Lists the subdirectories of `candidate` for the folder picker (BI-046), so
 * linking is navigation rather than a typed absolute path — no browser API
 * hands one out, and the FSA picker that used to was Chromium-only (BI-045).
 *
 * Deliberately **unconfined**: any readable directory, `/` included. The trust
 * boundary is `lib/imagegenGuard.ts` — loopback `Host`, same origin — and
 * anything past it can already name any root on the other routes. Confinement
 * belongs where it does real work, under the *linked* root
 * ({@link resolveUnderRoot}), not over the operator's own machine.
 *
 * Dot-directories are skipped: an `imagegen/` folder is never hidden, and the
 * picker keeps a typed path as the fallback for anything the tree omits.
 * An absent `candidate` starts at the home directory.
 */
export async function listDirectories(candidate?: string | null): Promise<Result<DirectoryListing>> {
  const start = candidate?.trim() ? candidate : homedir();
  const root = await resolveRoot(start);
  if (!root.ok) return root;
  let dirents;
  try {
    dirents = await readdir(root.value, { withFileTypes: true });
  } catch {
    return { ok: false, error: `Could not read ${root.value}.` };
  }
  const named = dirents.filter((entry) => !entry.name.startsWith('.'));
  const navigable = await Promise.all(named.map((entry) => isNavigableDir(root.value, entry)));
  const entries = await Promise.all(
    named
      .filter((_, i) => navigable[i])
      .map(async (entry): Promise<DirectoryEntry> => {
        const path = join(root.value, entry.name);
        return { name: entry.name, path, recognized: await looksLikeImagegenRoot(path) };
      }),
  );
  entries.sort((a, b) => a.name.localeCompare(b.name));
  const parent = resolve(root.value, '..');
  return {
    ok: true,
    value: { path: root.value, parent: parent === root.value ? null : parent, entries },
  };
}

/**
 * Absolute paths worth offering as the linked root, newest guess first: an
 * `imagegen/` beside the running app (the adopter-submodule layout of
 * `docs/ADOPT.md` §7) and one inside it. Only existing directories are
 * returned, so the picker's shortcut row holds something real or nothing.
 */
export async function suggestRoots(cwd: string): Promise<string[]> {
  const candidates = [resolve(cwd, '..', 'imagegen'), resolve(cwd, 'imagegen')];
  const existing: string[] = [];
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isDirectory()) existing.push(candidate);
    } catch {
      // not there — skip
    }
  }
  return existing;
}
