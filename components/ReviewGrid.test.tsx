/**
 * ReviewGrid tests (TEST-002.2)
 *
 * `ReviewGrid` is the review loop's primary interaction surface, and it shipped
 * untested across four tasks (BI-005 grid, BI-006 feedback states, BI-009
 * keeper-only iterate, BI-027 lightbox) under the then-standing "presentational
 * components go untested" convention — a convention the vitest include glob was
 * enforcing anyway until TEST-001.2 widened it.
 *
 * What is pinned here is the card's decision logic, not its styling: every
 * control is a *toggle* (clicking the active decision or the current star value
 * clears it), and `Iterate →` is gated on `kept` because approved is final. Those
 * are the branches a well-meaning refactor breaks silently.
 *
 * The real `ImagegenProvider` is mounted rather than stubbed: `ReviewGrid` renders
 * `ResolvedImage`, which throws outside a provider. It is safe to mount for real —
 * happy-dom exposes no `indexedDB`, so the handle restore resolves to `null`, and
 * these fixtures use `https:` URLs, which `resolveDisplayUrl` passes through
 * untouched. The overlay's own behaviour (arrow stepping, Escape) is TEST-002.4;
 * what this file covers is `ReviewGrid`'s own state — which image it opens.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';

import ReviewGrid from './ReviewGrid';
import { ImagegenProvider } from '@/lib/ImagegenContext';
import type { GeneratedImage, Iteration, ReviewDecision } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';

function makeImage(id: string, overrides: Partial<GeneratedImage> = {}): GeneratedImage {
  return {
    id,
    url: `https://example.test/${id}.png`,
    prompt: `prompt ${id}`,
    status: 'ready',
    decision: 'undecided',
    rating: 0,
    feedback: null,
    createdAt: NOW,
    ...overrides,
  };
}

function makeIteration(images: GeneratedImage[]): Iteration {
  return {
    id: 'it1',
    index: 0,
    prompt: 'base prompt',
    refImageIds: [],
    primaryRefImageId: null,
    images,
    createdAt: NOW,
  };
}

/**
 * Renders the grid under a real provider and drains the provider's mount-time
 * restore plus `ResolvedImage`'s resolve effect, so no state settles outside `act`.
 */
async function renderGrid(images: GeneratedImage[] = [makeImage('i1')]) {
  const onSetDecision = vi.fn();
  const onSetRating = vi.fn();
  const onFeedback = vi.fn();
  const onIterate = vi.fn();
  render(
    <ImagegenProvider>
      <ReviewGrid
        iteration={makeIteration(images)}
        onSetDecision={onSetDecision}
        onSetRating={onSetRating}
        onFeedback={onFeedback}
        onIterate={onIterate}
      />
    </ImagegenProvider>,
  );
  await act(async () => {});
  return { onSetDecision, onSetRating, onFeedback, onIterate };
}

const decisionButton = (label: string) => screen.getByRole('button', { name: label });
const star = (n: number) => screen.getByRole('radio', { name: `${n} star${n > 1 ? 's' : ''}` });

afterEach(() => {
  cleanup();
});

describe('ReviewGrid — decisions (BI-005)', () => {
  it('renders one card per image in the batch', async () => {
    await renderGrid([makeImage('i1'), makeImage('i2'), makeImage('i3')]);

    expect(screen.getAllByRole('button', { name: 'Keep' })).toHaveLength(3);
  });

  it.each<[string, ReviewDecision]>([
    ['Keep', 'kept'],
    ['Discard', 'discarded'],
    ['Approve', 'approved'],
  ])('reports %s as the %s decision', async (label, decision) => {
    const { onSetDecision } = await renderGrid();

    fireEvent.click(decisionButton(label));

    expect(onSetDecision).toHaveBeenCalledWith('i1', decision);
  });

  it.each<[string, ReviewDecision]>([
    ['Keep', 'kept'],
    ['Discard', 'discarded'],
    ['Approve', 'approved'],
  ])('clears back to undecided when %s is already active', async (label, decision) => {
    const { onSetDecision } = await renderGrid([makeImage('i1', { decision })]);

    fireEvent.click(decisionButton(label));

    expect(onSetDecision).toHaveBeenCalledWith('i1', 'undecided');
  });

  it('marks only the active decision pressed', async () => {
    await renderGrid([makeImage('i1', { decision: 'kept' })]);

    expect(decisionButton('Keep').getAttribute('aria-pressed')).toBe('true');
    expect(decisionButton('Discard').getAttribute('aria-pressed')).toBe('false');
    expect(decisionButton('Approve').getAttribute('aria-pressed')).toBe('false');
  });

  it.each<[ReviewDecision, string]>([
    ['kept', 'Kept'],
    ['discarded', 'Discarded'],
    ['approved', 'Approved'],
  ])('badges a %s card', async (decision, badge) => {
    await renderGrid([makeImage('i1', { decision })]);

    expect(screen.getByText(badge)).toBeTruthy();
  });

  it('badges nothing while the card is undecided', async () => {
    await renderGrid();

    for (const badge of ['Kept', 'Discarded', 'Approved']) {
      expect(screen.queryByText(badge)).toBeNull();
    }
  });
});

