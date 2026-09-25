import { describe, expect, it } from 'vitest';

import {
  buildIterateSelectionTask,
  detectPromptMode,
  mergeRoundSelection,
  parseRoundSelection,
  parseRoundSelectionTask,
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

describe('parseRoundSelectionTask', () => {
  it('trims fields and keeps valid optional ones', () => {
    expect(
      parseRoundSelectionTask(
        { slug: ' hero ', decision: 'iterate', keeper: ' hero-001.jpg ', promptMode: 'append', nextPrompt: ' p ' },
        0,
      ),
    ).toEqual({
      ok: true,
      value: { slug: 'hero', decision: 'iterate', keeper: 'hero-001.jpg', promptMode: 'append', nextPrompt: 'p' },
    });
  });

  it('drops malformed optional fields rather than failing', () => {
    expect(
      parseRoundSelectionTask({ slug: 'hero', decision: 'skip', keeper: 7, promptMode: 'x', nextPrompt: ' ' }, 0),
    ).toEqual({ ok: true, value: { slug: 'hero', decision: 'skip' } });
  });

  it('names the 1-based task on each rejection', () => {
    const cases: [unknown, string][] = [
      [null, 'Task 3 must be an object.'],
      ['hero', 'Task 3 must be an object.'],
      [{ decision: 'skip' }, 'Task 3 needs a non-empty "slug".'],
      [{ slug: '  ', decision: 'skip' }, 'Task 3 needs a non-empty "slug".'],
      [{ slug: 'hero', decision: 'delete' }, 'Task 3 "decision" must be iterate, approve, or skip.'],
    ];
    for (const [entry, error] of cases) {
      expect(parseRoundSelectionTask(entry, 2)).toEqual({ ok: false, error });
    }
  });

  it('is the rule parseRoundSelection applies to every entry', () => {
    const text = JSON.stringify({
      schemaVersion: ROUND_SELECTION_SCHEMA_VERSION,
      round: 1,
      selectedAt: 'x',
      tasks: [{ slug: 'a', decision: 'skip' }, { slug: 'b', decision: 'nope' }],
    });
    expect(parseRoundSelection(text)).toEqual(parseRoundSelectionTask({ slug: 'b', decision: 'nope' }, 1));
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