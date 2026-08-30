/**
 * ImagegenContext over the server adapter (BI-045)
 *
 * BI-024.1's File System Access layer is gone, and with it the blob-URL cache
 * BI-029.4 / BI-042.2 bounded and invalidated: an `/api/imagegen/file` URL is
 * renderable as-is, so nothing is minted, held, or revoked. What survives is
 * the *contract* those tasks established — `blobEpoch` still moves when a round
 * reload makes on-screen images stale, and the context object still keeps a
 * stable identity across pure parent re-renders (BI-042.4).
 *
 * Drives the real provider/hook with `lib/imagegenClient` mocked (no injection
 * point — same rationale as `components/Workspace.test.tsx`'s `vi.mock` of
 * `useWorkspace`). `imagegenFileUrl` is deliberately left unmocked: the URL it
 * builds is the thing under test.
 *
 * BI-047 moved the *choice* of root out of here: the provider no longer restores
 * one on mount, it serves whichever one `useWorkspace` points it at. So every
 * fixture below links explicitly, and "unlinked" is simply a provider nobody has
 * pointed anywhere — the state a project with no bound folder is in.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { useEffect, useState, type ReactNode } from 'react';

import { ImagegenProvider, useImagegen, type ImagegenApi } from './ImagegenContext';

const hoisted = vi.hoisted(() => ({ root: '/repo/imagegen' }));

vi.mock('./imagegenClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./imagegenClient')>();
  return {
    ...actual,
    linkImagegenRoot: vi.fn(async () => ({ ok: true as const, value: hoisted.root })),
    browseDirectory: vi.fn(async () => ({
      ok: true as const,
      value: { path: '/repo', parent: '/', entries: [] },
    })),
    suggestedRoots: vi.fn(async () => [hoisted.root]),
    listRounds: vi.fn(async () => [1, 2]),
    readRoundBatch: vi.fn(async (_root: string, round: number) => ({
      ok: true as const,
      value: { schemaVersion: 1, round, generatedAt: 'x', tasks: [] },
    })),
    writeRoundSelection: vi.fn(async () => ({ ok: true as const, value: undefined })),
    promoteApproved: vi.fn(async () => ({ ok: true as const, value: undefined })),
    removeApproved: vi.fn(async () => ({ ok: true as const, value: undefined })),
    approvedConflict: vi.fn(async () => ({ ok: true as const, value: false })),
  };
});

function Wrapper({ children }: { children: ReactNode }) {
  return <ImagegenProvider>{children}</ImagegenProvider>;
}

/** Stands in for `useWorkspace` pointing the link at the project's root (BI-047). */
function AutoLink() {
  const { setLinkedRoot } = useImagegen();
  useEffect(() => {
    void setLinkedRoot(hoisted.root);
  }, [setLinkedRoot]);
  return null;
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

/** Mounts the hook and points it at the fixture root, as `useWorkspace` does. */
async function linkedHook() {
  const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
  await act(async () => {
    await result.current.setLinkedRoot(hoisted.root);
  });
  await waitFor(() => expect(result.current.linked).toBe(true));
  return result;
}

describe('resolveDisplayUrl (BI-045)', () => {
  it('points an imagegen: URL at the file route under the linked root', async () => {
    const result = await linkedHook();

    const resolved = await act(async () =>
      result.current.resolveDisplayUrl('imagegen:rounds/r1/hero.png'),
    );

    const url = new URL(resolved, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/file');
    expect(url.searchParams.get('root')).toBe('/repo/imagegen');
    expect(url.searchParams.get('path')).toBe('rounds/r1/hero.png');
  });

  it('passes data: and https: URLs through untouched', async () => {
    const result = await linkedHook();

    for (const url of ['data:image/png;base64,AAAA', 'https://example.test/a.png']) {
      expect(await act(async () => result.current.resolveDisplayUrl(url))).toBe(url);
    }
  });

  it('returns the raw imagegen: URL when no folder is linked', async () => {
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    expect(result.current.linked).toBe(false);

    const raw = 'imagegen:rounds/r1/hero.png';
    expect(await act(async () => result.current.resolveDisplayUrl(raw))).toBe(raw);
  });
});

/**
 * `blobEpoch` outlived the blob cache it was built for (BI-042.2): a round
 * rerun in the terminal rewrites `rounds/r<N>/` under the URLs already on
 * screen, and the bump is both the consumer's re-resolve signal and the `v=`
 * that defeats the browser's own HTTP cache.
 */
describe('blobEpoch busts a reloaded round (BI-042.2 · BI-045)', () => {
  it('bumps on readRound and carries into the next resolved URL', async () => {
    const result = await linkedHook();

    const before = result.current.blobEpoch;
    const stale = await act(async () =>
      result.current.resolveDisplayUrl('imagegen:rounds/r1/hero.png'),
    );
    expect(new URL(stale, 'http://x').searchParams.get('v')).toBe(null);

    await act(async () => {
      await result.current.readRound(1);
    });

    expect(result.current.blobEpoch).toBe(before + 1);
    const fresh = await act(async () =>
      result.current.resolveDisplayUrl('imagegen:rounds/r1/hero.png'),
    );
    expect(fresh).not.toBe(stale);
    expect(new URL(fresh, 'http://x').searchParams.get('v')).toBe(String(before + 1));
  });
});

describe('unlinked operations report the link prompt', () => {
  it('fails every folder operation with the sidebar hint', async () => {
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });
    expect(result.current.linked).toBe(false);

    const outcomes = await Promise.all([
      result.current.readRound(1),
      result.current.writeSelection(1, [], 'now'),
      result.current.promoteApproved(1, 'hero.png'),
      result.current.unpromoteApproved('hero.png'),
      result.current.approvedConflict(1, 'hero.png'),
    ]);

    for (const outcome of outcomes) {
      expect(outcome.ok).toBe(false);
      if (!outcome.ok) expect(outcome.error).toMatch(/Link your imagegen folder first/);
    }
    expect(await result.current.listRounds()).toEqual([]);
  });
});

