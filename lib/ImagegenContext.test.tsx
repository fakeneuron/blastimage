/**
 * ImagegenContext blob-cache bounds + round invalidation (BI-029.4)
 *
 * `resolveDisplayUrl`'s blob-URL cache was unbounded and only revoked on
 * `ImagegenProvider` unmount — which in practice never happens (it mounts
 * once at the top of `Workspace.tsx`), so it grew for the whole session and
 * could serve a stale blob after a round's files were rewritten on disk.
 * This file drives the cache directly through the real provider/hook, with
 * `lib/imagegenFs` mocked (no injection point — same rationale as
 * `components/Workspace.test.tsx`'s `vi.mock` of `useWorkspace`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { useState, type ReactNode } from 'react';

import { ImagegenProvider, useImagegen, type ImagegenApi } from './ImagegenContext';

const hoisted = vi.hoisted(() => ({
  root: { kind: 'directory', name: 'imagegen' } as unknown as FileSystemDirectoryHandle,
}));

vi.mock('./imagegenFs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./imagegenFs')>();
  return {
    ...actual,
    restoreLinkedImagegenFolder: vi.fn(async () => hoisted.root),
    readImagegenFile: vi.fn(async (_root: unknown, relativePath: string) => {
      return new File(['x'], relativePath.split('/').pop() ?? relativePath, { type: 'image/png' });
    }),
    readRoundBatch: vi.fn(async (_root: unknown, round: number) => ({
      ok: true,
      value: { schemaVersion: 1, round, generatedAt: 'x', tasks: [] },
    })),
  };
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ImagegenProvider>{children}</ImagegenProvider>;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function stubBlobUrls() {
  let counter = 0;
  const revoked: string[] = [];
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn(() => `blob:${counter++}`),
    revokeObjectURL: vi.fn((url: string) => revoked.push(url)),
  });
  return { revoked };
}

describe('resolveDisplayUrl blob-cache bound (BI-029.4)', () => {
  it('evicts the oldest entry and revokes its object URL once the cache exceeds its bound', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    // BLOB_CACHE_MAX_ENTRIES is 200 (lib/ImagegenContext.tsx) — filling it plus
    // one more forces exactly one eviction of the very first entry inserted.
    let firstResolved = '';
    for (let i = 0; i < 201; i++) {
      const resolved = await act(async () => result.current.resolveDisplayUrl(`imagegen:rounds/r1/img${i}.png`));
      if (i === 0) firstResolved = resolved;
    }

    expect(revoked).toEqual([firstResolved]);
  });

  it('does not evict on a cache hit (recency bump keeps the entry alive)', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    const url = 'imagegen:rounds/r1/hero.png';
    const first = await act(async () => result.current.resolveDisplayUrl(url));
    const second = await act(async () => result.current.resolveDisplayUrl(url));

    expect(second).toBe(first);
    expect(revoked).toEqual([]);
  });
});

describe('readRound invalidates that round\'s cached blobs (BI-029.4)', () => {
  it('revokes and drops only the reloaded round\'s cache entries', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    const round1Url = 'imagegen:rounds/r1/hero.png';
    const round2Url = 'imagegen:rounds/r2/hero.png';
    const round1Resolved = await act(async () => result.current.resolveDisplayUrl(round1Url));
    const round2Resolved = await act(async () => result.current.resolveDisplayUrl(round2Url));

    await act(async () => {
      await result.current.readRound(1);
    });

    expect(revoked).toEqual([round1Resolved]);

    const round1Reresolved = await act(async () => result.current.resolveDisplayUrl(round1Url));
    expect(round1Reresolved).not.toBe(round1Resolved);

    const round2Reresolved = await act(async () => result.current.resolveDisplayUrl(round2Url));
    expect(round2Reresolved).toBe(round2Resolved);
  });
});

/** Resolves `count` distinct round-1 URLs in order, returning the blob URL minted for each. */
async function fillCache(
  resolveDisplayUrl: (url: string) => Promise<string>,
  count: number,
): Promise<string[]> {
  const resolved: string[] = [];
  for (let i = 0; i < count; i++) {
    resolved.push(await act(async () => resolveDisplayUrl(`imagegen:rounds/r1/img${i}.png`)));
  }
  return resolved;
}

