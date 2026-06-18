/**
 * blastimage — terminal round selection.json contract (BI-024.2)
 *
 * Pure types + helpers for `imagegen/rounds/r<N>/selection.json` per
 * `docs/REVIEW-LOOP.md` §3. Written by the frontend after review; read by
 * `/blast-iterate` in a terminal session.
 */

import type { Result } from './storage';

export const ROUND_SELECTION_SCHEMA_VERSION = 1;

export type SelectionDecision = 'iterate' | 'approve' | 'skip';
export type PromptMode = 'append' | 'overhaul';

/** One task entry inside a round selection file. */
export interface RoundSelectionTask {
  slug: string;
  decision: SelectionDecision;
  /** Image filename relative to `rounds/r<N>/`; required for iterate + approve. */
  keeper?: string;
  /** How `/blast-iterate` should treat `nextPrompt`; iterate only. */
  promptMode?: PromptMode;
  /** Full prompt for the next round; iterate only. */
  nextPrompt?: string;
}

/** Parsed `selection.json` for one review round. */
export interface RoundSelection {
  schemaVersion: typeof ROUND_SELECTION_SCHEMA_VERSION;
  round: number;
  selectedAt: string;
  tasks: RoundSelectionTask[];
}

/**
 * Classifies the edited iterate prompt relative to the task base prompt.
 * `append` when the base is preserved with a `Refine:` delta; otherwise
 * `overhaul` (reference will be dropped by the terminal skill).
 */
export function detectPromptMode(basePrompt: string, nextPrompt: string): PromptMode {
  const base = basePrompt.trim();
  const next = nextPrompt.trim();
  if (!base) return 'overhaul';
  if (next === base) return 'append';
  if (next.startsWith(base) && next.includes('\n\nRefine:')) return 'append';
  return 'overhaul';
}

/** Builds one `iterate` task entry for selection.json. */
export function buildIterateSelectionTask(
  slug: string,
  keeperFilename: string,
  basePrompt: string,
  nextPrompt: string,
): RoundSelectionTask {
  return {
    slug,
    decision: 'iterate',
    keeper: keeperFilename,
    promptMode: detectPromptMode(basePrompt, nextPrompt),
    nextPrompt: nextPrompt.trim(),
  };
}

/** Builds one `approve` task entry for selection.json. */
export function buildApproveSelectionTask(slug: string, keeperFilename: string): RoundSelectionTask {
  return { slug, decision: 'approve', keeper: keeperFilename };
}

/**
 * Merges `incoming` into `existing` by slug (incoming wins). Returns a fresh
 * selection object with a new `selectedAt` timestamp.
 */
export function mergeRoundSelection(
  existing: RoundSelection,
  incoming: RoundSelectionTask[],
  selectedAt: string,
): RoundSelection {
  const bySlug = new Map(existing.tasks.map((t) => [t.slug, t] as const));
  for (const task of incoming) bySlug.set(task.slug, task);
  return {
    schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
    round: existing.round,
    selectedAt,
    tasks: [...bySlug.values()],
  };
}

/** Serializes a selection to pretty-printed JSON. */
export function serializeRoundSelection(selection: RoundSelection): string {
  return JSON.stringify(selection, null, 2);
}

/**
 * Validates and parses a `selection.json` string. Returns a user-facing error on
 * schema mismatch or malformed input.
 */
export function parseRoundSelection(text: string): Result<RoundSelection> {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, error: 'selection.json is not valid JSON.' };
  }
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'selection.json must be a JSON object.' };
  }
  const obj = raw as Record<string, unknown>;
  if (obj.schemaVersion !== ROUND_SELECTION_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported selection.json schema version ${String(obj.schemaVersion)} (expected ${ROUND_SELECTION_SCHEMA_VERSION}).`,
    };
  }
  if (typeof obj.round !== 'number' || !Number.isInteger(obj.round) || obj.round < 0) {
    return { ok: false, error: 'selection.json "round" must be a non-negative integer.' };
  }
  if (typeof obj.selectedAt !== 'string' || !obj.selectedAt.trim()) {
    return { ok: false, error: 'selection.json "selectedAt" must be a non-empty ISO timestamp string.' };
  }
  if (!Array.isArray(obj.tasks)) {
    return { ok: false, error: 'selection.json "tasks" must be an array.' };
  }
  const tasks: RoundSelectionTask[] = [];
  for (let i = 0; i < obj.tasks.length; i++) {
    const entry = obj.tasks[i];
    if (!entry || typeof entry !== 'object') {
      return { ok: false, error: `Task ${i + 1} must be an object.` };
    }
    const e = entry as Record<string, unknown>;
    if (typeof e.slug !== 'string' || !e.slug.trim()) {
      return { ok: false, error: `Task ${i + 1} needs a non-empty "slug".` };
    }
    if (e.decision !== 'iterate' && e.decision !== 'approve' && e.decision !== 'skip') {
      return { ok: false, error: `Task ${i + 1} "decision" must be iterate, approve, or skip.` };
    }
    const task: RoundSelectionTask = { slug: e.slug.trim(), decision: e.decision };
    if (typeof e.keeper === 'string' && e.keeper.trim()) task.keeper = e.keeper.trim();
    if (e.promptMode === 'append' || e.promptMode === 'overhaul') task.promptMode = e.promptMode;
    if (typeof e.nextPrompt === 'string' && e.nextPrompt.trim()) task.nextPrompt = e.nextPrompt.trim();
    tasks.push(task);
  }
  return {
    ok: true,
    value: {
      schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
      round: obj.round,
      selectedAt: obj.selectedAt.trim(),
      tasks,
    },
  };
}