import { describe, expect, it } from 'vitest';

import { stepIndex } from './lightbox';

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