/**
 * Eviction is a memory bound, not a correctness event (BI-042.2) — it must never
 * revoke a blob URL a mounted consumer is rendering, because that consumer gets
 * no signal and would strand on a dead URL. Waking it instead is not an option:
 * it would re-read, re-insert, and evict the next held entry in turn.
 */
describe('eviction skips blob URLs a consumer is displaying (BI-042.2)', () => {
  it('evicts the oldest *evictable* entry rather than a held one', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    const resolved = await fillCache(result.current.resolveDisplayUrl, 200);
    result.current.retainDisplayUrl(resolved[0]!);

    await act(async () => result.current.resolveDisplayUrl('imagegen:rounds/r1/img200.png'));

    // Oldest is held, so the *second* oldest is what goes.
    expect(revoked).toEqual([resolved[1]!]);
  });

  it('releases a hold so the entry becomes evictable again', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    const resolved = await fillCache(result.current.resolveDisplayUrl, 200);
    const release = result.current.retainDisplayUrl(resolved[0]!);
    release();

    await act(async () => result.current.resolveDisplayUrl('imagegen:rounds/r1/img200.png'));

    expect(revoked).toEqual([resolved[0]!]);
  });

  it('keeps the last hold alive when the same blob URL is displayed twice', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    const resolved = await fillCache(result.current.resolveDisplayUrl, 200);
    // Two consumers rendering one image (e.g. review grid + gallery); one unmounts.
    result.current.retainDisplayUrl(resolved[0]!);
    const releaseSecond = result.current.retainDisplayUrl(resolved[0]!);
    releaseSecond();

    await act(async () => result.current.resolveDisplayUrl('imagegen:rounds/r1/img200.png'));

    expect(revoked).toEqual([resolved[1]!]);
  });

  it('leaves the bound soft rather than revoking anything when every entry is held', async () => {
    const { revoked } = stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    const resolved = await fillCache(result.current.resolveDisplayUrl, 200);
    for (const blobUrl of resolved) result.current.retainDisplayUrl(blobUrl);

    const overflow = await act(async () =>
      result.current.resolveDisplayUrl('imagegen:rounds/r1/img200.png'),
    );

    expect(revoked).toEqual([]);
    expect(overflow).not.toBe('');
  });
});

/**
 * Invalidation is the opposite case: the bytes behind a displayed URL are gone,
 * so consumers *must* react. `blobEpoch` is the signal `ResolvedImage` lists in
 * its resolve-effect deps — the same shape BI-038 used with `linked`.
 */
describe('blobEpoch signals a staleness revocation (BI-042.2)', () => {
  it('bumps when a round reload revokes cached entries', async () => {
    stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    await act(async () => result.current.resolveDisplayUrl('imagegen:rounds/r1/hero.png'));
    const before = result.current.blobEpoch;

    await act(async () => {
      await result.current.readRound(1);
    });

    expect(result.current.blobEpoch).toBe(before + 1);
  });

  it('does not bump when the reloaded round had nothing cached', async () => {
    stubBlobUrls();
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    await waitFor(() => expect(result.current.linked).toBe(true));

    await act(async () => result.current.resolveDisplayUrl('imagegen:rounds/r1/hero.png'));
    const before = result.current.blobEpoch;

    await act(async () => {
      await result.current.readRound(2);
    });

    expect(result.current.blobEpoch).toBe(before);
  });
});

/**
 * Without useMemo, every provider re-render mints a new context object and
 * re-fires consumers that list `imagegen` by identity (useWorkspace's
 * listRounds effect). Memo keeps identity stable across pure parent re-renders.
 */
describe('ImagegenApi value identity (BI-042.4)', () => {
  it('keeps the same context object across a parent re-render that changes neither linked nor blobEpoch', async () => {
    const seen: ImagegenApi[] = [];

    function Capture() {
      seen.push(useImagegen());
      return null;
    }

    function Parent() {
      const [n, setN] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setN((x) => x + 1)}>
            bump {n}
          </button>
          <ImagegenProvider>
            <Capture />
          </ImagegenProvider>
        </div>
      );
    }

    const { getByRole } = render(<Parent />);
    await waitFor(() => expect(seen.at(-1)?.linked).toBe(true));
    const afterLink = seen.at(-1)!;

    await act(async () => {
      getByRole('button').click();
    });

    expect(seen.at(-1)).toBe(afterLink);
  });
});
