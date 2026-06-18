/**
 * blastimage — terminal round planning helpers (BI-024.3)
 *
 * Pure file-contract logic shared by `/blast-generate` and `/blast-iterate`
 * Grok Build skills. No DOM, no image_gen — matches `docs/REVIEW-LOOP.md` §3
 * and reuses {@link RoundBatch} / {@link RoundSelection} shapes from BI-024.1/2.
 */

import type { RoundBatch, RoundBatchTask } from './roundBatch';
import { ROUND_BATCH_SCHEMA_VERSION } from './roundBatch';
import type { RoundSelection, RoundSelectionTask } from './roundSelection';
import { slugify } from './storage';
import type { TaskImportDraft } from './storage';

/** Matches {@link import('./useWorkspace').DEFAULT_BATCH_SIZE}. */
export const TERMINAL_BATCH_SIZE = 4 as const;

/** One prompt task the terminal skills will generate for. */
export interface TerminalTaskPlan {
  slug: string;
  name: string;
  prompt: string;
  /** Path relative to `imagegen/`, e.g. `refs/hero-banner.jpg`. */
  ref?: string;
}

/** Planned iterate entry derived from a selection file. */
export interface IterateTaskPlan {
  slug: string;
  prompt: string;
  /** Keeper path relative to `imagegen/`, e.g. `rounds/r1/hero-002.jpg`. */
  keeperPath?: string;
  /** `image_edit` when true, `image_gen` when false (overhaul). */
  useReference: boolean;
}

/**
 * Maps validated task-import drafts to terminal plans with filesystem slugs.
 * Optional `refIndex` maps slug → ref path (relative to `imagegen/`).
 */
export function planGenerateTasks(
  drafts: ReadonlyArray<TaskImportDraft>,
  refIndex: Readonly<Record<string, string>> = {},
): TerminalTaskPlan[] {
  return drafts.map((d) => {
    const slug = slugify(d.name);
    return {
      slug,
      name: d.name,
      prompt: d.basePrompt,
      ref: refIndex[slug],
    };
  });
}

/**
 * Builds a ref-path index from relative paths under `imagegen/` (e.g.
 * `refs/hero-banner.jpg` → slug `hero-banner`).
 */
export function indexRefPaths(refPaths: ReadonlyArray<string>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const p of refPaths) {
    const m = /^refs\/([^/]+)\.([a-zA-Z0-9]+)$/.exec(p.trim());
    if (!m) continue;
    const slug = m[1]!.toLowerCase();
    out[slug] = p.trim();
  }
  return out;
}

/** Image filename inside a round dir: `<slug>-NNN.<ext>` (NNN is 1-based, 3 digits). */
export function roundImageFilename(slug: string, index: number, ext: string): string {
  const n = String(index).padStart(3, '0');
  const safe = slug || 'image';
  return `${safe}-${n}.${ext.replace(/^\./, '')}`;
}

/** Parses round numbers from directory names like `r0`, `r1`, `r12`. */
export function parseRoundDirNames(dirNames: ReadonlyArray<string>): number[] {
  const nums: number[] = [];
  for (const name of dirNames) {
    const m = /^r(\d+)$/.exec(name.trim());
    if (m) nums.push(Number(m[1]));
  }
  return nums.sort((a, b) => a - b);
}

/** Next round number: max existing + 1, or 1 when none exist. */
export function nextRoundNumber(existingRounds: ReadonlyArray<number>): number {
  if (existingRounds.length === 0) return 1;
  return Math.max(...existingRounds) + 1;
}

/** True when ref bootstrap should run: no files indexed under `refs/`. */
export function needsRefBootstrap(refPaths: ReadonlyArray<string>): boolean {
  return refPaths.length === 0;
}

/**
 * Builds a `batch.json` payload for a completed generation round.
 * `imageLists` maps slug → ordered image filenames (relative to the round dir).
 */
export function buildRoundBatch(
  round: number,
  generatedAt: string,
  tasks: ReadonlyArray<TerminalTaskPlan>,
  imageLists: Readonly<Record<string, ReadonlyArray<string>>>,
): RoundBatch {
  const batchTasks: RoundBatchTask[] = tasks.map((t) => ({
    slug: t.slug,
    name: t.name,
    prompt: t.prompt,
    ref: t.ref,
    images: [...(imageLists[t.slug] ?? [])],
  }));
  return {
    schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
    round,
    generatedAt,
    tasks: batchTasks,
  };
}

/** Serializes a round batch to pretty-printed JSON. */
export function serializeRoundBatch(batch: RoundBatch): string {
  return JSON.stringify(batch, null, 2);
}

/**
 * Derives iterate plans from a parsed `selection.json`. Skips `skip` and
 * `approve` (frontend already promoted approved keepers). `overhaul` → no ref;
 * `append` (or default) → keeper as primary reference via `image_edit`.
 */
export function planIterateTasks(
  selection: RoundSelection,
  round: number,
): IterateTaskPlan[] {
  const plans: IterateTaskPlan[] = [];
  for (const task of selection.tasks) {
    if (task.decision !== 'iterate') continue;
    const prompt = task.nextPrompt?.trim() ?? '';
    if (!prompt) continue;
    const keeper = task.keeper?.trim();
    const keeperPath = keeper ? `rounds/r${round}/${keeper}` : undefined;
    const useReference = task.promptMode !== 'overhaul' && Boolean(keeperPath);
    plans.push({
      slug: task.slug,
      prompt,
      keeperPath: useReference ? keeperPath : undefined,
      useReference,
    });
  }
  return plans;
}

/**
 * Maps round-0 selection keepers to target ref paths (`refs/<slug>.<ext>`).
 * Uses the keeper file extension; skips entries without a keeper.
 */
export function planRefBootstrapCopies(
  selection: RoundSelection,
  round: number,
): Array<{ slug: string; from: string; to: string }> {
  const copies: Array<{ slug: string; from: string; to: string }> = [];
  for (const task of selection.tasks) {
    if (!task.keeper?.trim()) continue;
    if (task.decision !== 'iterate' && task.decision !== 'approve') continue;
    const ext = task.keeper.includes('.') ? task.keeper.split('.').pop()! : 'jpg';
    copies.push({
      slug: task.slug,
      from: `rounds/r${round}/${task.keeper.trim()}`,
      to: `refs/${task.slug}.${ext}`,
    });
  }
  return copies;
}

/** Validates a selection targets the expected source round. */
export function selectionMatchesRound(selection: RoundSelection, round: number): boolean {
  return selection.round === round;
}

/** Returns iterate tasks that are missing required fields. */
export function validateIterateSelectionTasks(tasks: ReadonlyArray<RoundSelectionTask>): string[] {
  const errors: string[] = [];
  for (const t of tasks) {
    if (t.decision !== 'iterate') continue;
    if (!t.nextPrompt?.trim()) errors.push(`Task "${t.slug}": iterate needs "nextPrompt".`);
    if (!t.keeper?.trim()) errors.push(`Task "${t.slug}": iterate needs "keeper".`);
  }
  return errors;
}