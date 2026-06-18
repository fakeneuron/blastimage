import { describe, expect, it } from 'vitest';

import {
  buildIterateSelectionTask,
  detectPromptMode,
  mergeRoundSelection,
  parseRoundSelection,
  ROUND_SELECTION_SCHEMA_VERSION,
  serializeRoundSelection,
  type RoundSelection,
} from './roundSelection';

describe('detectPromptMode', () => {
  it('returns append when base prompt is preserved with a Refine line', () => {
    const base = 'a sunlit ridge';
    const next = `${base}\n\nRefine: warmer tones`;
    expect(detectPromptMode(base, next)).toBe('append');
  });

  it('returns overhaul when the prompt is rewritten', () => {
    expect(detectPromptMode('old subject', 'completely new subject')).toBe('overhaul');
  });
});

describe('buildIterateSelectionTask', () => {
  it('includes keeper, promptMode, and nextPrompt', () => {
    const task = buildIterateSelectionTask('hero', 'hero-002.jpg', 'base', 'base\n\nRefine: crop');
    expect(task).toEqual({
      slug: 'hero',
      decision: 'iterate',
      keeper: 'hero-002.jpg',
      promptMode: 'append',
      nextPrompt: 'base\n\nRefine: crop',
    });
  });
});

describe('parseRoundSelection / serializeRoundSelection', () => {
  const sample: RoundSelection = {
    schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
    round: 2,
    selectedAt: '2026-06-18T00:10:00Z',
    tasks: [
      {
        slug: 'hero',
        decision: 'iterate',
        keeper: 'hero-001.jpg',
        promptMode: 'append',
        nextPrompt: 'base\n\nRefine: tighter crop',
      },
    ],
  };

  it('round-trips through serialize + parse', () => {
    const parsed = parseRoundSelection(serializeRoundSelection(sample));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) expect(parsed.value).toEqual(sample);
  });

  it('rejects unsupported schema versions', () => {
    const bad = { ...sample, schemaVersion: 99 };
    const parsed = parseRoundSelection(JSON.stringify(bad));
    expect(parsed.ok).toBe(false);
  });
});

describe('mergeRoundSelection', () => {
  it('merges by slug with incoming winning', () => {
    const existing: RoundSelection = {
      schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
      round: 1,
      selectedAt: '2026-06-18T00:00:00Z',
      tasks: [{ slug: 'a', decision: 'skip' }],
    };
    const merged = mergeRoundSelection(
      existing,
      [{ slug: 'b', decision: 'approve', keeper: 'b-001.jpg' }],
      '2026-06-18T00:05:00Z',
    );
    expect(merged.selectedAt).toBe('2026-06-18T00:05:00Z');
    expect(merged.tasks).toHaveLength(2);
    expect(merged.tasks.find((t) => t.slug === 'b')?.decision).toBe('approve');
  });
});