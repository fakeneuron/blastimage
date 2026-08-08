import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateBatch, isGenerationAvailable, type GenerationRequest } from './generate';

/**
 * Test-only provider that reproduces the original BI-007 mock behavior (picsum
 * seeded URLs + determinism + fake latency). This keeps the unit surface of the
 * seam (length, prompt passthrough, batchSize, distinctness) testable without
 * depending on a real Grok Imagine provider. Real generations (BI-013 live test)
 * are supplied by an agent-installed provider at runtime in the page.
 */
function installTestMockProvider() {
  const MOCK_WIDTH = 768;
  const MOCK_HEIGHT = 512;
  const MOCK_LATENCY_MS = 600;

  function hashSeed(input: string): string {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
      h = (h * 33) ^ input.charCodeAt(i);
    }
    return (h >>> 0).toString(36);
  }

  function baseSeed(req: GenerationRequest): string {
    const parts = [req.prompt.trim(), ...(req.referenceImages ?? [])].filter(Boolean);
    if (parts.length === 0) return Math.random().toString(36).slice(2);
    return hashSeed(parts.join('|'));
  }

  function candidateUrl(seed: string, index: number): string {
    return `https://picsum.photos/seed/${seed}-${index}/${MOCK_WIDTH}/${MOCK_HEIGHT}`;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (globalThis as any).__grokImagineProvider = async (req: GenerationRequest) => {
    const seed = baseSeed(req);
    await new Promise((resolve) => setTimeout(resolve, MOCK_LATENCY_MS));
    return Array.from({ length: req.batchSize }, (_, i) => ({
      url: candidateUrl(seed, i),
      prompt: req.prompt,
    }));
  };
}

function uninstallTestMockProvider() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).__grokImagineProvider;
}

/** Runs generateBatch (now provider-backed) with fake timers for the latency. */
async function run(req: GenerationRequest) {
  const p = generateBatch(req);
  await vi.runAllTimersAsync();
  return p;
}

describe('generateBatch (provider-backed seam)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    installTestMockProvider();
  });
  afterEach(() => {
    vi.useRealTimers();
    uninstallTestMockProvider();
  });

  it('produces exactly batchSize candidates carrying the prompt', async () => {
    const out = await run({ prompt: 'a sunset over the ocean', batchSize: 4 });
    expect(out).toHaveLength(4);
    for (const c of out) {
      expect(c.prompt).toBe('a sunset over the ocean');
      expect(c.url).toContain('picsum.photos/seed/');
    }
  });

  it('honors all three batch sizes', async () => {
    expect(await run({ prompt: 'p', batchSize: 3 })).toHaveLength(3);
    expect(await run({ prompt: 'p', batchSize: 5 })).toHaveLength(5);
  });

  it('mints a distinct url per slot in a batch', async () => {
    const out = await run({ prompt: 'hero banner', batchSize: 5 });
    expect(new Set(out.map((c) => c.url)).size).toBe(5);
  });

  it('is deterministic for the same prompt (test provider behavior)', async () => {
    const a = await run({ prompt: 'brand logo', batchSize: 4 });
    const b = await run({ prompt: 'brand logo', batchSize: 4 });
    expect(a.map((c) => c.url)).toEqual(b.map((c) => c.url));
  });

  it('produces different urls for different prompts (test provider behavior)', async () => {
    const a = await run({ prompt: 'cat', batchSize: 3 });
    const b = await run({ prompt: 'dog', batchSize: 3 });
    expect(a.map((c) => c.url)).not.toEqual(b.map((c) => c.url));
  });

  it('accepts referenceImages (empty prompt + refs path)', async () => {
    const req: GenerationRequest = { prompt: '', batchSize: 3, referenceImages: ['data:ref1', 'data:ref2'] };
    const a = await run(req);
    const b = await run(req);
    expect(a).toHaveLength(3);
    expect(a.map((c) => c.url)).toEqual(b.map((c) => c.url));
  });

  it('changes output when referenceImages are present (test provider folding)', async () => {
    const a = await run({ prompt: 'logo', batchSize: 3 });
    const b = await run({ prompt: 'logo', batchSize: 3, referenceImages: ['data:ref-1'] });
    expect(a.map((c) => c.url)).not.toEqual(b.map((c) => c.url));
  });
});

describe('isGenerationAvailable (BI-031.2)', () => {
  afterEach(uninstallTestMockProvider);

  it('is false with no bridge installed', () => {
    expect(isGenerationAvailable()).toBe(false);
  });

  it('is true once a provider is installed', () => {
    installTestMockProvider();
    expect(isGenerationAvailable()).toBe(true);
  });

  it('is false for a non-function value on the global', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (globalThis as any).__grokImagineProvider = 'not a provider';
    expect(isGenerationAvailable()).toBe(false);
  });
});

describe('generateBatch without a provider (BI-031.4)', () => {
  afterEach(uninstallTestMockProvider);

  it('throws operator-facing text naming the missing bridge, not internal task jargon', async () => {
    await expect(generateBatch({ prompt: 'p', batchSize: 3 })).rejects.toThrow(
      "Image generation isn't available in this browser. In-app generation requires blastimage to be running inside a Grok Build session with the Grok Imagine provider installed — see docs/GROK-AGENT.md."
    );
  });
});
