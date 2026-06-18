import { describe, expect, it } from 'vitest';

import {
  imagegenPathFromUrl,
  isImagegenUrl,
  roundImageFilenameFromUrl,
  roundImageUrl,
  roundNumberFromImageUrl,
  toImagegenUrl,
} from './imagegenUrl';

describe('imagegenUrl helpers', () => {
  it('round-trips path prefixes', () => {
    const url = roundImageUrl(3, 'task-001.png');
    expect(isImagegenUrl(url)).toBe(true);
    expect(imagegenPathFromUrl(url)).toBe('rounds/r3/task-001.png');
  });

  it('extracts round number and filename from round image URLs', () => {
    const url = roundImageUrl(4, 'hero-002.jpg');
    expect(roundNumberFromImageUrl(url)).toBe(4);
    expect(roundImageFilenameFromUrl(url)).toBe('hero-002.jpg');
  });

  it('returns null for non-round imagegen paths', () => {
    const url = toImagegenUrl('refs/a.jpg');
    expect(roundNumberFromImageUrl(url)).toBeNull();
    expect(roundImageFilenameFromUrl(url)).toBeNull();
  });

  it('leaves non-imagegen urls alone', () => {
    expect(isImagegenUrl('data:image/png;base64,abc')).toBe(false);
    expect(imagegenPathFromUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });
});