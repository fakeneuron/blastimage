/**
 * blastimage — generation seam (BI-007 mock → BI-011/BI-013 real Grok Imagine)
 *
 * The single seam between the app and the image generator. BI-007 implemented
 * the mock (themed picsum + deterministic seeding + simulated latency) so the
 * full create/generate/review/iterate/approve/export loop could be built and
 * tested. BI-011 produced the handoff contract (docs/GROK-AGENT.md). BI-013
 * performs the swap to real Grok Imagine (via the agent-provided capability
 * in the Grok Build sandbox) without changing any callers or persisted model.
 *
 * The workspace hook assembles GeneratedImage records from the plain
 * { url, prompt } candidates returned here; this module knows nothing about
 * decisions, ratings, feedback, iterations, or localStorage.
 *
 * References are optional — generation works from prompt alone, reference
 * images alone, or both. The app guarantees a non-empty driving signal before
 * calling.
 */

import type { BatchSize } from './types';

/**
 * A request to generate one batch of candidates.
 * (Updated for real path per docs/GROK-AGENT.md + BI-013.)
 */
export interface GenerationRequest {
  /** The prompt driving the batch; may be empty when generating from a reference alone. */
  prompt: string;
  /** Number of candidates to produce (3 | 4 | 5). */
  batchSize: BatchSize;
  /**
   * Reference image data for visual guidance (data: URLs or equivalent bytes the
   * imagine backend can consume). Populated by the caller from:
   * - session.refLibrary entries (for task.activeRefImageIds and primary from library)
   * - previous GeneratedImage.url values (when a kept image seeds the next round as primaryRef)
   * In the mock era this field was `referenceSeeds?: string[]` (opaque IDs).
   */
  referenceImages?: string[];
}

/** One produced candidate. The caller assembles these into GeneratedImage records. */
export interface GeneratedCandidate {
  /** A URL (remote or data URL) the browser can render with <img src>. */
  url: string;
  /** Carry the request prompt through unchanged — used for provenance. */
  prompt: string;
}

/**
 * In the Grok Build / SuperGrok sandbox, Grok Imagine is available as a built-in.
 * The agent installs a provider (see below) that performs the actual image_gen
 * calls (or equivalent privileged client API) and returns data URLs so the
 * results are self-contained, persist in localStorage exactly like uploaded
 * refs, and render directly.
 *
 * The provider receives the full request (including referenceImages when present).
 * For this live test the agent orchestrates the real image_gen calls (multiple
 * for batch distinctness), converts the filesystem results to data: URLs, then
 * installs/replaces the provider before the generate action runs.
 */
type GrokImagineProvider = (req: GenerationRequest) => Promise<GeneratedCandidate[]>;

declare global {
  // Agent-installed bridge for real Grok Imagine during BI-013 live test (and future
  // transparent runs inside Grok Build). The provider returns exactly batchSize
  // candidates with renderable urls (data: or http) and the original prompt.
  var __grokImagineProvider: GrokImagineProvider | undefined;
}

/** The single read of the bridge global — shared by the capability check and the call path. */
function resolveProvider(): GrokImagineProvider | undefined {
  const provider = globalThis.__grokImagineProvider;
  return typeof provider === 'function' ? provider : undefined;
}

/**
 * Whether in-app generation can run right now — i.e. whether the Grok Imagine
 * bridge is installed. {@link generateBatch} gates on the same read, and the UI
 * gates its Generate controls on this (BI-031.2) so a browser without the
 * bridge says so instead of offering a button that can only fail.
 *
 * The agent installs the provider at an arbitrary moment (BI-013 installs it
 * *before* triggering generate), so callers must re-read this rather than
 * snapshot it once.
 */
export function isGenerationAvailable(): boolean {
  return resolveProvider() !== undefined;
}

/**
 * Generates one batch of candidates by delegating to the installed Grok Imagine
 * provider (real path) or falling back to a clear error (so the UI surfaces the
 * need for the agent bridge during a pure-client test run).
 *
 * Must return exactly `req.batchSize` items. Throw on any failure — the caller
 * (useWorkspace.generate) catches and surfaces the message in the error banner.
 */
export async function generateBatch(req: GenerationRequest): Promise<GeneratedCandidate[]> {
  const provider = resolveProvider();

  if (provider) {
    const results = await provider(req);
    if (!Array.isArray(results) || results.length !== req.batchSize) {
      throw new Error(`Grok Imagine provider returned ${results?.length ?? 0} candidates, expected ${req.batchSize}`);
    }
    // Ensure prompt provenance is carried (defensive).
    return results.map((c) => ({ url: c.url, prompt: c.prompt ?? req.prompt }));
  }

  // No provider installed. In a normal SuperGrok/Grok Build host the page would
  // have a built-in. During this agent-driven live test the caller (the /ft-task
  // driver) is expected to pre-produce real images via the available image_gen
  // tool, convert them to data URLs, install a provider that returns them, then
  // trigger the generate action (or inject state directly).
  throw new Error(
    'No Grok Imagine provider installed. BI-013 live test: agent must call image_gen, produce data URLs, and install globalThis.__grokImagineProvider before generate runs.'
  );
}