describe('ReviewGrid — rating (BI-005)', () => {
  it('reports the star that was clicked', async () => {
    const { onSetRating } = await renderGrid();

    fireEvent.click(star(4));

    expect(onSetRating).toHaveBeenCalledWith('i1', 4);
  });

  it('clears to unrated when the current value is clicked again', async () => {
    const { onSetRating } = await renderGrid([makeImage('i1', { rating: 3 })]);

    fireEvent.click(star(3));

    expect(onSetRating).toHaveBeenCalledWith('i1', 0);
  });

  it('re-rates rather than clearing when a different star is clicked', async () => {
    const { onSetRating } = await renderGrid([makeImage('i1', { rating: 3 })]);

    fireEvent.click(star(5));

    expect(onSetRating).toHaveBeenCalledWith('i1', 5);
  });

  it('checks only the star matching the current rating', async () => {
    await renderGrid([makeImage('i1', { rating: 2 })]);

    expect(star(2).getAttribute('aria-checked')).toBe('true');
    expect(star(1).getAttribute('aria-checked')).toBe('false');
    expect(star(3).getAttribute('aria-checked')).toBe('false');
  });
});

describe('ReviewGrid — feedback (BI-006)', () => {
  it('requests feedback for the card that was clicked', async () => {
    const { onFeedback } = await renderGrid([makeImage('i1'), makeImage('i2')]);

    fireEvent.click(screen.getAllByRole('button', { name: 'Feedback' })[1]!);

    expect(onFeedback).toHaveBeenCalledWith('i2');
  });

  it('flips the label and exposes saved feedback as a tooltip', async () => {
    await renderGrid([
      makeImage('i1', {
        feedback: { text: 'warmer light', useAsReference: false, updatedAt: NOW },
      }),
    ]);

    expect(screen.queryByRole('button', { name: 'Feedback' })).toBeNull();
    const edit = screen.getByRole('button', { name: '💬 Edit feedback' });
    expect(edit.getAttribute('title')).toBe('warmer light');
  });

  it('notes the reference promotion in the tooltip', async () => {
    await renderGrid([
      makeImage('i1', {
        feedback: { text: 'warmer light', useAsReference: true, updatedAt: NOW },
      }),
    ]);

    expect(screen.getByRole('button', { name: '💬 Edit feedback' }).getAttribute('title')).toBe(
      'warmer light\n\n(use as reference)',
    );
  });
});

describe('ReviewGrid — iterate (BI-009)', () => {
  it('offers Iterate on a keeper and reports it', async () => {
    const { onIterate } = await renderGrid([makeImage('i1', { decision: 'kept' })]);

    fireEvent.click(screen.getByRole('button', { name: 'Iterate →' }));

    expect(onIterate).toHaveBeenCalledWith('i1');
  });

  it.each<ReviewDecision>(['undecided', 'discarded', 'approved'])(
    'withholds Iterate on a %s card',
    async (decision) => {
      await renderGrid([makeImage('i1', { decision })]);

      expect(screen.queryByRole('button', { name: 'Iterate →' })).toBeNull();
    },
  );
});

describe('ReviewGrid — lightbox wiring (BI-027)', () => {
  it('opens no lightbox until a thumbnail is clicked', async () => {
    await renderGrid();

    expect(screen.queryByRole('dialog', { name: 'Image viewer' })).toBeNull();
  });

  it('opens the lightbox on the image whose thumbnail was clicked', async () => {
    await renderGrid([makeImage('i1'), makeImage('i2'), makeImage('i3')]);

    await act(async () => {
      fireEvent.click(screen.getAllByRole('button', { name: 'View full size' })[2]!);
    });

    const dialog = screen.getByRole('dialog', { name: 'Image viewer' });
    expect(within(dialog).getByAltText('prompt i3')).toBeTruthy();
  });

  it('closes the lightbox again', async () => {
    await renderGrid();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'View full size' }));
    });
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(screen.queryByRole('dialog', { name: 'Image viewer' })).toBeNull();
  });
});
