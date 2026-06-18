import { describe, expect, it } from 'vitest';

import {
  imagegenPathFromUrl,
  isImagegenUrl,
  roundImageUrl,
  toImagegenUrl,
} from './imagegenUrl';

describe('imagegenUrl helpers', () => {
  it('round-trips path prefixes', () => {
    const url = roundImageUrl(3, 'task-001.png');
    expect(isImagegenUrl(url)).toBe(true);
    expect(imagegenPathFromUrl(url)).toBe('rounds/r3/task-001.png');
  });

  it('normalizes leading slashes', () => {
    expect(toImagegenUrl('/refs/a.jpg')).toBe('imagegen:refs/a.jpg');
  });

  it('leaves non-imagegen urls alone', () => {
    expect(isImagegenUrl('https://example.com/a.png')).toBe(false);
    expect(imagegenPathFromUrl('data:image/png;base64,abc')).toBe('data:image/png;base64,abc');
  });
});