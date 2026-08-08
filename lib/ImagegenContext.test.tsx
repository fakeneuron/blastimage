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
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';

import { ImagegenProvider, useImagegen } from './ImagegenContext';

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
