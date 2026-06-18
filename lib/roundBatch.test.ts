import { describe, expect, it } from 'vitest';

import { parseRoundBatch, ROUND_BATCH_SCHEMA_VERSION } from './roundBatch';

describe('parseRoundBatch', () => {
  const valid = {
    schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
    round: 2,
    generatedAt: '2026-06-18T00:00:00Z',
    tasks: [
      {
        slug: 'hero-banner',
        name: 'Hero banner',
        prompt: 'A warm hero image',
        ref: 'refs/hero-banner.jpg',
        images: ['hero-banner-001.jpg', 'hero-banner-002.jpg'],
      },
    ],
  };

  it('parses a valid batch.json', () => {
    const out = parseRoundBatch(JSON.stringify(valid));
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.value.round).toBe(2);
    expect(out.value.tasks).toHaveLength(1);
    expect(out.value.tasks[0]!.images).toEqual(['hero-banner-001.jpg', 'hero-banner-002.jpg']);
  });

  it('rejects invalid JSON', () => {
    expect(parseRoundBatch('{').ok).toBe(false);
  });

  it('rejects unsupported schema versions', () => {
    const out = parseRoundBatch(JSON.stringify({ ...valid, schemaVersion: 99 }));
    expect(out.ok).toBe(false);
  });

  it('rejects tasks with no images', () => {
    const out = parseRoundBatch(
      JSON.stringify({
        ...valid,
        tasks: [{ ...valid.tasks[0], images: [] }],
      }),
    );
    expect(out.ok).toBe(false);
  });
});