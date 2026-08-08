import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveImageBlob } from './imageBlob';

/**
 * A fake `imagegen/` root holding one file per path, so `readImagegenFile`'s
 * directory walk (`rounds` → `r<N>` → file) resolves without a real FSA.
 */
function makeFakeRoot(files: Record<string, Blob>): FileSystemDirectoryHandle {
  const dirAt = (prefix: string) => ({
    getDirectoryHandle: async (name: string) => dirAt(`${prefix}${name}/`),
    getFileHandle: async (name: string) => {
      const blob = files[`${prefix}${name}`];
      if (!blob) throw new Error(`no such file: ${prefix}${name}`);
      return { getFile: async () => blob };
    },
  });
  return dirAt('') as unknown as FileSystemDirectoryHandle;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveImageBlob', () => {
  it('fetches non-imagegen URLs', async () => {
    const blob = new Blob(['remote'], { type: 'image/png' });
    const fetchMock = vi.fn(async () => ({ blob: async () => blob }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await resolveImageBlob('https://example.test/0', null)).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/0');
  });

  it('reads imagegen: URLs through the linked root instead of fetching', async () => {
    const onDisk = new Blob(['bytes'], { type: 'image/png' });
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    const resolved = await resolveImageBlob(
      'imagegen:rounds/r3/hero-01.png',
      makeFakeRoot({ 'rounds/r3/hero-01.png': onDisk }),
    );

    expect(resolved).toBe(onDisk);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects an imagegen: URL when no folder is linked', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);

    await expect(resolveImageBlob('imagegen:rounds/r3/hero-01.png', null)).rejects.toThrow(
      /Link your imagegen folder/,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects when the linked root has no such file', async () => {
    await expect(
      resolveImageBlob('imagegen:rounds/r9/missing.png', makeFakeRoot({})),
    ).rejects.toThrow();
  });
});
