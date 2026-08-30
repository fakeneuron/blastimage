/**
 * ImagegenLinkModal tests (BI-046).
 *
 * The picker replaces a `window.prompt` that could only take a typed path, so
 * what is worth pinning is the three ways a folder now gets named — a detected
 * shortcut, a browsed directory, a typed fallback — plus the reason the modal
 * exists at all: a bad path reports inside the dialog and leaves it open,
 * which a prompt could not do.
 *
 * BI-047 added a second thing that reports in place: a folder another project
 * already owns, which offers to switch to that project instead of linking.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import ImagegenLinkModal from './ImagegenLinkModal';
import type { DirectoryListing } from '@/lib/imagegenServerFs';
import type { Result } from '@/lib/storage';
import type { LinkOutcome } from '@/lib/useWorkspace';

const HOME: DirectoryListing = {
  path: '/home/dev',
  parent: '/home',
  entries: [
    { name: 'Code', path: '/home/dev/Code', recognized: false },
    { name: 'imagegen', path: '/home/dev/imagegen', recognized: true },
  ],
};

const CODE: DirectoryListing = {
  path: '/home/dev/Code',
  parent: '/home/dev',
  entries: [],
};

/** Serves `HOME` for no path, and any listing keyed by path. */
function browser(listings: DirectoryListing[] = [HOME, CODE]) {
  return vi.fn(
    async (path?: string): Promise<Result<DirectoryListing>> => {
      const found = path ? listings.find((l) => l.path === path) : listings[0];
      return found ? { ok: true, value: found } : { ok: false, error: `No such folder: ${path}` };
    },
  );
}

function renderModal(
  overrides: Partial<React.ComponentProps<typeof ImagegenLinkModal>> = {},
) {
  const onBrowse = overrides.onBrowse ?? browser();
  const onSuggest = overrides.onSuggest ?? vi.fn(async () => ['/repo/imagegen']);
  const onLink =
    overrides.onLink ?? vi.fn(async (): Promise<LinkOutcome> => ({ status: 'linked' }));
  const onSwitchProject = overrides.onSwitchProject ?? vi.fn();
  const onClose = overrides.onClose ?? vi.fn();
  render(
    <ImagegenLinkModal
      onBrowse={onBrowse}
      onSuggest={onSuggest}
      onLink={onLink}
      onSwitchProject={onSwitchProject}
      onClose={onClose}
    />,
  );
  return { onBrowse, onSuggest, onLink, onSwitchProject, onClose };
}

const dialog = () => screen.getByRole('dialog', { name: 'Link imagegen folder' });

afterEach(cleanup);

