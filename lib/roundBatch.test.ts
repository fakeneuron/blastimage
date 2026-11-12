import fs from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { mediaKindFromPath } from './imagegenUrl';
import { parseRoundBatch, ROUND_BATCH_SCHEMA_VERSION, summarizeRoundBatch } from './roundBatch';

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

  describe('clip rounds (BI-078.2)', () => {
    const clip = { model: 'grok-imagine-video-1.5', tool: 'reference_to_video', durationSeconds: 6 };
    const clipTask = {
      slug: 'hero-banner',
      name: 'Hero banner',
      prompt: 'Slow push-in, ambient loop',
      ref: 'approved/hero-banner-002.jpg',
      images: ['hero-banner-001.mp4', 'hero-banner-002.mp4', 'hero-banner-003.mp4'],
      clip,
    };
    const withTask = (task: Record<string, unknown>) =>
      parseRoundBatch(JSON.stringify({ ...valid, tasks: [task] }));

    it('carries clip provenance and an approved/ source-still ref', () => {
      const out = withTask(clipTask);
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.value.tasks[0]).toEqual(clipTask);
    });

    it('trims clip strings the way it trims slug and name', () => {
      const out = withTask({ ...clipTask, clip: { ...clip, model: ' grok-imagine-video-1.5 ', tool: 'reference_to_video\n' } });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.value.tasks[0]!.clip).toEqual(clip);
    });

    it('omits clip on a still task', () => {
      const out = parseRoundBatch(JSON.stringify(valid));
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.value.tasks[0]).not.toHaveProperty('clip');
    });

    it.each([
      ['not an object', 'veo'],
      ['null', null],
      ['missing model', { tool: 'reference_to_video', durationSeconds: 6 }],
      ['blank tool', { ...clip, tool: '  ' }],
      ['zero duration', { ...clip, durationSeconds: 0 }],
      ['string duration', { ...clip, durationSeconds: '6' }],
      ['an array', [clip]],
    ])('rejects a malformed clip (%s) with a message naming the task', (_label, bad) => {
      const out = withTask({ ...clipTask, clip: bad });
      expect(out.ok).toBe(false);
      if (out.ok) return;
      expect(out.error).toMatch(/^Task 1 "clip"/);
    });

    it.each([
      ['no ref', { ref: undefined }],
      ['a refs/ ref', { ref: 'refs/hero-banner.jpg' }],
      ['a still among the takes', { images: ['hero-banner-001.mp4', 'hero-banner-002.jpg'] }],
    ])('rejects a clip task with %s', (_label, patch) => {
      const out = withTask({ ...clipTask, ...patch });
      expect(out.ok).toBe(false);
      if (out.ok) return;
      expect(out.error).toMatch(/^Task 1 has "clip"/);
    });

    it('accepts .mp4 takes without clip provenance (provenance is optional)', () => {
      const out = withTask({ ...clipTask, clip: undefined });
      expect(out.ok).toBe(true);
      if (!out.ok) return;
      expect(out.value.tasks[0]).not.toHaveProperty('clip');
    });
  });
});

describe('clip fixture root (BI-078.2)', () => {
  const root = path.join(process.cwd(), 'test-fixtures', 'imagegen-clip');
  const roundDir = path.join(root, 'rounds', 'r1');
  // Read inside each test so a missing fixture fails these cases, not the file.
  const readFixture = () =>
    parseRoundBatch(fs.readFileSync(path.join(roundDir, 'batch.json'), 'utf8'));

  it('parses as a clip round whose source still and takes are on disk', () => {
    const parsed = readFixture();
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    for (const task of parsed.value.tasks) {
      expect(task.clip).toBeDefined();
      expect(task.ref).toMatch(/^approved\//);
      expect(fs.existsSync(path.join(root, task.ref!))).toBe(true);
      expect(mediaKindFromPath(task.ref!)).toBe('image');
      for (const file of task.images) {
        expect(mediaKindFromPath(file)).toBe('video');
        expect(fs.existsSync(path.join(roundDir, file))).toBe(true);
      }
    }
  });

  it('holds real MP4 bytes, not a renamed placeholder (nosniff, TEST-007.3)', () => {
    const parsed = readFixture();
    if (!parsed.ok) throw new Error(parsed.error);
    for (const file of parsed.value.tasks.flatMap((t) => t.images)) {
      const head = fs.readFileSync(path.join(roundDir, file)).subarray(4, 8).toString('latin1');
      expect(head).toBe('ftyp');
    }
  });
});

describe('summarizeRoundBatch (BI-053.3)', () => {
  it('counts tasks and images from a valid batch.json', () => {
    expect(
      summarizeRoundBatch(
        2,
        JSON.stringify({
          schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
          round: 2,
          generatedAt: '2026-06-18T00:00:00Z',
          tasks: [
            { slug: 'a', name: 'A', prompt: '', images: ['a-1.jpg', 'a-2.jpg'] },
            { slug: 'b', name: 'B', prompt: '', images: ['b-1.jpg'] },
          ],
        }),
      ),
    ).toEqual({
      round: 2,
      generatedAt: '2026-06-18T00:00:00Z',
      taskCount: 2,
      imageCount: 3,
    });
  });

  it('keeps the folder round and zeros counts when JSON is unusable', () => {
    expect(summarizeRoundBatch(4, '{')).toEqual({
      round: 4,
      generatedAt: '',
      taskCount: 0,
      imageCount: 0,
    });
    expect(summarizeRoundBatch(4, JSON.stringify({ tasks: [] }))).toEqual({
      round: 4,
      generatedAt: '',
      taskCount: 0,
      imageCount: 0,
    });
  });
});