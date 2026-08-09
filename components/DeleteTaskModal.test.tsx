/**
 * DeleteTaskModal tests (BI-033).
 *
 * The modal exists because the cleanup is a *third* choice `window.confirm`
 * cannot express, so the thing worth pinning is the gating: when the checkbox
 * is offered, and what `onConfirm` reports. The consequence prose is asserted
 * only where it is load-bearing (the rounds and the filenames the user is
 * deciding about).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import DeleteTaskModal from './DeleteTaskModal';
import type { DeleteSlugBreak } from '@/lib/workspace';

const JOINED: DeleteSlugBreak = {
  slug: 'hero-banner',
  rounds: [1, 2],
  approvedFilenames: ['hero-banner-001.jpg'],
};

function renderModal(overrides: Partial<React.ComponentProps<typeof DeleteTaskModal>> = {}) {
  const onConfirm = vi.fn();
  const onClose = vi.fn();
  const { container, unmount } = render(
    <DeleteTaskModal
      taskName="Hero banner"
      risk={null}
      imagegenLinked={false}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onClose, container, unmount };
}

/**
 * Stands in for the control that opened the modal: something outside the render
 * tree holding focus at mount, so the restore-on-close path has a real target.
 */
function mountOpener() {
  const opener = document.createElement('button');
  opener.dataset.opener = '';
  document.body.appendChild(opener);
  opener.focus();
  return opener;
}

const deleteButton = () => screen.getByRole('button', { name: 'Delete task' });
const cancelButton = () => screen.getByRole('button', { name: 'Cancel' });
const cleanupBox = () => screen.queryByRole('checkbox');
const dialog = () => screen.getByRole('dialog', { name: 'Delete task' });

afterEach(() => {
  cleanup();
  document.querySelectorAll('[data-opener]').forEach((el) => el.remove());
});

describe('DeleteTaskModal (BI-033)', () => {
  it('is a plain confirmation for a task with nothing on disk', () => {
    const { onConfirm } = renderModal();

    expect(screen.getByText('This cannot be undone.')).toBeTruthy();
    expect(cleanupBox()).toBeNull();

    fireEvent.click(deleteButton());
    expect(onConfirm).toHaveBeenCalledWith({ removeApproved: false });
  });

  it('names the slug, the joined rounds, and the stranded approved copies', () => {
    renderModal({ risk: JOINED, imagegenLinked: true });

    expect(screen.getByText('r1, r2')).toBeTruthy();
    expect(screen.getByText('“hero-banner”')).toBeTruthy();
    expect(screen.getByText(/hero-banner-001\.jpg/)).toBeTruthy();
  });

  it('reports the cleanup only once the user opts in', () => {
    const { onConfirm } = renderModal({ risk: JOINED, imagegenLinked: true });

    // Offered, but off by default — it deletes files from the user's repo.
    const box = cleanupBox()!;
    expect((box as HTMLInputElement).checked).toBe(false);

    fireEvent.click(deleteButton());
    expect(onConfirm).toHaveBeenCalledWith({ removeApproved: false });

    fireEvent.click(box);
    fireEvent.click(deleteButton());
    expect(onConfirm).toHaveBeenLastCalledWith({ removeApproved: true });
  });

  it('withholds the cleanup offer while the imagegen folder is unlinked', () => {
    const { onConfirm } = renderModal({ risk: JOINED, imagegenLinked: false });

    expect(cleanupBox()).toBeNull();
    expect(screen.getByText(/Link your imagegen folder first/)).toBeTruthy();

    fireEvent.click(deleteButton());
    expect(onConfirm).toHaveBeenCalledWith({ removeApproved: false });
  });

  it('withholds the cleanup offer when the task promoted nothing', () => {
    renderModal({
      risk: { ...JOINED, approvedFilenames: [] },
      imagegenLinked: true,
    });

    expect(cleanupBox()).toBeNull();
    // The other two consequences are still stated.
    expect(screen.getByText('r1, r2')).toBeTruthy();
  });

  it('dismisses without deleting on Cancel and on Esc', () => {
    const { onConfirm, onClose } = renderModal({ risk: JOINED, imagegenLinked: true });

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onConfirm).not.toHaveBeenCalled();
  });
});

/**
 * The chrome this modal shares with `FeedbackModal` / `IterateModal` /
 * `ImportBuilder` (TEST-003). The Esc half is covered above; these are the two
 * halves that were missing — the listener teardown TEST-002.4 proved worth
 * pinning, and the backdrop's close-vs-stopPropagation split.
 */
describe('DeleteTaskModal — dialog chrome (TEST-003)', () => {
  it('stops listening once unmounted', () => {
    const { unmount, onClose } = renderModal();

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('ignores keys it does not handle', () => {
    const { onClose } = renderModal();

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click without deleting', () => {
    const { container, onClose, onConfirm } = renderModal();

    fireEvent.click(container.firstChild as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('stays open when the dialog itself is clicked', () => {
    const { onClose } = renderModal();

    fireEvent.click(dialog());

    expect(onClose).not.toHaveBeenCalled();
  });
});

/**
 * Focus management (BI-039) — shared `useFocusTrap`. Plain confirm (no cleanup
 * checkbox) has DOM order Cancel → Delete. The cleanup checkbox, when offered,
 * is first.
 */
describe('DeleteTaskModal — focus management (BI-039)', () => {
  it('moves focus to Cancel on open for a plain confirm', () => {
    renderModal();

    expect(document.activeElement).toBe(cancelButton());
  });

  it('moves focus to the cleanup checkbox when it is offered', () => {
    renderModal({ risk: JOINED, imagegenLinked: true });

    expect(document.activeElement).toBe(cleanupBox());
  });

  it('restores focus to the opener on close', () => {
    const opener = mountOpener();
    const { unmount } = renderModal();
    expect(document.activeElement).not.toBe(opener);

    unmount();

    expect(document.activeElement).toBe(opener);
  });

  it('cycles forward through Cancel and Delete and wraps', () => {
    renderModal();
    expect(document.activeElement).toBe(cancelButton());

    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(deleteButton());
    fireEvent.keyDown(window, { key: 'Tab' });
    expect(document.activeElement).toBe(cancelButton());
  });

  it('claims the Tab key while the trap is active', () => {
    renderModal();

    expect(fireEvent.keyDown(window, { key: 'Tab' })).toBe(false);
  });
});
