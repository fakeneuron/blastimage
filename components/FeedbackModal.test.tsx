/**
 * FeedbackModal tests (TEST-003)
 *
 * `FeedbackModal` (BI-006) is one of four modals sharing the same chrome — a
 * `window` keydown listener for Esc plus a backdrop that closes on click while
 * the dialog stops propagation. TEST-002.4 proved that shape worth pinning on
 * `Lightbox`: a listener that outlives its component keeps firing `onClose` on a
 * closed dialog, and nothing in the UI shows it. The same four assertions run
 * here, in `IterateModal.test.tsx`, `ImportBuilder.test.tsx`, and
 * `DeleteTaskModal.test.tsx` — replicated rather than hoisted into a shared
 * helper, so a failure names the component that broke.
 *
 * Beyond the chrome, what is pinned is that all three submit paths report the
 * *same* feedback payload and differ only in their action tag: `save` persists
 * feedback, `keep` also promotes to keeper, `approve` is the quick path. A
 * refactor that swaps two of those tags is silent in the UI.
 *
 * The real `ImagegenProvider` is mounted rather than stubbed, per TEST-002.2:
 * the modal renders `ResolvedImage`, which throws outside a provider. Safe to
 * mount for real — happy-dom exposes no `indexedDB`, so the handle restore
 * resolves to `null`, and these fixtures use `https:` URLs, which
 * `resolveDisplayUrl` passes through untouched. The provider renders no DOM
 * element of its own, so the container's first child is the backdrop.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import FeedbackModal from './FeedbackModal';
import { ImagegenProvider } from '@/lib/ImagegenContext';
import type { GeneratedImage } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';

function makeImage(overrides: Partial<GeneratedImage> = {}): GeneratedImage {
  return {
    id: 'i1',
    url: 'https://example.test/i1.png',
    prompt: 'a serene forest at dawn',
    status: 'ready',
    decision: 'undecided',
    rating: 0,
    feedback: null,
    createdAt: NOW,
    ...overrides,
  };
}

/**
 * Renders the modal under a real provider and drains the provider's mount-time
 * restore plus `ResolvedImage`'s resolve effect, so no state settles outside `act`.
 */
async function renderModal(image: GeneratedImage = makeImage()) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  const { container, unmount } = render(
    <ImagegenProvider>
      <FeedbackModal image={image} onClose={onClose} onSubmit={onSubmit} />
    </ImagegenProvider>,
  );
  await act(async () => {});
  return { container, unmount, onClose, onSubmit };
}

const dialog = () => screen.getByRole('dialog', { name: 'Image feedback' });
const button = (name: string) => screen.getByRole('button', { name });
const notes = () => screen.getByLabelText(/Refinement notes/i) as HTMLTextAreaElement;
const refBox = () => screen.getByRole('checkbox') as HTMLInputElement;

afterEach(() => {
  cleanup();
});

describe('FeedbackModal — dialog chrome (BI-006)', () => {
  it('closes on Escape', async () => {
    const { onClose } = await renderModal();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores keys it does not handle', async () => {
    const { onClose } = await renderModal();

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', async () => {
    const { unmount, onClose } = await renderModal();

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click', async () => {
    const { container, onClose } = await renderModal();

    fireEvent.click(container.firstChild as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when the dialog itself is clicked', async () => {
    const { onClose } = await renderModal();

    fireEvent.click(dialog());

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on Cancel without submitting', async () => {
    const { onClose, onSubmit } = await renderModal();

    fireEvent.click(button('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('FeedbackModal — prefill (BI-006)', () => {
  it('starts empty for an image with no feedback', async () => {
    await renderModal();

    expect(notes().value).toBe('');
    expect(refBox().checked).toBe(false);
  });

  it('prefills both fields from saved feedback', async () => {
    await renderModal(
      makeImage({ feedback: { text: 'warmer lighting', useAsReference: true, updatedAt: NOW } }),
    );

    expect(notes().value).toBe('warmer lighting');
    expect(refBox().checked).toBe(true);
  });
});

describe('FeedbackModal — submit paths (BI-006)', () => {
  it('Save reports the feedback with the save action', async () => {
    const { onSubmit } = await renderModal();

    fireEvent.change(notes(), { target: { value: 'tighter crop' } });
    fireEvent.click(button('Save'));

    expect(onSubmit).toHaveBeenCalledWith({ text: 'tighter crop', useAsReference: false }, 'save');
  });

  it('Save & Keep reports the same payload with the keep action', async () => {
    const { onSubmit } = await renderModal();

    fireEvent.change(notes(), { target: { value: 'tighter crop' } });
    fireEvent.click(button('Save & Keep'));

    expect(onSubmit).toHaveBeenCalledWith({ text: 'tighter crop', useAsReference: false }, 'keep');
  });

  it('Approve reports the same payload with the approve action', async () => {
    const { onSubmit } = await renderModal();

    fireEvent.change(notes(), { target: { value: 'tighter crop' } });
    fireEvent.click(button('Approve'));

    expect(onSubmit).toHaveBeenCalledWith({ text: 'tighter crop', useAsReference: false }, 'approve');
  });

  it('trims the typed notes before reporting them', async () => {
    const { onSubmit } = await renderModal();

    fireEvent.change(notes(), { target: { value: '   warmer lighting   ' } });
    fireEvent.click(button('Save'));

    expect(onSubmit).toHaveBeenCalledWith({ text: 'warmer lighting', useAsReference: false }, 'save');
  });

  it('carries the reference flag as toggled', async () => {
    const { onSubmit } = await renderModal();

    fireEvent.click(refBox());
    fireEvent.click(button('Save'));

    expect(onSubmit).toHaveBeenCalledWith({ text: '', useAsReference: true }, 'save');
  });

  it('does not close on its own — the parent owns dismissal', async () => {
    const { onClose } = await renderModal();

    fireEvent.click(button('Save'));

    expect(onClose).not.toHaveBeenCalled();
  });
});
