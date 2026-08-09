/**
 * ReferenceLibrary tests (TEST-002.6)
 *
 * `ReferenceLibrary` (BI-004) owns DOM-facing reference-image handling: drag/
 * drop or click-upload, per-file type/size validation, `FileReader` +
 * `Image()` decode, and the thumbnail grid's selection/removal wiring. The
 * pure `Session` mutations it calls (`newRefImage`, `addRefImage`,
 * `removeRefImage`, `toggleTaskRefImage`) are already unit-tested in
 * `lib/workspace.test.ts`; `TaskDetail.test.tsx` (TEST-002.3) asserts the
 * reference cap only as a UI affordance and explicitly defers this
 * component's own upload/remove path here.
 *
 * `FileReader` and `Image` are stubbed rather than relied on natively:
 * happy-dom's decode timing for both isn't a dependable browser-parity
 * guarantee, so a stub with deterministic `onload` timing keeps the ingest
 * tests reliable — the same rationale as the `URL`/`HTMLAnchorElement.click`
 * stubs already established in `lib/storage.test.ts`. Both fakes fire
 * `onload` from a `queueMicrotask`, *not* synchronously, so they mirror the
 * real APIs' async callback shape — which is why `flush()` below exists.
 *
 * No `ImagegenProvider` needed — thumbnails render a raw `<img src=
 * {ref.dataUrl}>` from an already-decoded data URL, not through
 * `ResolvedImage`.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import ReferenceLibrary from './ReferenceLibrary';
import { MAX_ACTIVE_REFS } from '@/lib/workspace';
import type { PromptTask, RefImage } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';
const FAKE_DATA_URL_PREFIX = 'data:fake;base64,';
const DECODED_WIDTH = 800;
const DECODED_HEIGHT = 600;

function makeTask(overrides: Partial<PromptTask> = {}): PromptTask {
  return {
    id: 't1',
    name: 'Hero shot',
    basePrompt: '',
    activeRefImageIds: [],
    iterations: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
  };
}

function makeRef(id: string, overrides: Partial<RefImage> = {}): RefImage {
  return {
    id,
    name: `${id}.png`,
    dataUrl: `data:image/png;base64,${id}`,
    mimeType: 'image/png',
    addedAt: NOW,
    ...overrides,
  };
}

/** Deterministic FileReader/Image stubs — see file header. */
class FakeFileReader {
  result: string | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  readAsDataURL(file: File) {
    this.result = `${FAKE_DATA_URL_PREFIX}${file.name}`;
    queueMicrotask(() => this.onload?.());
  }
}

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = DECODED_WIDTH;
  naturalHeight = DECODED_HEIGHT;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

function stubDecoders() {
  vi.stubGlobal('FileReader', FakeFileReader);
  vi.stubGlobal('Image', FakeImage);
}

interface RenderOptions {
  task?: PromptTask;
  library?: RefImage[];
}

function makeSpies() {
  return {
    onAddRefImage: vi.fn(),
    onRemoveRefImage: vi.fn(),
    onToggleRef: vi.fn(),
  };
}

function renderLibrary({ task = makeTask(), library = [] }: RenderOptions = {}) {
  const spies = makeSpies();
  const { container } = render(
    <ReferenceLibrary
      task={task}
      library={library}
      onAddRefImage={spies.onAddRefImage}
      onRemoveRefImage={spies.onRemoveRefImage}
      onToggleRef={spies.onToggleRef}
    />,
  );
  return { ...spies, container };
}

function fileInput(container: HTMLElement) {
  return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function thumbnail(name: string) {
  return screen.getByRole('button', { name });
}

/**
 * Waits for `ingest()`'s async `FileReader`/`Image` chain to settle, wrapped
 * in `act` since the resulting `setWarning` call lands outside React's own
 * event-handling `act` boundary (the component fires `void ingest(...)`).
 */
async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
  cleanup();
});

