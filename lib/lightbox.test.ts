import { describe, expect, it } from 'vitest';

import { reviewKeyAction, stepIndex } from './lightbox';

describe('stepIndex', () => {
  it('steps forward and backward within range', () => {
    expect(stepIndex(0, 1, 5)).toBe(1);
    expect(stepIndex(3, -1, 5)).toBe(2);
  });

  it('clamps at the lower bound instead of wrapping', () => {
    expect(stepIndex(0, -1, 5)).toBe(0);
  });

  it('clamps at the upper bound instead of wrapping', () => {
    expect(stepIndex(4, 1, 5)).toBe(4);
  });

  it('returns 0 for an empty set', () => {
    expect(stepIndex(0, 1, 0)).toBe(0);
    expect(stepIndex(0, -1, 0)).toBe(0);
  });

  it('handles a single-image set', () => {
    expect(stepIndex(0, 1, 1)).toBe(0);
    expect(stepIndex(0, -1, 1)).toBe(0);
  });
});

describe('reviewKeyAction (BI-060.3)', () => {
  const key = (
    k: string,
    mods: Partial<Pick<KeyboardEvent, 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'>> = {},
  ) => ({
    key: k,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    repeat: false,
    ...mods,
  });

  it.each([
    ['k', 'kept'],
    ['K', 'kept'],
    ['d', 'discarded'],
    ['a', 'approved'],
  ] as const)('maps %s to the %s decision', (k, decision) => {
    expect(reviewKeyAction(key(k))).toEqual({ kind: 'decision', decision });
  });

  it('maps 0–5 to a rating, 0 clearing it', () => {
    expect(reviewKeyAction(key('0'))).toEqual({ kind: 'rating', rating: 0 });
    expect(reviewKeyAction(key('5'))).toEqual({ kind: 'rating', rating: 5 });
  });

  it('ignores other keys, including 6–9', () => {
    for (const k of ['6', '9', 'x', 'ArrowLeft', 'Enter', ' ']) {
      expect(reviewKeyAction(key(k))).toBeNull();
    }
  });

  it('ignores modifier chords so browser shortcuts still work', () => {
    expect(reviewKeyAction(key('a', { metaKey: true }))).toBeNull();
    expect(reviewKeyAction(key('d', { ctrlKey: true }))).toBeNull();
    expect(reviewKeyAction(key('3', { altKey: true }))).toBeNull();
  });

  it('ignores auto-repeat so a held K does not flicker the toggle', () => {
    expect(reviewKeyAction(key('k', { repeat: true }))).toBeNull();
  });
});
