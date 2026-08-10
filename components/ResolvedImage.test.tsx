/**
 * ResolvedImage tests (TEST-003)
 *
 * `ResolvedImage` (BI-024.1) is 38 lines and one effect, but it is the component
 * every other cohort test file mounts an `ImagegenProvider` to satisfy — and
 * those files only ever exercise its *passthrough* branch, because happy-dom
 * exposes no `indexedDB`, so their provider restores to a `null` handle and
 * `imagegen:` URLs come back untouched. This file is the one that reaches the
 * resolve branch.
 *
 * To get there it mocks `lib/imagegenFs` and mounts the **real** provider and
 * context, per the `lib/ImagegenContext.test.tsx` precedent — rather than
 * `vi.mock`-ing `ImagegenContext` itself, which would stub out the very
 * passthrough-vs-resolve decision under test. `ImagegenContext` exports no
 * context object, so the FS module is the only injectable seam.
 *
 * Fixtures render through `<Linked>`, which mounts the image only once the
 * provider reports `linked`. That mirrors the app (round images exist only after
 * a folder is linked). BI-038 also covers the mount-before-restore path as a
 * contract; `<Linked>` remains the happy-path fixture for the resolution suite.
 *
 * Deliberately not pinned: the `cancelled` guard's after-unmount half
 * (`ResolvedImage.tsx:32-34`). React 19 no longer warns on setState after
 * unmount, so a "no warning" assertion would pass with the guard deleted. The
 * guard's other half — a stale in-flight resolution losing to a newer `src` — is
 * observable and is pinned below; deleting the guard fails that test.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

import ResolvedImage from './ResolvedImage';
import { ImagegenProvider, useImagegen } from '@/lib/ImagegenContext';

const hoisted = vi.hoisted(() => ({
  root: { kind: 'directory', name: 'imagegen' } as unknown as FileSystemDirectoryHandle,
  /** Paths `readImagegenFile` was asked for, in call order. */
  reads: [] as string[],
  /** Paths whose read parks until `release(path)` runs, for the race test. */
  held: new Set<string>(),
  release: new Map<string, () => void>(),
}));

vi.mock('@/lib/imagegenFs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/imagegenFs')>();
  return {
    ...actual,
    restoreLinkedImagegenFolder: vi.fn(async () => hoisted.root),
    readImagegenFile: vi.fn(async (_root: unknown, relativePath: string) => {
      hoisted.reads.push(relativePath);
      // happy-dom keeps slashes in File.name, so the stubbed object URL below
      // reads back as `blob:<the path that produced it>`.
      const file = new File(['x'], relativePath, { type: 'image/png' });
      if (!hoisted.held.has(relativePath)) return file;
      return new Promise<File>((resolve) => {
        hoisted.release.set(relativePath, () => resolve(file));
      });
    }),
  };
});

/** Mounts children only once the handle restore has settled — see the file header. */
function Linked({ children }: { children: ReactNode }) {
  const { linked } = useImagegen();
  return linked ? <>{children}</> : null;
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  hoisted.reads.length = 0;
  hoisted.held.clear();
  hoisted.release.clear();
});

/** Stubs the object-URL pair only — happy-dom still needs the rest of `URL`. */
function stubBlobUrls() {
  vi.spyOn(URL, 'createObjectURL').mockImplementation((obj) => `blob:${(obj as File).name}`);
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
}

describe('ResolvedImage — passthrough (BI-024.1)', () => {
  it('renders an https: URL untouched and reads nothing from disk', async () => {
    stubBlobUrls();

    await renderResolved('https://example.test/i1.png');

    expect(src()).toBe('https://example.test/i1.png');
    expect(hoisted.reads).toEqual([]);
  });

  it('renders a data: URL untouched and reads nothing from disk', async () => {
    stubBlobUrls();
    const dataUrl = 'data:image/png;base64,AAAA';

    await renderResolved(dataUrl);

    expect(src()).toBe(dataUrl);
    expect(hoisted.reads).toEqual([]);
  });
});

describe('ResolvedImage — imagegen: resolution (BI-024.1)', () => {
  it('reads the path off the linked folder and renders the blob URL', async () => {
    stubBlobUrls();

    await renderResolved('imagegen:rounds/r1/hero.png');

    expect(hoisted.reads).toEqual(['rounds/r1/hero.png']);
    expect(src()).toBe('blob:rounds/r1/hero.png');
  });

  it('re-resolves when the src prop changes', async () => {
    stubBlobUrls();
    const { rerender } = await renderResolved('imagegen:rounds/r1/hero.png');

    await rerender('imagegen:rounds/r1/about.png');

    expect(hoisted.reads).toEqual(['rounds/r1/hero.png', 'rounds/r1/about.png']);
    expect(src()).toBe('blob:rounds/r1/about.png');
  });

  it('drops the previous blob immediately rather than showing it against the new src', async () => {
    stubBlobUrls();
    hoisted.held.add('rounds/r1/slow.png');
    const { rerender } = await renderResolved('imagegen:rounds/r1/hero.png');

    await rerender('imagegen:rounds/r1/slow.png');

    // The new read is parked, so what shows is the raw new src — never the blob
    // that belongs to the old one.
    expect(src()).toBe('imagegen:rounds/r1/slow.png');
  });

  /**
   * The `cancelled` guard (`ResolvedImage.tsx:32-34`) in its observable form: a
   * resolution that lands after its `src` has been replaced must not win. Delete
   * the guard and the slow read's blob overwrites the fast one here.
   */
  it('lets a newer src win over a resolution still in flight for the old one', async () => {
    stubBlobUrls();
    hoisted.held.add('rounds/r1/slow.png');
    const { rerender } = await renderResolved('imagegen:rounds/r1/slow.png');

    await rerender('imagegen:rounds/r1/fast.png');
    expect(src()).toBe('blob:rounds/r1/fast.png');

    await act(async () => {
      hoisted.release.get('rounds/r1/slow.png')!();
    });

    expect(src()).toBe('blob:rounds/r1/fast.png');
  });

  it('falls back to the raw URL when the file cannot be read', async () => {
    stubBlobUrls();
    const fs = await import('@/lib/imagegenFs');
    vi.mocked(fs.readImagegenFile).mockRejectedValueOnce(new Error('missing'));

    await renderResolved('imagegen:rounds/r1/gone.png');

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

/**
 * Contract (BI-038): an `imagegen:` image mounted before the provider's handle
 * restore settles must re-resolve once `linked` flips true. Before the fix the
 * effect only depended on `[src, resolveDisplayUrl]`, and `resolveDisplayUrl`
 * is a stable `useCallback([])`, so the image stayed on its raw src forever.
 */
describe('ResolvedImage — mount-before-restore (BI-038)', () => {
  it('resolves an imagegen: URL after the handle restore settles', async () => {
    stubBlobUrls();

    render(
      <ImagegenProvider>
        <ResolvedImage src="imagegen:rounds/r1/hero.png" alt="subject" />
      </ImagegenProvider>,
    );
    // Drain restore + the re-run resolve effect once `linked` becomes true.
    await act(async () => {});
    await act(async () => {});

    expect(hoisted.reads).toEqual(['rounds/r1/hero.png']);
    expect(src()).toBe('blob:rounds/r1/hero.png');
  });
});
