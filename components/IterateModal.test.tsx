/**
 * IterateModal tests (TEST-003)
 *
 * `IterateModal` (BI-009) seeds the next round from a single keeper. Two things
 * are worth pinning. First, the shared dialog chrome — the same four assertions
 * this task runs on `FeedbackModal`, `ImportBuilder`, and `DeleteTaskModal`
 * (Esc closes, the listener is torn down on unmount, the backdrop closes, the
 * dialog does not), replicated per component so a failure names the one that
 * broke.
 *
 * Second, `composePrompt`. It is module-private, so it is exercised through the
 * rendered textarea rather than directly — which is the right level anyway: what
 * matters is what the user sees prefilled and can edit. Its three shapes (base +
 * feedback joined by a `Refine:` line, either one alone) are the branches a
 * refactor collapses silently, and the empty case is what the submit gate exists
 * for.
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

import IterateModal from './IterateModal';
import { ImagegenProvider } from '@/lib/ImagegenContext';
import type { GeneratedImage } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';

function makeImage(feedbackText: string | null = null): GeneratedImage {
  return {
    id: 'i1',
    url: 'https://example.test/i1.png',
    prompt: 'a serene forest at dawn',
    status: 'ready',
    decision: 'kept',
    rating: 0,
    feedback:
      feedbackText === null ? null : { text: feedbackText, useAsReference: true, updatedAt: NOW },
    createdAt: NOW,
  };
}

/**
 * Renders the modal under a real provider and drains the provider's mount-time
 * restore plus `ResolvedImage`'s resolve effect, so no state settles outside `act`.
 */
async function renderModal(
  { basePrompt = 'a serene forest', feedbackText = null as string | null } = {},
) {
  const onClose = vi.fn();
  const onSubmit = vi.fn();
  const { container, unmount } = render(
    <ImagegenProvider>
      <IterateModal
        image={makeImage(feedbackText)}
        basePrompt={basePrompt}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </ImagegenProvider>,
  );
  await act(async () => {});
  return { container, unmount, onClose, onSubmit };
}

const dialog = () => screen.getByRole('dialog', { name: 'Iterate from keeper' });
const button = (name: string) => screen.getByRole('button', { name });
const promptBox = () => screen.getByLabelText(/Refined prompt/i) as HTMLTextAreaElement;
const submitButton = () => button('Save selection request') as HTMLButtonElement;

afterEach(() => {
  cleanup();
});

describe('IterateModal — dialog chrome (BI-009)', () => {
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

  it('closes on Cancel without requesting a round', async () => {
    const { onClose, onSubmit } = await renderModal();

    fireEvent.click(button('Cancel'));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('IterateModal — prompt prefill (BI-009)', () => {
  it('appends the feedback as an explicit Refine line when both are present', async () => {
    await renderModal({ basePrompt: 'a serene forest', feedbackText: 'warmer lighting' });

    expect(promptBox().value).toBe('a serene forest\n\nRefine: warmer lighting');
  });

  it('uses the base prompt alone when the keeper carries no feedback', async () => {
    await renderModal({ basePrompt: 'a serene forest', feedbackText: null });

    expect(promptBox().value).toBe('a serene forest');
  });

  it('uses the feedback alone when the task has no base prompt', async () => {
    await renderModal({ basePrompt: '', feedbackText: 'warmer lighting' });

    expect(promptBox().value).toBe('warmer lighting');
  });

  it('trims both parts before composing', async () => {
    await renderModal({ basePrompt: '  a serene forest  ', feedbackText: '  warmer lighting  ' });

    expect(promptBox().value).toBe('a serene forest\n\nRefine: warmer lighting');
  });

  it('starts empty when neither part has content', async () => {
    await renderModal({ basePrompt: '   ', feedbackText: '   ' });

    expect(promptBox().value).toBe('');
  });
});

describe('IterateModal — submit gate (BI-009)', () => {
  it('reports the edited prompt, trimmed', async () => {
    const { onSubmit } = await renderModal();

    fireEvent.change(promptBox(), { target: { value: '  a stormy forest at dusk  ' } });
    fireEvent.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith('a stormy forest at dusk');
  });

  it('reports the prefilled prompt when the user edits nothing', async () => {
    const { onSubmit } = await renderModal({
      basePrompt: 'a serene forest',
      feedbackText: 'warmer lighting',
    });

    fireEvent.click(submitButton());

    expect(onSubmit).toHaveBeenCalledWith('a serene forest\n\nRefine: warmer lighting');
  });

  it('disables submit when there is no prompt to send', async () => {
    await renderModal({ basePrompt: '', feedbackText: null });

    expect(submitButton().disabled).toBe(true);
  });

  it('disables submit once the user blanks the prompt', async () => {
    await renderModal();

    expect(submitButton().disabled).toBe(false);
    fireEvent.change(promptBox(), { target: { value: '   ' } });

    expect(submitButton().disabled).toBe(true);
  });

  it('does not close on its own — the parent owns dismissal', async () => {
    const { onClose } = await renderModal();

    fireEvent.click(submitButton());

    expect(onClose).not.toHaveBeenCalled();
  });
});
