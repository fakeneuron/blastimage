/**
 * blastimage — terminal round batch.json contract (BI-024.1)
 *
 * Pure parse/validate for `imagegen/rounds/r<N>/batch.json` per
 * `docs/REVIEW-LOOP.md` §3. Images are referenced by filename within the
 * round directory — never embedded as base64 in the JSON.
 */

import type { Result } from './storage';

export const ROUND_BATCH_SCHEMA_VERSION = 1;

/** One task entry inside a round batch file. */
export interface RoundBatchTask {
  slug: string;
  name: string;
  prompt: string;
  /** Path relative to `imagegen/`, e.g. `refs/<slug>.jpg`; optional. */
  ref?: string;
  /** Image filenames relative to `rounds/r<N>/`. */
  images: string[];
}

/** Parsed `batch.json` for one generation round. */
export interface RoundBatch {
  schemaVersion: typeof ROUND_BATCH_SCHEMA_VERSION;
  round: number;
  generatedAt: string;
  tasks: RoundBatchTask[];
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
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
  if (!Array.isArray(raw.tasks) || raw.tasks.length === 0) {
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
    if (!Array.isArray(entry.images) || entry.images.length === 0) {
      return { ok: false, error: `Task ${i + 1} must include at least one image filename.` };
    }
    const images: string[] = [];
    for (let j = 0; j < entry.images.length; j++) {
      const img = entry.images[j];
      if (typeof img !== 'string' || img.trim() === '') {
        return { ok: false, error: `Task ${i + 1}, image ${j + 1} must be a non-empty filename.` };
      }
      images.push(img.trim());
    }
    tasks.push({
      slug: entry.slug.trim(),
      name: entry.name.trim(),
      prompt: entry.prompt,
      ref: typeof entry.ref === 'string' ? entry.ref.trim() : undefined,
      images,
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