describe('naming a folder', () => {
  it('links a detected shortcut in one click', async () => {
    const { onLink, onClose } = renderModal();

    const shortcut = await screen.findByRole('button', { name: '📁 /repo/imagegen' });
    fireEvent.click(shortcut);

    await waitFor(() => expect(onLink).toHaveBeenCalledWith('/repo/imagegen'));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it('browses into a folder and links where it lands', async () => {
    const { onBrowse, onLink } = renderModal();

    await screen.findByRole('button', { name: /Code/ });
    fireEvent.click(screen.getByRole('button', { name: /Code/ }));
    await waitFor(() => expect(onBrowse).toHaveBeenCalledWith('/home/dev/Code'));

    fireEvent.click(screen.getByRole('button', { name: 'Link this folder' }));

    await waitFor(() => expect(onLink).toHaveBeenCalledWith('/home/dev/Code'));
  });

  it('navigates up to the parent the listing reports', async () => {
    const onBrowse = browser([HOME, CODE, { path: '/home', parent: '/', entries: [] }]);
    renderModal({ onBrowse });

    await screen.findByText('/home/dev');
    fireEvent.click(screen.getByRole('button', { name: '↑ Up' }));

    await waitFor(() => expect(onBrowse).toHaveBeenCalledWith('/home'));
  });

  it('keeps a typed absolute path as the fallback', async () => {
    const { onLink } = renderModal();

    await screen.findByText('/home/dev');
    fireEvent.change(screen.getByLabelText('Or type an absolute path'), {
      target: { value: '  /elsewhere/imagegen  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link path' }));

    await waitFor(() => expect(onLink).toHaveBeenCalledWith('/elsewhere/imagegen'));
  });

  it('badges an entry the server recognized as an imagegen root', async () => {
    renderModal();

    const entry = await screen.findByRole('button', { name: /📁 imagegen/ });
    // The badge is a second "imagegen" inside the entry button; the bare tree
    // row would carry only the folder name.
    expect(entry.textContent).toBe('📁 imagegenimagegen');
  });
});

describe('failures stay inside the dialog', () => {
  it('shows a link failure and does not close', async () => {
    const onLink = vi.fn(
      async (): Promise<LinkOutcome> => ({ status: 'error', message: 'No such folder: /nope' }),
    );
    const { onClose } = renderModal({ onLink });

    await screen.findByText('/home/dev');
    fireEvent.change(screen.getByLabelText('Or type an absolute path'), {
      target: { value: '/nope' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link path' }));

    expect((await screen.findByRole('alert')).textContent).toBe('No such folder: /nope');
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog()).toBeTruthy();
  });

  it('shows a browse failure without losing the listing already on screen', async () => {
    const onBrowse = browser([HOME]);
    renderModal({ onBrowse });

    await screen.findByText('/home/dev');
    fireEvent.click(screen.getByRole('button', { name: /Code/ }));

    expect((await screen.findByRole('alert')).textContent).toBe(
      'No such folder: /home/dev/Code',
    );
    expect(screen.getByText('/home/dev')).toBeTruthy();
  });
});

describe('dismissal (BI-039 idiom)', () => {
  it('closes on Cancel and on Escape without linking', async () => {
    const { onClose, onLink } = renderModal();
    await screen.findByText('/home/dev');

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(2);
    expect(onLink).not.toHaveBeenCalled();
  });

  it('traps focus inside the dialog on open', async () => {
    renderModal();
    await screen.findByText('/home/dev');

    expect(dialog().contains(document.activeElement)).toBe(true);
  });
});

/**
 * The collision BI-047 exists to make visible: two projects cannot share one
 * `imagegen/` folder, because whichever loaded a round would ingest the other's
 * images. The picker names the owner and offers to open it — nothing is linked.
 */
describe('a folder another project owns (BI-047)', () => {
  const owned = vi.fn(
    async (): Promise<LinkOutcome> => ({
      status: 'owned',
      ownerId: 'p2',
      ownerName: 'spinalcord',
      root: '/repo/imagegen',
    }),
  );

  it('names the owning project and stays open instead of linking', async () => {
    const { onClose } = renderModal({ onLink: owned });

    fireEvent.click(await screen.findByRole('button', { name: '📁 /repo/imagegen' }));

    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('/repo/imagegen');
    expect(alert.textContent).toContain('spinalcord');
    expect(onClose).not.toHaveBeenCalled();
    expect(dialog()).toBeTruthy();
  });

  it('switches to the owning project and closes when offered', async () => {
    const { onSwitchProject, onClose } = renderModal({ onLink: owned });

    fireEvent.click(await screen.findByRole('button', { name: '📁 /repo/imagegen' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Switch to “spinalcord”' }));

    expect(onSwitchProject).toHaveBeenCalledWith('p2');
    expect(onClose).toHaveBeenCalled();
  });

  it('clears the offer when a later pick fails outright', async () => {
    const onLink = vi
      .fn<(path: string) => Promise<LinkOutcome>>()
      .mockResolvedValueOnce({
        status: 'owned',
        ownerId: 'p2',
        ownerName: 'spinalcord',
        root: '/repo/imagegen',
      })
      .mockResolvedValueOnce({ status: 'error', message: 'No such folder: /nope' });
    renderModal({ onLink });

    fireEvent.click(await screen.findByRole('button', { name: '📁 /repo/imagegen' }));
    await screen.findByRole('button', { name: 'Switch to “spinalcord”' });

    fireEvent.change(screen.getByLabelText('Or type an absolute path'), {
      target: { value: '/nope' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Link path' }));

    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Switch to “spinalcord”' })).toBeNull(),
    );
    expect((await screen.findByRole('alert')).textContent).toBe('No such folder: /nope');
  });
});
