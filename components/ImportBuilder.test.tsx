/**
 * ImportBuilder tests (TEST-002.6)
 *
 * `ImportBuilder` (BI-021.3) composes a `tasks.json` from pasted prompts or
 * uploaded `.txt` files, lets the drafts be edited/removed, then downloads the
 * result. The pure functions it calls (`parsePastedPrompts`,
 * `serializeTaskImport`) are already unit-tested in `lib/storage.test.ts`; what
 * is untested is the component gluing them to the UI — paste/upload → rows,
 * row edit/remove, and the download validation gates.
 *
 * The dialog chrome (Esc, listener teardown, backdrop-vs-dialog click) was out
 * of scope for TEST-002.6, which named the "parse/compose paths" risk only and
 * deferred the chrome as a real gap. TEST-003 picked it up: the block below runs
 * the same four assertions here as on `FeedbackModal`, `IterateModal`, and
 * `DeleteTaskModal`, replicated per component so a failure names the one that
 * broke.
 *
 * No `ImagegenProvider` needed — this component renders no images at all.
 * The download test reuses the `URL.createObjectURL` /
 * `HTMLAnchorElement.prototype.click` stub idiom from `lib/storage.test.ts`
 * (`downloadTaskImport` → `downloadBlob`, the same seam that idiom covers).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import ImportBuilder from './ImportBuilder';
import type { TaskImportDraft } from '@/lib/storage';

function renderBuilder() {
  const onClose = vi.fn();
  const { container, unmount } = render(<ImportBuilder onClose={onClose} />);
  return { onClose, container, unmount };
}

function pasteTextarea() {
  return screen.getByLabelText(/Paste prompts/i) as HTMLTextAreaElement;
}

function addFromPasteButton() {
  return screen.getByRole('button', { name: 'Add from paste' });
}

function downloadButton() {
  return screen.getByRole('button', { name: 'Download tasks.json' }) as HTMLButtonElement;
}

function nameInputs() {
  return screen.queryAllByPlaceholderText('task name') as HTMLInputElement[];
}

function promptInputs() {
  return screen.queryAllByPlaceholderText('base prompt (may be empty)') as HTMLTextAreaElement[];
}

function removeButtons() {
  return screen.queryAllByTitle('Remove task') as HTMLButtonElement[];
}

function txtInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

/** Stubs the download path and returns the filenames + blobs handed to `downloadBlob`. */
function captureDownloads() {
  const names: string[] = [];
  const blobs: Blob[] = [];
  vi.stubGlobal('URL', {
    createObjectURL: vi.fn((blob: Blob) => {
      blobs.push(blob);
      return 'blob:x';
    }),
    revokeObjectURL: vi.fn(),
  });
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
    this: HTMLAnchorElement,
  ) {
    names.push(this.download);
  });
  return { names, blobs };
}

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('ImportBuilder — dialog chrome (TEST-003)', () => {
  it('closes on Escape', () => {
    const { onClose } = renderBuilder();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('ignores keys it does not handle', () => {
    const { onClose } = renderBuilder();

    fireEvent.keyDown(window, { key: 'a' });
    fireEvent.keyDown(window, { key: 'Enter' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('stops listening once unmounted', () => {
    const { unmount, onClose } = renderBuilder();

    unmount();
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on a backdrop click', () => {
    const { container, onClose } = renderBuilder();

    fireEvent.click(container.firstChild as HTMLElement);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('stays open when the dialog itself is clicked', () => {
    const { onClose } = renderBuilder();

    fireEvent.click(screen.getByRole('dialog', { name: 'Build task-import file' }));

    expect(onClose).not.toHaveBeenCalled();
  });

  it('closes on the Close button without emitting a file', () => {
    const { onClose } = renderBuilder();
    const { names } = captureDownloads();

    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(names).toHaveLength(0);
  });
});

describe('ImportBuilder — paste (BI-021.3)', () => {
  it('adds one row per pasted block and clears the paste textarea', () => {
    renderBuilder();

    fireEvent.change(pasteTextarea(), { target: { value: 'A serene forest.\n\nA flat-vector body map.' } });
    fireEvent.click(addFromPasteButton());

    expect(nameInputs().map((i) => i.value)).toEqual(['Task 1', 'Task 2']);
    expect(promptInputs().map((i) => i.value)).toEqual(['A serene forest.', 'A flat-vector body map.']);
    expect(pasteTextarea().value).toBe('');
    expect(screen.getByText('Tasks (2)')).toBeTruthy();
  });

  it('shows a notice and adds no rows for an empty/whitespace-only paste', () => {
    renderBuilder();

    fireEvent.change(pasteTextarea(), { target: { value: '   \n\n  ' } });
    fireEvent.click(addFromPasteButton());

    expect(
      screen.getByText('Nothing to add — paste one or more prompts (separate tasks with a blank line).'),
    ).toBeTruthy();
    expect(nameInputs()).toHaveLength(0);
  });
});

describe('ImportBuilder — .txt upload (BI-021.3)', () => {
  it('turns each uploaded file into a row: filename sans .txt → name, contents → prompt', async () => {
    const { container } = renderBuilder();
    const files = [
      new File(['Hero prompt body'], 'hero.txt', { type: 'text/plain' }),
      new File(['About prompt body'], 'about.txt', { type: 'text/plain' }),
    ];

    await act(async () => {
      fireEvent.change(txtInput(container), { target: { files } });
    });

    expect(nameInputs().map((i) => i.value)).toEqual(['hero', 'about']);
    expect(promptInputs().map((i) => i.value)).toEqual(['Hero prompt body', 'About prompt body']);
  });
});

describe('ImportBuilder — row edit/remove', () => {
  it('editing a row updates only that row', () => {
    renderBuilder();
    fireEvent.change(pasteTextarea(), { target: { value: 'first\n\nsecond' } });
    fireEvent.click(addFromPasteButton());

    fireEvent.change(nameInputs()[0], { target: { value: 'Renamed' } });
    fireEvent.change(promptInputs()[1], { target: { value: 'edited prompt' } });

    expect(nameInputs().map((i) => i.value)).toEqual(['Renamed', 'Task 2']);
    expect(promptInputs().map((i) => i.value)).toEqual(['first', 'edited prompt']);
  });

  it('removing a row drops it from the list', () => {
    renderBuilder();
    fireEvent.change(pasteTextarea(), { target: { value: 'first\n\nsecond' } });
    fireEvent.click(addFromPasteButton());

    fireEvent.click(removeButtons()[0]);

    expect(nameInputs().map((i) => i.value)).toEqual(['Task 2']);
    expect(screen.getByText('Tasks (1)')).toBeTruthy();
  });
});

describe('ImportBuilder — download gates (BI-021.3)', () => {
  it('disables the download button when there are no rows', () => {
    renderBuilder();

    expect(downloadButton().disabled).toBe(true);
  });

  it('blocks download and shows a notice when any row has a blank name', () => {
    renderBuilder();
    fireEvent.change(pasteTextarea(), { target: { value: 'first' } });
    fireEvent.click(addFromPasteButton());
    fireEvent.change(nameInputs()[0], { target: { value: '   ' } });
    const { names } = captureDownloads();

    expect(downloadButton().disabled).toBe(false);
    fireEvent.click(downloadButton());

    expect(
      screen.getByText(
        'Every task needs a name. Fill in the blank names (they become image filename slugs).',
      ),
    ).toBeTruthy();
    expect(names).toHaveLength(0);
  });

  it('downloads tasks.json with the trimmed names/prompts once rows are valid', () => {
    renderBuilder();
    fireEvent.change(pasteTextarea(), { target: { value: 'first prompt\n\nsecond prompt' } });
    fireEvent.click(addFromPasteButton());
    fireEvent.change(nameInputs()[0], { target: { value: '  Hero  ' } });
    const { names, blobs } = captureDownloads();

    fireEvent.click(downloadButton());

    expect(names).toEqual(['tasks.json']);
    expect(blobs).toHaveLength(1);
    return blobs[0].text().then((json) => {
      const parsed = JSON.parse(json) as { tasks: TaskImportDraft[] };
      expect(parsed.tasks).toEqual([
        { name: 'Hero', basePrompt: 'first prompt' },
        { name: 'Task 2', basePrompt: 'second prompt' },
      ]);
    });
  });
});