describe('ReferenceLibrary — ingest (BI-004)', () => {
  it('ingests a valid image under the size cap via onAddRefImage', async () => {
    stubDecoders();
    const { onAddRefImage, container } = renderLibrary();
    const file = new File(['x'.repeat(10)], 'brand.png', { type: 'image/png' });

    fireEvent.change(fileInput(container), { target: { files: [file] } });
    await flush();

    expect(onAddRefImage).toHaveBeenCalledTimes(1);
    expect(onAddRefImage).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'brand.png',
        dataUrl: `${FAKE_DATA_URL_PREFIX}brand.png`,
        mimeType: 'image/png',
        width: DECODED_WIDTH,
        height: DECODED_HEIGHT,
      }),
    );
  });

  it('rejects a non-image file with a per-file warning and does not ingest it', async () => {
    stubDecoders();
    const { onAddRefImage, container } = renderLibrary();
    const file = new File(['x'], 'notes.txt', { type: 'text/plain' });

    fireEvent.change(fileInput(container), { target: { files: [file] } });
    await flush();

    expect(onAddRefImage).not.toHaveBeenCalled();
    expect(screen.getByText('Skipped: notes.txt (not an image)')).toBeTruthy();
  });

  it('rejects an oversized image with a per-file warning and does not ingest it', async () => {
    stubDecoders();
    const { onAddRefImage, container } = renderLibrary();
    const big = new File([new Uint8Array(3 * 1024 * 1024)], 'huge.png', { type: 'image/png' });

    fireEvent.change(fileInput(container), { target: { files: [big] } });
    await flush();

    expect(onAddRefImage).not.toHaveBeenCalled();
    expect(screen.getByText('Skipped: huge.png (3.0MB > 2MB)')).toBeTruthy();
  });

  it('ingests the valid file and reports only the rejected one from a mixed FileList', async () => {
    stubDecoders();
    const { onAddRefImage, container } = renderLibrary();
    const files = [
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
      new File(['x'.repeat(10)], 'brand.png', { type: 'image/png' }),
    ];

    fireEvent.change(fileInput(container), { target: { files } });
    await flush();

    expect(onAddRefImage).toHaveBeenCalledTimes(1);
    expect(onAddRefImage).toHaveBeenCalledWith(expect.objectContaining({ name: 'brand.png' }));
    expect(screen.getByText('Skipped: notes.txt (not an image)')).toBeTruthy();
  });
});

describe('ReferenceLibrary — selection wiring (BI-004)', () => {
  it('clicking a thumbnail calls onToggleRef with the task and ref ids', () => {
    const { onToggleRef } = renderLibrary({
      task: makeTask({ id: 'taskA' }),
      library: [makeRef('r1')],
    });

    fireEvent.click(thumbnail('r1.png'));

    expect(onToggleRef).toHaveBeenCalledWith('taskA', 'r1');
  });

  it('clicking a thumbnail\'s remove button calls onRemoveRefImage with the ref id', () => {
    const { onRemoveRefImage } = renderLibrary({ library: [makeRef('r1')] });

    fireEvent.click(screen.getByTitle('Remove from library'));

    expect(onRemoveRefImage).toHaveBeenCalledWith('r1');
  });

  it(`disables unselected thumbnails once ${MAX_ACTIVE_REFS} are active`, () => {
    const library = Array.from({ length: MAX_ACTIVE_REFS + 1 }, (_, i) => makeRef(`r${i}`));
    const active = library.slice(0, MAX_ACTIVE_REFS).map((r) => r.id);
    renderLibrary({ task: makeTask({ activeRefImageIds: active }), library });

    const blocked = thumbnail(`r${MAX_ACTIVE_REFS}.png`) as HTMLButtonElement;
    expect(blocked.disabled).toBe(true);
  });

  it('leaves already-selected thumbnails clickable at the cap', () => {
    const library = Array.from({ length: MAX_ACTIVE_REFS + 1 }, (_, i) => makeRef(`r${i}`));
    const active = library.slice(0, MAX_ACTIVE_REFS).map((r) => r.id);
    const { onToggleRef } = renderLibrary({
      task: makeTask({ id: 'taskA', activeRefImageIds: active }),
      library,
    });

    const selected = thumbnail('r0.png') as HTMLButtonElement;
    expect(selected.disabled).toBe(false);
    fireEvent.click(selected);

    expect(onToggleRef).toHaveBeenCalledWith('taskA', 'r0');
  });
});

describe('ReferenceLibrary — library rendering', () => {
  it('shows the empty-state placeholder when the library is empty', () => {
    renderLibrary({ library: [] });

    expect(screen.getByText('No reference images yet.')).toBeTruthy();
  });

  it('renders one thumbnail per library entry', () => {
    renderLibrary({ library: [makeRef('r1'), makeRef('r2')] });

    expect(thumbnail('r1.png')).toBeTruthy();
    expect(thumbnail('r2.png')).toBeTruthy();
  });
});
