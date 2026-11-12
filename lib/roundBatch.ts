/**
 * blastimage — terminal round batch.json contract (BI-024.1)
 *
 * Pure parse/validate for `imagegen/rounds/r<N>/batch.json` per
 * `docs/REVIEW-LOOP.md` §3. Images are referenced by filename within the
 * round directory — never embedded as base64 in the JSON.
 */

import { mediaKindFromPath } from './imagegenUrl';
import type { Result } from './storage';

export const ROUND_BATCH_SCHEMA_VERSION = 1;

/**
 * How a clip round's takes were made (BI-078.2). Present only on clip tasks;
 * a still task omits it. Media kind itself comes from each file's extension
 * (`mediaKindFromPath`), not from this object.
 */
export interface RoundClipProvenance {
  /** Video model, e.g. `grok-imagine-video-1.5`. */
  model: string;
  /** Generation tool, e.g. `reference_to_video`. */
  tool: string;
  /** Target length of each take, in seconds. */
  durationSeconds: number;
}

/** One task entry inside a round batch file. */
export interface RoundBatchTask {
  slug: string;
  name: string;
  prompt: string;
  /**
   * Path relative to `imagegen/`; optional. A still round names its house-style
   * ref (`refs/<slug>.jpg`); a clip round names its source still
   * (`approved/<slug>-NNN.<ext>`).
   */
  ref?: string;
  /** Image or clip filenames relative to `rounds/r<N>/`. */
  images: string[];
  /** Clip provenance; omitted on still tasks. */
  clip?: RoundClipProvenance;
}

/** Parsed `batch.json` for one generation round. */
export interface RoundBatch {
  schemaVersion: typeof ROUND_BATCH_SCHEMA_VERSION;
  round: number;
  generatedAt: string;
  tasks: RoundBatchTask[];
}

/**
 * Listing row for one `rounds/r<N>/` folder (BI-053.3). Counts come from a
 * loose read of `batch.json` so a folder stays listable even when the file
 * would fail {@link parseRoundBatch} (empty `tasks`, missing or mistyped fields).
 */
export interface RoundSummary {
  round: number;
  generatedAt: string;
  taskCount: number;
  imageCount: number;
}

