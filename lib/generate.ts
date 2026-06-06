/**
 * blastimage — mock generation service (BI-007)
 *
 * The single seam between the app and the image generator. Today it returns
 * themed {@link https://picsum.photos | picsum} images seeded deterministically
 * from the prompt (and any reference seeds) so a given request yields stable,
 * distinct-per-slot candidates for immediate testing. BI-011 swaps the body of
 * {@link generateBatch} for the real Grok Imagine call without touching callers:
 * the workspace assembles {@link GeneratedImage}s from the returned candidates,
 * so this module stays free of the persisted model.
 *
 * References are never required — generation works from a prompt, a reference,
 * or both (VISION / BI-007). When the prompt is empty the seed falls back to
 * the reference seeds, then to a random value, so the call never hard-fails.
 */

import type { BatchSize } from './types';

/** Picsum tile dimensions for mock candidates (landscape, web-hero-ish). */
const MOCK_WIDTH = 768;
const MOCK_HEIGHT = 512;

/** Simulated round-trip latency (ms) so the UI exercises its loading state. */
const MOCK_LATENCY_MS = 600;

/** A request to generate one batch of candidates. Mirrors the eventual real-API shape. */
export interface GenerationRequest {
  /** The prompt driving the batch; may be empty when generating from a reference alone. */
  prompt: string;
  /** Number of candidates to produce. */
  batchSize: BatchSize;
  /**
   * Opaque seeds for the references in play (ids or labels), folded into the
   * mock seed so reference-only / reference-influenced generation is
   * deterministic. The real API (BI-011) will send actual image bytes instead.
   */
  referenceSeeds?: string[];
}

/** A single produced candidate: an image URL plus the prompt that produced it (provenance). */
export interface GeneratedCandidate {
  url: string;
  prompt: string;
}

/** Small, stable string hash (djb2) → unsigned base-36; deterministic across runs. */
function hashSeed(input: string): string {
  let h = 5381;
  for (let i = 0; i < input.length; i++) {
    h = (h * 33) ^ input.charCodeAt(i);
  }
  return (h >>> 0).toString(36);
}

/**
 * Builds the deterministic base seed for a request. Prefers the prompt; falls
 * back to the reference seeds, then to a random value so an empty-prompt,
 * no-reference call still produces a (non-deterministic) batch rather than
 * failing.
 */
function baseSeed(req: GenerationRequest): string {
  const parts = [req.prompt.trim(), ...(req.referenceSeeds ?? [])].filter(Boolean);
  if (parts.length === 0) return Math.random().toString(36).slice(2);
  return hashSeed(parts.join('|'));
}

/** Themed picsum URL for one slot in a batch (distinct per index via the suffix). */
function candidateUrl(seed: string, index: number): string {
  return `https://picsum.photos/seed/${seed}-${index}/${MOCK_WIDTH}/${MOCK_HEIGHT}`;
}

/**
 * Generates one batch of candidates. Resolves after a short simulated delay
 * with `batchSize` themed picsum URLs, each carrying the request prompt as
 * provenance. Deterministic for a given prompt + reference seeds.
 */
export async function generateBatch(req: GenerationRequest): Promise<GeneratedCandidate[]> {
  const seed = baseSeed(req);
  await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
  return Array.from({ length: req.batchSize }, (_, i) => ({
    url: candidateUrl(seed, i),
    prompt: req.prompt,
  }));
}
