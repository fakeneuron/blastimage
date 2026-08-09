/**
 * Lightbox tests (TEST-002.4)
 *
 * `lib/lightbox.test.ts` already covers `stepIndex` in isolation. What is pinned
 * here is everything the *component* adds on top of it and that unit test cannot
 * see: that all four navigation entry points (ArrowLeft/ArrowRight on `window`,
 * the two nav buttons) call it with the right arguments, that the listener is torn
 * down on unmount, that the `multiple` gate hides nav chrome for a single image,
 * and that a click on the figure does not fall through to the backdrop's close.
 *
 * Stepping clamps rather than wraps — BI-027 chose that deliberately ("predictable
 * for a triage pass"), so the two clamp tests guard a decision, not an accident.
 *
 * `Lightbox` is *controlled* (`index` is a prop, not state), so stepping tests
 * assert on the `onIndexChange` spy rather than on a re-render.
 *
 * The real `ImagegenProvider` is mounted rather than stubbed, per TEST-002.2:
 * `Lightbox` renders `ResolvedImage`, which throws outside a provider, and mounting
 * it for real is safe — happy-dom exposes no `indexedDB`, so the handle restore
 * resolves to `null`, and these fixtures use `https:` URLs, which
 * `resolveDisplayUrl` passes through untouched. The provider renders no DOM element
 * of its own, so the container's first child is the backdrop.
 *
 * Focus behaviour is deliberately absent from this file: `Lightbox` has none to
 * test (no initial focus, no trap, no restore, despite `aria-modal="true"`). That
 * gap is filed as a11y work under BI-EPIC-035, not pinned here as if intended.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import Lightbox, { type LightboxImage } from './Lightbox';
import { ImagegenProvider } from '@/lib/ImagegenContext';

function makeImages(n: number): LightboxImage[] {
  return Array.from({ length: n }, (_, i) => ({
    src: `https://example.test/i${i + 1}.png`,
    alt: `prompt i${i + 1}`,
  }));
}

/**
 * Renders the overlay under a real provider and drains the provider's mount-time
 * restore plus `ResolvedImage`'s resolve effect, so no state settles outside `act`.
 */
async function renderLightbox(images: LightboxImage[] = makeImages(3), index = 1) {
  const onClose = vi.fn();
  const onIndexChange = vi.fn();
  const { container, unmount } = render(
    <ImagegenProvider>
      <Lightbox images={images} index={index} onClose={onClose} onIndexChange={onIndexChange} />
    </ImagegenProvider>,
  );
  await act(async () => {});
  return { container, unmount, onClose, onIndexChange };
}

const dialog = () => screen.getByRole('dialog', { name: 'Image viewer' });
const button = (name: string) => screen.getByRole('button', { name });

afterEach(() => {
  cleanup();
});

describe('Lightbox — keyboard stepping (BI-027)', () => {
  it('steps forward on ArrowRight', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(3), 1);

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('steps backward on ArrowLeft', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(3), 1);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('clamps at the first image instead of wrapping to the last', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(3), 0);

    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('clamps at the last image instead of wrapping to the first', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(3), 2);

    fireEvent.keyDown(window, { key: 'ArrowRight' });

    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('ignores keys it does not handle', async () => {
    const { onClose, onIndexChange } = await renderLightbox();

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', async () => {
    const { unmount, onClose, onIndexChange } = await renderLightbox();

    unmount();
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onIndexChange).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Lightbox — nav buttons (BI-027)', () => {
  it('steps forward from the Next button', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(3), 1);

    fireEvent.click(button('Next image'));

    expect(onIndexChange).toHaveBeenCalledWith(2);
  });

  it('steps backward from the Previous button', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(3), 1);

    fireEvent.click(button('Previous image'));

    expect(onIndexChange).toHaveBeenCalledWith(0);
  });

  it('disables Previous on the first image', async () => {
    await renderLightbox(makeImages(3), 0);

    expect((button('Previous image') as HTMLButtonElement).disabled).toBe(true);
    expect((button('Next image') as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables Next on the last image', async () => {
    await renderLightbox(makeImages(3), 2);

    expect((button('Next image') as HTMLButtonElement).disabled).toBe(true);
    expect((button('Previous image') as HTMLButtonElement).disabled).toBe(false);
  });

  it('does not close the overlay when stepping', async () => {
    const { onClose } = await renderLightbox(makeImages(3), 1);

    fireEvent.click(button('Next image'));
    fireEvent.click(button('Previous image'));

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Lightbox — closing (BI-027)', () => {
  it('closes on Escape', async () => {
    const { onClose } = await renderLightbox();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes on the Close button', async () => {
    const { onClose } = await renderLightbox();

    fireEvent.click(button('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  /**
   * Documents a live quirk rather than a contract: unlike the two nav buttons, the
   * Close button does not `stopPropagation`, so its click also reaches the backdrop
   * handler and `onClose` fires twice. Harmless today — both consumers implement
   * `onClose` as `setLightboxIndex(null)`, which is idempotent — but pinned so that
   * adding the missing `stopPropagation` shows up here as a deliberate change
   * instead of passing silently.
   */
  it('fires onClose twice from Close — the click also reaches the backdrop', async () => {
    const { onClose } = await renderLightbox();

    fireEvent.click(button('Close'));

    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('closes on a backdrop click', async () => {
    const { container, onClose } = await renderLightbox();

    fireEvent.click(container.firstChild as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when the image itself is clicked', async () => {
    const { onClose } = await renderLightbox();

    fireEvent.click(dialog());

    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('Lightbox — single-image sets (BI-027)', () => {
  it('hides the nav buttons and the counter', async () => {
    await renderLightbox(makeImages(1), 0);

    expect(screen.queryByRole('button', { name: 'Previous image' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Next image' })).toBeNull();
    expect(screen.queryByText('1 / 1')).toBeNull();
  });

  it('still offers Close', async () => {
    const { onClose } = await renderLightbox(makeImages(1), 0);

    fireEvent.click(button('Close'));

    expect(onClose).toHaveBeenCalled();
  });

  it('reports no movement when an arrow is pressed', async () => {
    const { onIndexChange } = await renderLightbox(makeImages(1), 0);

    fireEvent.keyDown(window, { key: 'ArrowRight' });
    fireEvent.keyDown(window, { key: 'ArrowLeft' });

    expect(onIndexChange).toHaveBeenNthCalledWith(1, 0);
    expect(onIndexChange).toHaveBeenNthCalledWith(2, 0);
  });
});

describe('Lightbox — rendering (BI-027)', () => {
  it('shows the image at the current index', async () => {
    await renderLightbox(makeImages(3), 2);

    expect(screen.getByAltText('prompt i3')).toBeTruthy();
    expect(screen.queryByAltText('prompt i1')).toBeNull();
  });

  it('counts the current position within the set', async () => {
    await renderLightbox(makeImages(4), 2);

    expect(screen.getByText('3 / 4')).toBeTruthy();
  });

  it('renders nothing for an empty set', async () => {
    await renderLightbox([], 0);

    expect(screen.queryByRole('dialog', { name: 'Image viewer' })).toBeNull();
  });

  it('renders nothing when the index is out of range', async () => {
    await renderLightbox(makeImages(2), 5);

    expect(screen.queryByRole('dialog', { name: 'Image viewer' })).toBeNull();
  });
});
