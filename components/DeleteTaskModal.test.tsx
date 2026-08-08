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
  render(
    <DeleteTaskModal
      taskName="Hero banner"
      risk={null}
      imagegenLinked={false}
      onClose={onClose}
      onConfirm={onConfirm}
      {...overrides}
    />,
  );
  return { onConfirm, onClose };
}

const deleteButton = () => screen.getByRole('button', { name: 'Delete task' });
const cleanupBox = () => screen.queryByRole('checkbox');

afterEach(() => {
  cleanup();
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
