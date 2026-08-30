/**
 * ResolvedImage tests (TEST-003 · server adapter BI-045)
 *
 * `ResolvedImage` (BI-024.1) is 38 lines and one effect, but it is the component
 * every other cohort test file mounts an `ImagegenProvider` to satisfy — and
 * those files only ever exercise its *passthrough* branch, because their
 * provider restores to no linked root and `imagegen:` URLs come back untouched.
 * This file is the one that reaches the resolve branch.
 *
 * To get there it mocks `lib/imagegenClient` and mounts the **real** provider
 * and context, per the `lib/ImagegenContext.test.tsx` precedent — rather than
 * `vi.mock`-ing `ImagegenContext` itself, which would stub out the very
 * passthrough-vs-resolve decision under test. `ImagegenContext` exports no
 * context object, so the client module is the only injectable seam.
 *
 * Fixtures render through `<Linked>`, which mounts the image only once the
 * provider reports `linked`. That mirrors the app (round images exist only after
 * a folder is linked). BI-038 also covers the mount-before-restore path as a
 * contract; `<Linked>` remains the happy-path fixture for the resolution suite.
 *
 * **What BI-045 retired.** Resolution used to read a `File` off an FSA handle
 * and mint an object URL, so this file pinned an eviction/revocation dance and
 * an out-of-order race between a slow read and a newer `src`. Serving images
 * over `/api/imagegen/file` removes the I/O: `resolveDisplayUrl` now builds a
 * string, resolutions cannot land out of order, and there is no object URL whose
 * lifetime anyone owns. Those suites are gone rather than re-staged against
 * faked asynchrony that production no longer has. The `cancelled` guard in the
 * component stays — it is the correct shape for an async effect — but is no
 * longer observably testable, and is documented as such rather than pinned.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import ResolvedImage from './ResolvedImage';
import { ImagegenProvider, useImagegen, type ImagegenApi } from '@/lib/ImagegenContext';

const hoisted = vi.hoisted(() => ({ root: '/repo/imagegen' }));

vi.mock('@/lib/imagegenClient', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/imagegenClient')>();
  return {
    ...actual,
    restoreLinkedRoot: vi.fn(async () => hoisted.root),
    readRoundBatch: vi.fn(async (_root: string, round: number) => ({
      ok: true as const,
      value: { schemaVersion: 1, round, generatedAt: 'x', tasks: [] },
    })),
  };
});

/** Mounts children only once the root restore has settled — see the file header. */
function Linked({ children }: { children: ReactNode }) {
  const { linked } = useImagegen();
  return linked ? <>{children}</> : null;
}

/**
 * Stashes the live `ImagegenApi` into a ref so a test can call `readRound` /
 * `resolveDisplayUrl` on the same provider the mounted image is under.
 */
function Capture({ apiRef }: { apiRef: { current: ImagegenApi | null } }) {
  apiRef.current = useImagegen();
  return null;
}

function image(src: string) {
  return (
    <ImagegenProvider>
      <Linked>
        <ResolvedImage src={src} alt="subject" />
      </Linked>
    </ImagegenProvider>
  );
}

/** Like `image`, but also exposes the provider API for in-test driver calls. */
function imageWithApi(src: string, apiRef: { current: ImagegenApi | null }) {
  return (
    <ImagegenProvider>
      <Capture apiRef={apiRef} />
      <Linked>
        <ResolvedImage src={src} alt="subject" />
      </Linked>
    </ImagegenProvider>
  );
}

/** Renders through `<Linked>` and drains both the restore and the resolve effect. */
async function renderResolved(src: string) {
  const { rerender, unmount } = render(image(src));
  await act(async () => {});
  await act(async () => {});
  return {
    unmount,
    rerender: async (next: string) => {
      rerender(image(next));
      await act(async () => {});
    },
  };
}

const src = () => screen.getByAltText('subject').getAttribute('src');

/** The `path` (and optional cache-buster) the rendered file-route URL carries. */
function servedPath(): { path: string | null; version: string | null; root: string | null } {
  const url = new URL(src() ?? '', 'http://localhost:3003');
  return {
    path: url.searchParams.get('path'),
    version: url.searchParams.get('v'),
    root: url.searchParams.get('root'),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ResolvedImage — passthrough (BI-024.1)', () => {
  it('renders an https: URL untouched', async () => {
    await renderResolved('https://example.test/i1.png');

    expect(src()).toBe('https://example.test/i1.png');
  });

  it('renders a data: URL untouched', async () => {
    const dataUrl = 'data:image/png;base64,AAAA';

    await renderResolved(dataUrl);

    expect(src()).toBe(dataUrl);
  });
});

