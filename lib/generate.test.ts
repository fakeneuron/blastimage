import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { generateBatch, type GenerationRequest } from './generate';

/** Runs generateBatch past its simulated latency via fake timers. */
async function run(req: GenerationRequest) {
  const p = generateBatch(req);
  await vi.runAllTimersAsync();
  return p;
}

describe('generateBatch (mock)', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

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

  it('is deterministic for the same prompt', async () => {
    const a = await run({ prompt: 'brand logo', batchSize: 4 });
    const b = await run({ prompt: 'brand logo', batchSize: 4 });
    expect(a.map((c) => c.url)).toEqual(b.map((c) => c.url));
  });

  it('produces different urls for different prompts', async () => {
    const a = await run({ prompt: 'cat', batchSize: 3 });
    const b = await run({ prompt: 'dog', batchSize: 3 });
    expect(a.map((c) => c.url)).not.toEqual(b.map((c) => c.url));
  });

  it('generates deterministically from references alone (empty prompt)', async () => {
    const req: GenerationRequest = { prompt: '', batchSize: 3, referenceSeeds: ['ref-1', 'ref-2'] };
    const a = await run(req);
    const b = await run(req);
    expect(a).toHaveLength(3);
    expect(a.map((c) => c.url)).toEqual(b.map((c) => c.url));
  });

  it('folds reference seeds into the prompt seed (refs change the output)', async () => {
    const a = await run({ prompt: 'logo', batchSize: 3 });
    const b = await run({ prompt: 'logo', batchSize: 3, referenceSeeds: ['ref-1'] });
    expect(a.map((c) => c.url)).not.toEqual(b.map((c) => c.url));
  });
});
