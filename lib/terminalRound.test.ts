import { describe, expect, it } from 'vitest';

import { parseRoundBatch } from './roundBatch';
import type { RoundSelection } from './roundSelection';
import { ROUND_SELECTION_SCHEMA_VERSION } from './roundSelection';
import {
  buildRoundBatch,
  indexRefPaths,
  isClipRound,
  needsRefBootstrap,
  nextRoundNumber,
  parseRoundDirNames,
  planGenerateTasks,
  planIterateTasks,
  planReanimateTasks,
  planRefBootstrapCopies,
  roundImageFilename,
  selectionMatchesRound,
  serializeRoundBatch,
  TERMINAL_BATCH_SIZE,
  TERMINAL_CLIP_TAKES,
  validateIterateSelectionTasks,
} from './terminalRound';
import { DEFAULT_BATCH_SIZE } from './useWorkspace';

describe('terminalRound helpers', () => {
  it('keeps TERMINAL_BATCH_SIZE in sync with useWorkspace.DEFAULT_BATCH_SIZE', () => {
    expect(TERMINAL_BATCH_SIZE).toBe(DEFAULT_BATCH_SIZE);
  });

  it('defaults a clip round to 3 takes, apart from the still batch size (BI-078.2)', () => {
    expect(TERMINAL_CLIP_TAKES).toBe(3);
    expect(TERMINAL_CLIP_TAKES).not.toBe(TERMINAL_BATCH_SIZE);
  });

  it('plans generate tasks with slugs and refs', () => {
    const plans = planGenerateTasks(
      [{ name: 'Hero Banner', basePrompt: 'warm hero' }],
      { 'hero-banner': 'refs/hero-banner.jpg' },
    );
    expect(plans).toEqual([
      {
        slug: 'hero-banner',
        name: 'Hero Banner',
        prompt: 'warm hero',
        ref: 'refs/hero-banner.jpg',
      },
    ]);
    const bare = planGenerateTasks([{ name: 'Footer', basePrompt: 'plain' }]);
    expect(bare[0]).not.toHaveProperty('ref');
  });

  it('indexes ref paths by slug', () => {
    expect(indexRefPaths(['refs/hero-banner.jpg', 'refs/other.png', 'junk'])).toEqual({
      'hero-banner': 'refs/hero-banner.jpg',
      other: 'refs/other.png',
    });
  });

  it('formats round image filenames', () => {
    expect(roundImageFilename('hero-banner', 1, 'jpg')).toBe('hero-banner-001.jpg');
    expect(roundImageFilename('hero-banner', 12, 'png')).toBe('hero-banner-012.png');
  });

  it('parses round dir names and computes next round', () => {
    expect(parseRoundDirNames(['r0', 'r2', 'r1', 'other'])).toEqual([0, 1, 2]);
    expect(nextRoundNumber([])).toBe(1);
    expect(nextRoundNumber([0, 1, 2])).toBe(3);
  });

  it('detects ref bootstrap need', () => {
    expect(needsRefBootstrap([])).toBe(true);
    expect(needsRefBootstrap(['refs/a.jpg'])).toBe(false);
  });

  it('builds batch.json payload', () => {
    const batch = buildRoundBatch(
      1,
      '2026-06-18T00:00:00Z',
      [{ slug: 'hero', name: 'Hero', prompt: 'p', ref: 'refs/hero.jpg' }],
      { hero: ['hero-001.jpg', 'hero-002.jpg'] },
    );
    expect(batch.schemaVersion).toBe(1);
    expect(batch.round).toBe(1);
    expect(batch.tasks[0]).toMatchObject({
      slug: 'hero',
      images: ['hero-001.jpg', 'hero-002.jpg'],
      ref: 'refs/hero.jpg',
    });
    const noRef = buildRoundBatch(
      1,
      '2026-06-18T00:00:00Z',
      [{ slug: 'hero', name: 'Hero', prompt: 'p' }],
      { hero: ['hero-001.jpg'] },
    );
    expect(noRef.tasks[0]).not.toHaveProperty('ref');
  });

  it('round-trips a batch through serializeRoundBatch and parseRoundBatch', () => {
    const batch = buildRoundBatch(
      1,
      '2026-06-18T00:00:00Z',
      [{ slug: 'hero', name: 'Hero', prompt: 'p', ref: 'refs/hero.jpg' }],
      { hero: ['hero-001.jpg', 'hero-002.jpg'] },
    );
    const parsed = parseRoundBatch(serializeRoundBatch(batch));
    expect(parsed).toEqual({ ok: true, value: batch });
  });

  it('carries clip provenance from the plan through serialize and parse (BI-078.2)', () => {
    const clip = { model: 'grok-imagine-video-1.5', tool: 'reference_to_video', durationSeconds: 6 };
    const batch = buildRoundBatch(
      2,
      '2026-06-18T00:00:00Z',
      [
        { slug: 'hero', name: 'Hero', prompt: 'slow push-in', ref: 'approved/hero-002.jpg', clip },
        { slug: 'still', name: 'Still', prompt: 'p' },
      ],
      { hero: ['hero-001.mp4', 'hero-002.mp4', 'hero-003.mp4'], still: ['still-001.jpg'] },
    );
    expect(batch.tasks[0]!.clip).toEqual(clip);
    expect(batch.tasks[0]!.clip).not.toBe(clip);
    expect(batch.tasks[1]).not.toHaveProperty('clip');
    expect(parseRoundBatch(serializeRoundBatch(batch))).toEqual({ ok: true, value: batch });
  });

  it('plans iterate tasks with append vs overhaul', () => {
    const selection: RoundSelection = {
      schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
      round: 1,
      selectedAt: '2026-06-18T00:10:00Z',
      tasks: [
        {
          slug: 'hero',
          decision: 'iterate',
          keeper: 'hero-002.jpg',
          promptMode: 'append',
          nextPrompt: 'base\n\nRefine: warmer',
        },
        {
          slug: 'footer',
          decision: 'iterate',
          keeper: 'footer-001.jpg',
          promptMode: 'overhaul',
          nextPrompt: 'completely new scene',
        },
        { slug: 'skip-me', decision: 'skip' },
        { slug: 'done', decision: 'approve', keeper: 'done-001.jpg' },
      ],
    };
    const plans = planIterateTasks(selection, 1);
    expect(plans).toHaveLength(2);
    expect(plans[0]).toEqual({
      slug: 'hero',
      prompt: 'base\n\nRefine: warmer',
      keeperPath: 'rounds/r1/hero-002.jpg',
      useReference: true,
    });
    expect(plans[1]).toEqual({
      slug: 'footer',
      prompt: 'completely new scene',
      useReference: false,
    });
    // Omitted, not set to undefined: exactOptionalPropertyTypes.
    expect(plans[1]).not.toHaveProperty('keeperPath');
  });

  describe('clip rounds (BI-078.6)', () => {
    const clip = { model: 'grok-imagine-video-1.5', tool: 'reference_to_video', durationSeconds: 6 };
    const clipBatch = buildRoundBatch(
      2,
      '2026-11-13T00:00:00Z',
      [{ slug: 'hero', name: 'Hero', prompt: 'slow push-in', ref: 'approved/hero-002.jpg', clip }],
      { hero: ['hero-001.mp4', 'hero-002.mp4', 'hero-003.mp4'] },
    );
    const clipSelection: RoundSelection = {
      schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
      round: 2,
      selectedAt: '2026-11-13T00:10:00Z',
      tasks: [
        {
          slug: 'hero',
          decision: 'iterate',
          keeper: 'hero-003.MP4',
          promptMode: 'overhaul',
          nextPrompt: '  slower push-in, steam rising  ',
        },
        { slug: 'hero', decision: 'iterate', keeper: 'hero-001.mp4', nextPrompt: 'duplicate' },
        { slug: 'hero-still', decision: 'iterate', keeper: 'hero-still-001.jpg', nextPrompt: 'x' },
        { slug: 'orphan', decision: 'iterate', keeper: 'orphan-001.mp4', nextPrompt: 'x' },
        { slug: 'blank', decision: 'iterate', keeper: 'blank-001.mp4', nextPrompt: '   ' },
        { slug: 'done', decision: 'approve', keeper: 'done-001.mp4' },
      ],
    };

    it('detects a clip round by clip provenance or an .mp4 take', () => {
      expect(isClipRound(clipBatch)).toBe(true);
      const mp4Only = buildRoundBatch(1, 't', [{ slug: 'a', name: 'A', prompt: 'p' }], {
        a: ['a-001.mp4'],
      });
      expect(isClipRound(mp4Only)).toBe(true);
      const still = buildRoundBatch(1, 't', [{ slug: 'a', name: 'A', prompt: 'p' }], {
        a: ['a-001.jpg'],
      });
      expect(isClipRound(still)).toBe(false);
    });

    it('re-animates the same source still with the refined motion prompt', () => {
      const plans = planReanimateTasks(clipSelection, clipBatch);
      expect(plans).toEqual([
        {
          slug: 'hero',
          name: 'Hero',
          prompt: 'slower push-in, steam rising',
          ref: 'approved/hero-002.jpg',
          clip,
        },
      ]);
      expect(plans[0]!.clip).not.toBe(clipBatch.tasks[0]!.clip);
    });

    it('skips a clip task without a source still', () => {
      const noRef = buildRoundBatch(2, 't', [{ slug: 'hero', name: 'Hero', prompt: 'p', clip }], {
        hero: ['hero-001.mp4'],
      });
      expect(planReanimateTasks(clipSelection, noRef)).toEqual([]);
    });

    it('keeps .mp4 keepers out of the still iterate plan', () => {
      expect(planIterateTasks(clipSelection, 2)).toEqual([
        {
          slug: 'hero-still',
          prompt: 'x',
          keeperPath: 'rounds/r2/hero-still-001.jpg',
          useReference: true,
        },
      ]);
    });
  });

  it('plans ref-bootstrap copies from selection', () => {
    const selection: RoundSelection = {
      schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
      round: 0,
      selectedAt: '2026-06-18T00:05:00Z',
      tasks: [
        { slug: 'hero', decision: 'iterate', keeper: 'hero-002.png' },
        { slug: 'skip', decision: 'skip' },
      ],
    };
    expect(planRefBootstrapCopies(selection, 0)).toEqual([
      { slug: 'hero', from: 'rounds/r0/hero-002.png', to: 'refs/hero.png' },
    ]);
  });

  it('validates iterate selection tasks', () => {
    const errors = validateIterateSelectionTasks([
      { slug: 'a', decision: 'iterate' },
      { slug: 'b', decision: 'iterate', keeper: 'b-001.jpg', nextPrompt: 'ok' },
    ]);
    expect(errors).toHaveLength(2);
    expect(errors.every((e) => e.includes('"a"'))).toBe(true);
  });

  it('checks selection round match', () => {
    expect(
      selectionMatchesRound(
        {
          schemaVersion: 1,
          round: 2,
          selectedAt: 't',
          tasks: [],
        },
        2,
      ),
    ).toBe(true);
    expect(
      selectionMatchesRound(
        {
          schemaVersion: 1,
          round: 1,
          selectedAt: 't',
          tasks: [],
        },
        2,
      ),
    ).toBe(false);
  });
});