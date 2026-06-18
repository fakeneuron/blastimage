import { describe, expect, it } from 'vitest';

import type { RoundSelection } from './roundSelection';
import { ROUND_SELECTION_SCHEMA_VERSION } from './roundSelection';
import {
  buildRoundBatch,
  indexRefPaths,
  needsRefBootstrap,
  nextRoundNumber,
  parseRoundDirNames,
  planGenerateTasks,
  planIterateTasks,
  planRefBootstrapCopies,
  roundImageFilename,
  selectionMatchesRound,
  validateIterateSelectionTasks,
} from './terminalRound';

describe('terminalRound helpers', () => {
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
      keeperPath: undefined,
      useReference: false,
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