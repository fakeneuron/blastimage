import { afterEach, describe, expect, it, vi } from 'vitest';

import { resolveImageBlob } from './imageBlob';

const ROOT = '/repo/imagegen';

/**
 * Stubs `fetch` with a fake `imagegen/` served by the file route, keyed by the
 * `path` parameter — the shape `/api/imagegen/file` actually answers with.
 */
function stubImagegenServer(files: Record<string, Blob>) {
  const requested: string[] = [];
  const fetchMock = vi.fn(async (input: string) => {
    requested.push(input);
    const params = new URL(input, 'http://localhost:3003').searchParams;
    const blob = files[params.get('path') ?? ''];
    return blob
      ? { ok: true, blob: async () => blob }
      : { ok: false, status: 400, blob: async () => new Blob() };
  });
  vi.stubGlobal('fetch', fetchMock);
  return { fetchMock, requested };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('resolveImageBlob', () => {
  it('fetches non-imagegen URLs', async () => {
    const blob = new Blob(['remote'], { type: 'image/png' });
    const fetchMock = vi.fn(async () => ({ ok: true, blob: async () => blob }));
    vi.stubGlobal('fetch', fetchMock);

    expect(await resolveImageBlob('https://example.test/0', null)).toBe(blob);
    expect(fetchMock).toHaveBeenCalledWith('https://example.test/0');
  });

  it('reads imagegen: URLs through the file route under the linked root', async () => {
    const onDisk = new Blob(['bytes'], { type: 'image/png' });
    const { requested } = stubImagegenServer({ 'rounds/r3/hero-01.png': onDisk });

    const resolved = await resolveImageBlob('imagegen:rounds/r3/hero-01.png', ROOT);

    expect(resolved).toBe(onDisk);
    const url = new URL(requested[0]!, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/file');
    expect(url.searchParams.get('root')).toBe(ROOT);
    expect(url.searchParams.get('path')).toBe('rounds/r3/hero-01.png');
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
    stubImagegenServer({});

    await expect(resolveImageBlob('imagegen:rounds/r9/missing.png', ROOT)).rejects.toThrow(
      /Could not read rounds\/r9\/missing\.png/,
    );
  });
});
