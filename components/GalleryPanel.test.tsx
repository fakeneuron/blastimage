/**
 * GalleryPanel tests (TEST-002.5)
 *
 * `GalleryPanel` is the approved-images panel (BI-008), grown a Folder button
 * (BI-021.2) and a Sheet button (BI-021.4) on top of the original JSON export —
 * three prop-driven callbacks with no test pinning that each header button fires
 * the right one. That is what this file covers.
 *
 * Deliberately out of scope: the per-item ↓ download button (`downloadImage` →
 * `resolveBlob` → `downloadBlob`), which is BI-029.2's byte-resolution seam and
 * already unit-tested at `lib/imageBlob.test.ts`; and the thumbnail → `Lightbox`
 * wiring, structurally identical to `ReviewGrid`'s (TEST-002.2) and the overlay
 * itself (TEST-002.4) — re-asserting the same open/close wiring here would be
 * redundant coverage, not new risk.
 *
 * The real `ImagegenProvider` is mounted rather than stubbed: `GalleryPanel`
 * renders `ResolvedImage` for every thumbnail, which throws outside a provider.
 * It is safe to mount for real — happy-dom exposes no `indexedDB`, so the
 * handle-restore effect resolves to `null`, and these fixtures use `https:`
 * URLs, which `resolveDisplayUrl` passes through untouched (same precedent as
 * `ReviewGrid.test.tsx` / `TaskDetail.test.tsx`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import GalleryPanel from './GalleryPanel';
import { ImagegenProvider } from '@/lib/ImagegenContext';
import type { ApprovedImage } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';

function makeApproved(id: string, overrides: Partial<ApprovedImage> = {}): ApprovedImage {
  return {
    imageId: id,
    taskId: 't1',
    taskName: `Task ${id}`,
    url: `https://example.test/${id}.png`,
    finalPrompt: `prompt ${id}`,
    promptHistory: [`prompt ${id}`],
    refImageIds: [],
    rating: 0,
    feedback: null,
    approvedAt: NOW,
    ...overrides,
  };
}

interface GalleryOptions {
  approved?: ApprovedImage[];
}

function markup({ approved = [] }: GalleryOptions, spies: ReturnType<typeof makeSpies>) {
  return (
    <ImagegenProvider>
      <GalleryPanel
        approved={approved}
        onExportAll={spies.onExportAll}
        onExportToFolder={spies.onExportToFolder}
        onExportReviewSheet={spies.onExportReviewSheet}
      />
    </ImagegenProvider>
  );
}

function makeSpies() {
  return {
    onExportAll: vi.fn(),
    onExportToFolder: vi.fn(),
    onExportReviewSheet: vi.fn(),
  };
}

/**
 * Renders under a real provider and drains the provider's mount-time restore so
 * no state settles outside `act`.
 */
async function renderGallery(options: GalleryOptions = {}) {
  const spies = makeSpies();
  render(markup(options, spies));
  await act(async () => {});
  return spies;
}

afterEach(() => {
  cleanup();
});

describe('GalleryPanel — empty state (BI-008)', () => {
  it('shows the placeholder and no export group when nothing is approved', async () => {
    await renderGallery({ approved: [] });

    expect(screen.getByText(/Approved images appear here\./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Folder' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Sheet' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'JSON' })).toBeNull();
  });

  it('shows no count badge when empty', async () => {
    await renderGallery({ approved: [] });

    expect(screen.queryByText('0')).toBeNull();
  });
});

describe('GalleryPanel — export group (BI-008 / BI-021.2 / BI-021.4)', () => {
  it('shows the count badge and all three export buttons once populated', async () => {
    await renderGallery({ approved: [makeApproved('i1'), makeApproved('i2')] });

    expect(screen.getByText('2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Folder' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Sheet' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'JSON' })).toBeTruthy();
  });

  it('reports Folder export', async () => {
    const { onExportToFolder, onExportAll, onExportReviewSheet } = await renderGallery({
      approved: [makeApproved('i1')],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Folder' }));

    expect(onExportToFolder).toHaveBeenCalledTimes(1);
    expect(onExportAll).not.toHaveBeenCalled();
    expect(onExportReviewSheet).not.toHaveBeenCalled();
  });

  it('reports Sheet export', async () => {
    const { onExportReviewSheet, onExportAll, onExportToFolder } = await renderGallery({
      approved: [makeApproved('i1')],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Sheet' }));

    expect(onExportReviewSheet).toHaveBeenCalledTimes(1);
    expect(onExportAll).not.toHaveBeenCalled();
    expect(onExportToFolder).not.toHaveBeenCalled();
  });

  it('reports JSON export', async () => {
    const { onExportAll, onExportToFolder, onExportReviewSheet } = await renderGallery({
      approved: [makeApproved('i1')],
    });

    fireEvent.click(screen.getByRole('button', { name: 'JSON' }));

    expect(onExportAll).toHaveBeenCalledTimes(1);
    expect(onExportToFolder).not.toHaveBeenCalled();
    expect(onExportReviewSheet).not.toHaveBeenCalled();
  });
});

describe('GalleryPanel — item rendering (BI-008)', () => {
  it('renders one entry per approved image, labelled by task name', async () => {
    await renderGallery({
      approved: [
        makeApproved('i1', { taskName: 'Hero shot' }),
        makeApproved('i2', { taskName: 'Footer banner' }),
      ],
    });

    expect(screen.getByText('Hero shot')).toBeTruthy();
    expect(screen.getByText('Footer banner')).toBeTruthy();
  });
});
