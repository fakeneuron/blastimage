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
 * Focus behaviour was absent when this file was written and is now covered (BI-035.5
 * gave the overlay initial focus, a Tab trap, and restore-on-close, backing the
 * `aria-modal="true"` it had always declared). That task also moved the three
 * controls inside the `<figure role="dialog">` so the modal container holds what it
 * owns — which is why the Close button no longer double-fires; see the closing block.
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

/**
 * Stands in for the thumbnail that opened the overlay: something outside the render
 * tree holding focus at mount, so the restore-on-close path has a real target.
 */
function mountOpener() {
  const opener = document.createElement('button');
  opener.dataset.opener = '';
  document.body.appendChild(opener);
  opener.focus();
  return opener;
}

const dialog = () => screen.getByRole('dialog', { name: 'Image viewer' });
const button = (name: string) => screen.getByRole('button', { name });

afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-opener]').forEach((el) => el.remove());
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
   * This asserted `2` until BI-035.5, documenting a quirk: the Close button carried
   * no `stopPropagation` of its own, so its click also reached the backdrop handler.
   * BI-035.5 moved the controls inside the `<figure>` to give the focus trap a
   * boundary that matches `aria-modal`, and the figure's existing `stopPropagation`
   * now covers Close too. The double-fire is gone as a side effect — the deliberate
   * change the old pin existed to surface, recorded here rather than passing silently.
   */
  it('fires onClose once from Close — the figure stops the click reaching the backdrop', async () => {
    const { onClose } = await renderLightbox();

    fireEvent.click(button('Close'));

    expect(onClose).toHaveBeenCalledTimes(1);
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

/**
 * The overlay declared `role="dialog" aria-modal="true"` from BI-027 onward but
 * enforced none of it until BI-035.5. Tab is *managed* here — the handler picks the
 * next target and calls `preventDefault()` rather than delegating to the browser's
 * sequential navigation — which is both why these assertions can run at all
 * (happy-dom implements no sequential focus navigation) and why the wrap cases below
 * are contract rather than incidental browser behaviour.
 *
 * DOM order inside the dialog is Close → Previous → Next; the visual positions are
 * `absolute` and unrelated to it.
 */
describe('Lightbox — focus management (BI-035.5)', () => {
  it('moves focus to the dialog on open', async () => {
    await renderLightbox();

    expect(document.activeElement).toBe(dialog());
  });

  it('restores focus to the opener on close', async () => {
    const opener = mountOpener();
    const { unmount } = await renderLightbox();
    expect(document.activeElement).not.toBe(opener);

    unmount();

    expect(document.activeElement).toBe(opener);
  });

  it('enters the control set on the first Tab', async () => {
    await renderLightbox();

    fireEvent.keyDown(window, { key: 'Tab' });

    expect(document.activeElement).toBe(button('Close'));
  });

  it('cycles forward through the controls and wraps at the end', async () => {
    await renderLightbox(makeImages(3), 1);

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(button('Close'));
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(button('Previous image'));
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(button('Next image'));
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(button('Close'));
  });

  it('enters at the last control on a backward Tab from the dialog', async () => {
    await renderLightbox(makeImages(3), 1);

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(button('Next image'));
  });

  it('wraps backward from the first control to the last', async () => {
    await renderLightbox(makeImages(3), 1);
    fireEvent.keyDown(window, { key: 'Tab' });

    fireEvent.keyDown(window, { key: 'Tab', shiftKey: true });

    expect(document.activeElement).toBe(button('Next image'));
  });

  it('skips a nav button that is disabled at the end of the set', async () => {
    await renderLightbox(makeImages(3), 0);

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(button('Close'));
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(document.activeElement).toBe(button('Next image'));
  });

  it('holds focus on Close for a single-image set', async () => {
    await renderLightbox(makeImages(1), 0);

    fireEvent.keyDown(window, { key: 'Tab' });
    fireEvent.keyDown(window, { key: 'Tab' });

    expect(document.activeElement).toBe(button('Close'));
  });

  it('claims the Tab key while the trap is active', async () => {
    await renderLightbox();

    // `fireEvent` reports the dispatch result: false once preventDefault ran.
    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(false);
  });

  /**
   * The overlay renders nothing for an empty or out-of-range set, but the keydown
   * listener is bound before that guard — so the trap has to stand down rather than
   * swallow Tab for whatever is still on the page behind it.
   */
  it('leaves Tab alone when there is no dialog to trap it in', async () => {
    const opener = mountOpener();
    await renderLightbox([], 0);

    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(true);
    expect(document.activeElement).toBe(opener);
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