describe('setLinkedRoot (BI-046 · BI-047)', () => {
  it('adopts the root it is handed so later operations reach that folder', async () => {
    const client = await import('./imagegenClient');
    const { result } = renderHook(() => useImagegen(), { wrapper: Wrapper });

    await act(async () => {
      await result.current.setLinkedRoot('/repo/imagegen');
    });

    expect(vi.mocked(client.linkImagegenRoot)).toHaveBeenCalledWith('/repo/imagegen');
    expect(result.current.root).toBe('/repo/imagegen');
    expect(result.current.linked).toBe(true);
    expect(await result.current.listRounds()).toEqual([1, 2]);
  });

  it('unlinks on null, so a project with no bound folder shows none', async () => {
    const result = await linkedHook();

    await act(async () => {
      await result.current.setLinkedRoot(null);
    });

    expect(result.current.root).toBe(null);
    expect(result.current.linked).toBe(false);
  });

  /**
   * The failure that made this a project property: leaving the previous
   * project's folder live under a project that does not own it would resolve
   * its `imagegen:` URLs against the wrong repo.
   */
  it('clears the link when the new root is rejected, rather than keeping the old one', async () => {
    const client = await import('./imagegenClient');
    const result = await linkedHook();
    expect(result.current.root).toBe('/repo/imagegen');

    vi.mocked(client.linkImagegenRoot).mockResolvedValueOnce({
      ok: false as const,
      error: 'No such folder: /gone/imagegen',
    });
    const outcome = await act(async () => result.current.setLinkedRoot('/gone/imagegen'));

    expect(outcome.ok).toBe(false);
    expect(result.current.root).toBe(null);
    expect(result.current.linked).toBe(false);
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
            <AutoLink />
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