/** Loose `batch.json` read for {@link RoundSummary}; never fails. */
export function summarizeRoundBatch(round: number, json: string): RoundSummary {
  const empty: RoundSummary = { round, generatedAt: '', taskCount: 0, imageCount: 0 };
  try {
    const raw: unknown = JSON.parse(json);
    if (!isRecord(raw)) return empty;
    const generatedAt = typeof raw.generatedAt === 'string' ? raw.generatedAt : '';
    const tasks = Array.isArray(raw.tasks) ? raw.tasks : [];
    let imageCount = 0;
    for (const entry of tasks) {
      if (isRecord(entry) && Array.isArray(entry.images)) imageCount += entry.images.length;
    }
    return { round, generatedAt, taskCount: tasks.length, imageCount };
  } catch {
    return empty;
  }
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

/** Parses an optional `clip` object; `value` is `undefined` when absent. */
function parseClip(clip: unknown): Result<RoundClipProvenance | undefined> {
  if (clip === undefined) return { ok: true, value: undefined };
  if (!isRecord(clip) || Array.isArray(clip)) {
    return { ok: false, error: '"clip" must be an object when present.' };
  }
  const { model, tool, durationSeconds } = clip;
  if (typeof model !== 'string' || model.trim() === '') {
    return { ok: false, error: '"clip" needs a non-empty "model".' };
  }
  if (typeof tool !== 'string' || tool.trim() === '') {
    return { ok: false, error: '"clip" needs a non-empty "tool".' };
  }
  if (typeof durationSeconds !== 'number' || !Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return { ok: false, error: '"clip" "durationSeconds" must be a positive number.' };
  }
  return { ok: true, value: { model: model.trim(), tool: tool.trim(), durationSeconds } };
}

// `Array.isArray` narrows to `any[]`. This predicate keeps elements `unknown`
// so a JSON array is not an `any` assignment (type-checked lint).
function isUnknownArray(x: unknown): x is readonly unknown[] {
  return Array.isArray(x);
}

/**
 * Validates and parses a `batch.json` string. Returns a user-facing error on
 * schema drift, missing fields, or empty task/image lists.
 */
export function parseRoundBatch(json: string): Result<RoundBatch> {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: 'batch.json is not valid JSON.' };
  }
  if (!isRecord(raw)) {
    return { ok: false, error: 'batch.json must be a JSON object.' };
  }
  if (raw.schemaVersion !== ROUND_BATCH_SCHEMA_VERSION) {
    return {
      ok: false,
      error: `Unsupported batch.json schema version ${String(raw.schemaVersion)} (expected ${ROUND_BATCH_SCHEMA_VERSION}).`,
    };
  }
  if (typeof raw.round !== 'number' || !Number.isInteger(raw.round) || raw.round < 0) {
    return { ok: false, error: 'batch.json "round" must be a non-negative integer.' };
  }
  if (typeof raw.generatedAt !== 'string' || raw.generatedAt.trim() === '') {
    return { ok: false, error: 'batch.json "generatedAt" must be a non-empty ISO timestamp string.' };
  }
  if (!isUnknownArray(raw.tasks) || raw.tasks.length === 0) {
    return { ok: false, error: 'batch.json must include at least one task.' };
  }

  const tasks: RoundBatchTask[] = [];
  for (let i = 0; i < raw.tasks.length; i++) {
    const entry = raw.tasks[i];
    if (!isRecord(entry)) {
      return { ok: false, error: `Task ${i + 1} is not an object.` };
    }
    if (typeof entry.slug !== 'string' || entry.slug.trim() === '') {
      return { ok: false, error: `Task ${i + 1} needs a non-empty "slug".` };
    }
    if (typeof entry.name !== 'string' || entry.name.trim() === '') {
      return { ok: false, error: `Task ${i + 1} needs a non-empty "name".` };
    }
    if (typeof entry.prompt !== 'string') {
      return { ok: false, error: `Task ${i + 1} needs a string "prompt".` };
    }
    if (entry.ref !== undefined && typeof entry.ref !== 'string') {
      return { ok: false, error: `Task ${i + 1} "ref" must be a string when present.` };
    }
    const clip = parseClip(entry.clip);
    if (!clip.ok) {
      return { ok: false, error: `Task ${i + 1} ${clip.error}` };
    }
    if (!isUnknownArray(entry.images) || entry.images.length === 0) {
      return { ok: false, error: `Task ${i + 1} must include at least one image or clip filename.` };
    }
    const images: string[] = [];
    for (let j = 0; j < entry.images.length; j++) {
      const img = entry.images[j];
      if (typeof img !== 'string' || img.trim() === '') {
        return { ok: false, error: `Task ${i + 1}, image ${j + 1} must be a non-empty filename.` };
      }
      images.push(img.trim());
    }
    const ref = typeof entry.ref === 'string' ? entry.ref.trim() : undefined;
    // A task carrying `clip` is a clip task: its takes are clips and its ref is
    // the approved source still, so the provenance and the files cannot disagree.
    if (clip.value !== undefined) {
      if (!ref?.startsWith('approved/')) {
        return { ok: false, error: `Task ${i + 1} has "clip", so "ref" must name its source still under approved/.` };
      }
      if (images.some((img) => mediaKindFromPath(img) !== 'video')) {
        return { ok: false, error: `Task ${i + 1} has "clip", so every file in "images" must be an .mp4.` };
      }
    }
    tasks.push({
      slug: entry.slug.trim(),
      name: entry.name.trim(),
      prompt: entry.prompt,
      ...(ref !== undefined ? { ref } : {}),
      images,
      ...(clip.value !== undefined ? { clip: clip.value } : {}),
    });
  }

  return {
    ok: true,
    value: {
      schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
      round: raw.round,
      generatedAt: raw.generatedAt,
      tasks,
    },
  };
}