describe('ResolvedImage — imagegen: resolution (BI-024.1 · BI-045)', () => {
  it('renders the file route under the linked root', async () => {
    await renderResolved('imagegen:rounds/r1/hero.png');

    expect(src()?.startsWith('/api/imagegen/file?')).toBe(true);
    expect(servedPath()).toMatchObject({ path: 'rounds/r1/hero.png', root: '/repo/imagegen' });
  });

  it('re-resolves when the src prop changes', async () => {
    const { rerender } = await renderResolved('imagegen:rounds/r1/hero.png');

    await rerender('imagegen:rounds/r1/about.png');

    expect(servedPath().path).toBe('rounds/r1/about.png');
  });

  it('falls back to the raw URL when no folder is linked', async () => {
    const client = await import('@/lib/imagegenClient');
    vi.mocked(client.restoreLinkedRoot).mockResolvedValueOnce(null);

    render(
      <ImagegenProvider>
        <ResolvedImage src="imagegen:rounds/r1/gone.png" alt="subject" />
      </ImagegenProvider>,
    );
    await act(async () => {});
    await act(async () => {});

    expect(src()).toBe('imagegen:rounds/r1/gone.png');
  });
});

describe('ResolvedImage — provider requirement (BI-024.1)', () => {
  it('throws outside an ImagegenProvider', () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => render(<ResolvedImage src="https://example.test/i1.png" alt="subject" />)).toThrow(
      /useImagegen must be used within ImagegenProvider/,
    );

    errors.mockRestore();
  });
});

describe('ResolvedImage — mount-before-restore (BI-038)', () => {
  it('resolves an imagegen: URL after the root restore settles', async () => {
    render(
      <ImagegenProvider>
        <ResolvedImage src="imagegen:rounds/r1/hero.png" alt="subject" />
      </ImagegenProvider>,
    );
    // Drain restore + the re-run resolve effect once `linked` becomes true.
    await act(async () => {});
    await act(async () => {});

    expect(servedPath().path).toBe('rounds/r1/hero.png');
  });
});

/**
 * Contract (BI-042.3): a mounted `ResolvedImage` must land on the bytes now on
 * disk after its round is reloaded, and must never flash its raw `imagegen:`
 * URL while doing so. The revocation this originally guarded is gone (BI-045),
 * but the staleness signal is not: a rerun of `/blast-generate` rewrites the
 * files under an unchanged URL, so the `blobEpoch` cache-buster is what makes
 * the browser fetch them.
 */
describe('ResolvedImage — consumer recovery (BI-042.3 · BI-045)', () => {
  it('re-resolves onto a cache-busted URL after its round is reloaded', async () => {
    const apiRef: { current: ImagegenApi | null } = { current: null };

    render(imageWithApi('imagegen:rounds/r1/hero.png', apiRef));
    await act(async () => {});
    await act(async () => {});

    const first = src();
    expect(servedPath().version).toBe(null);

    await act(async () => {
      await apiRef.current!.readRound(1);
    });
    // Drain the re-resolve the blobEpoch bump kicked off.
    await act(async () => {});

    expect(src()).not.toBe(first);
    expect(servedPath()).toMatchObject({ path: 'rounds/r1/hero.png', version: '1' });
  });

  it('does not flash the raw imagegen: URL while a reload re-resolves it', async () => {
    const apiRef: { current: ImagegenApi | null } = { current: null };

    render(imageWithApi('imagegen:rounds/r2/hero.png', apiRef));
    await act(async () => {});
    await act(async () => {});

    const shown = src();
    expect(shown?.startsWith('/api/imagegen/file?')).toBe(true);

    // Flush the epoch bump (sync setState) without draining the resolve
    // microtask — the only window where a merged [src] reset would flash.
    act(() => {
      void apiRef.current!.readRound(1);
    });

    expect(src()).toBe(shown);

    await act(async () => {});

    expect(servedPath()).toMatchObject({ path: 'rounds/r2/hero.png', version: '1' });
  });
});
