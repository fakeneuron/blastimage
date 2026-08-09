/**
 * TaskDetail tests (TEST-002.3)
 *
 * `TaskDetail` is the task pane's composition point — it owns the prompt draft,
 * the Generate gate, and the rename restore, and delegates references to
 * `ReferenceLibrary` and the batch to `ReviewGrid`. It accumulated that logic
 * across six tasks (BI-003 pane, BI-004 refs, BI-007 generate, BI-005 grid,
 * BI-030.3 rename decline, BI-031.2 bridge gate) with no component test.
 *
 * What is pinned here is the conditional logic, not the layout. Three branches
 * are the ones a well-meaning refactor breaks silently:
 *
 * - **The prompt draft is controlled on purpose.** BI-007 shipped an uncontrolled
 *   textarea, so a typed-but-unblurred prompt was lost at generate time. The
 *   draft resyncs on *task switch* only, so an in-flight edit survives an
 *   external session update to the same task (e.g. a round finishing).
 * - **The Generate gate has ordered reasons.** A missing bridge outranks a
 *   missing prompt/reference: no prompt helps a browser that cannot generate
 *   at all (BI-031.2).
 * - **A declined rename must put the field back.** The name input is
 *   uncontrolled, so a `false` from `onRenameTask` would otherwise leave it
 *   showing a name the session never took (BI-030.3).
 *
 * The reference cap is asserted here as a *UI affordance* (the disabled
 * thumbnail, the counter) — the pure reducer cap is already covered at
 * `lib/workspace.test.ts`, and `ReferenceLibrary`'s own upload/remove path
 * belongs to TEST-002.6.
 *
 * Every render is wrapped in the real `ImagegenProvider`: `TaskDetail` reaches
 * `ResolvedImage` through `ReviewGrid`, which throws outside one. Mounting it
 * for real is safe — happy-dom exposes no `indexedDB`, so the handle restore
 * resolves to `null`, and these fixtures use `https:` URLs, which
 * `resolveDisplayUrl` passes through untouched (same precedent as
 * `ReviewGrid.test.tsx`).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import TaskDetail from './TaskDetail';
import { ImagegenProvider } from '@/lib/ImagegenContext';
import { MAX_ACTIVE_REFS } from '@/lib/workspace';
import { DEFAULT_BATCH_SIZE } from '@/lib/useWorkspace';
import type { GeneratedImage, Iteration, PromptTask, RefImage } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';

const PROMPT_PLACEHOLDER = 'Describe the image you want to generate…';

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

function makeRef(id: string): RefImage {
  return {
    id,
    name: `${id}.png`,
    dataUrl: `data:image/png;base64,${id}`,
    mimeType: 'image/png',
    addedAt: NOW,
  };
}

function makeImage(id: string): GeneratedImage {
  return {
    id,
    url: `https://example.test/${id}.png`,
    prompt: `prompt ${id}`,
    status: 'ready',
    decision: 'undecided',
    rating: 0,
    feedback: null,
    createdAt: NOW,
  };
}

function makeIteration(index: number): Iteration {
  return {
    id: `it${index}`,
    index,
    prompt: 'base prompt',
    refImageIds: [],
    primaryRefImageId: null,
    images: [makeImage('i1')],
    createdAt: NOW,
  };
}

type Spies = ReturnType<typeof makeSpies>;

function makeSpies() {
  return {
    onRenameTask: vi.fn(() => true),
    onSetPrompt: vi.fn(),
    onAddRefImage: vi.fn(),
    onRemoveRefImage: vi.fn(),
    onToggleRef: vi.fn(),
    onGenerate: vi.fn(),
    onSetImageDecision: vi.fn(),
    onSetImageRating: vi.fn(),
    onFeedback: vi.fn(),
    onIterate: vi.fn(),
  };
}

interface DetailOptions {
  task?: PromptTask | null;
  library?: RefImage[];
  generating?: boolean;
  generationAvailable?: boolean;
  spies?: Spies;
}

function markup({
  task = makeTask(),
  library = [],
  generating = false,
  generationAvailable = true,
  spies = makeSpies(),
}: DetailOptions = {}) {
  return (
    <ImagegenProvider>
      <TaskDetail
        task={task}
        library={library}
        generating={generating}
        generationAvailable={generationAvailable}
        {...spies}
      />
    </ImagegenProvider>
  );
}

/**
 * Renders under a real provider and drains the provider's mount-time restore so
 * no state settles outside `act`. Returns the spies plus a `rerender` that keeps
 * the same spy set, for the task-switch / external-update cases.
 */
async function renderDetail(options: DetailOptions = {}) {
  const spies = options.spies ?? makeSpies();
  const view = render(markup({ ...options, spies }));
  await act(async () => {});
  return {
    ...spies,
    rerender: async (next: DetailOptions) => {
      view.rerender(markup({ ...next, spies }));
      await act(async () => {});
    },
  };
}

const promptBox = () => screen.getByPlaceholderText(PROMPT_PLACEHOLDER);
const nameBox = () => screen.getByRole('textbox', { name: 'Task name' });
const generateButton = () => screen.getByRole('button', { name: /^Generat/ });
const thumbnail = (id: string) => screen.getByRole('button', { name: `${id}.png` });

afterEach(() => {
  cleanup();
});

describe('TaskDetail — empty state (BI-003)', () => {
  it('prompts for a selection when no task is active', async () => {
    await renderDetail({ task: null });

    expect(screen.getByText('Select a task, or add one from the sidebar.')).toBeTruthy();
    expect(screen.queryByPlaceholderText(PROMPT_PLACEHOLDER)).toBeNull();
  });
});

describe('TaskDetail — prompt editing (BI-003 / BI-007)', () => {
  it('seeds the editor from the task base prompt', async () => {
    await renderDetail({ task: makeTask({ basePrompt: 'a red bicycle' }) });

    expect((promptBox() as HTMLTextAreaElement).value).toBe('a red bicycle');
  });

  it('tracks typing without waiting for a blur', async () => {
    await renderDetail();

    fireEvent.change(promptBox(), { target: { value: 'a blue door' } });

    expect((promptBox() as HTMLTextAreaElement).value).toBe('a blue door');
  });

  it('persists the prompt on blur', async () => {
    const { onSetPrompt } = await renderDetail();

    fireEvent.change(promptBox(), { target: { value: 'a blue door' } });
    fireEvent.blur(promptBox());

    expect(onSetPrompt).toHaveBeenCalledWith('t1', 'a blue door');
  });

  it('resyncs the draft when the active task changes', async () => {
    const { rerender } = await renderDetail({ task: makeTask({ basePrompt: 'first' }) });

    await rerender({ task: makeTask({ id: 't2', basePrompt: 'second' }) });

    expect((promptBox() as HTMLTextAreaElement).value).toBe('second');
  });

  it('keeps an in-progress edit when the same task updates externally', async () => {
    const { rerender } = await renderDetail({ task: makeTask({ basePrompt: 'first' }) });

    fireEvent.change(promptBox(), { target: { value: 'my unsaved edit' } });
    // e.g. a finished round writing back to the session
    await rerender({ task: makeTask({ basePrompt: 'first', iterations: [makeIteration(0)] }) });

    expect((promptBox() as HTMLTextAreaElement).value).toBe('my unsaved edit');
  });

  it('keeps an in-progress edit even when the task base prompt changes under it', async () => {
    // The resync keys on task *identity*, not on `basePrompt` — a session write
    // that rewrites the stored prompt must not clobber what the user is typing.
    const { rerender } = await renderDetail({ task: makeTask({ basePrompt: 'first' }) });

    fireEvent.change(promptBox(), { target: { value: 'my unsaved edit' } });
    await rerender({ task: makeTask({ basePrompt: 'rewritten elsewhere' }) });

    expect((promptBox() as HTMLTextAreaElement).value).toBe('my unsaved edit');
  });

  it('resyncs on a task switch even when the two prompts match', async () => {
    const { rerender } = await renderDetail({ task: makeTask({ basePrompt: 'shared' }) });

    fireEvent.change(promptBox(), { target: { value: 'my unsaved edit' } });
    await rerender({ task: makeTask({ id: 't2', basePrompt: 'shared' }) });

    expect((promptBox() as HTMLTextAreaElement).value).toBe('shared');
  });

  it('generates from the live draft rather than the last-blurred value', async () => {
    const { onGenerate, onSetPrompt } = await renderDetail({
      task: makeTask({ basePrompt: 'stale' }),
    });

    fireEvent.change(promptBox(), { target: { value: 'just typed' } });
    fireEvent.click(generateButton());

    expect(onSetPrompt).toHaveBeenCalledWith('t1', 'just typed');
    expect(onGenerate).toHaveBeenCalledWith('t1', { prompt: 'just typed' });
  });

  it('skips the redundant persist when the draft is unchanged', async () => {
    const { onGenerate, onSetPrompt } = await renderDetail({
      task: makeTask({ basePrompt: 'unchanged' }),
    });

    fireEvent.click(generateButton());

    expect(onSetPrompt).not.toHaveBeenCalled();
    expect(onGenerate).toHaveBeenCalledWith('t1', { prompt: 'unchanged' });
  });
});

describe('TaskDetail — reference selection (BI-004)', () => {
  const library = Array.from({ length: MAX_ACTIVE_REFS + 1 }, (_, i) => makeRef(`r${i}`));

  it('counts the active references against the cap', async () => {
    await renderDetail({ task: makeTask({ activeRefImageIds: ['r0'] }), library });

    expect(screen.getByText(`1/${MAX_ACTIVE_REFS} active`)).toBeTruthy();
  });

  it('toggles the reference that was clicked', async () => {
    const { onToggleRef } = await renderDetail({ library });

    fireEvent.click(thumbnail('r1'));

    expect(onToggleRef).toHaveBeenCalledWith('t1', 'r1');
  });

  it(`disables unselected references once ${MAX_ACTIVE_REFS} are active`, async () => {
    const active = library.slice(0, MAX_ACTIVE_REFS).map((r) => r.id);
    await renderDetail({ task: makeTask({ activeRefImageIds: active }), library });

    const blocked = thumbnail(`r${MAX_ACTIVE_REFS}`);
    expect((blocked as HTMLButtonElement).disabled).toBe(true);
    expect(blocked.getAttribute('title')).toBe(`Deselect one — max ${MAX_ACTIVE_REFS}`);
  });

  it('leaves the already-selected references clickable at the cap', async () => {
    const active = library.slice(0, MAX_ACTIVE_REFS).map((r) => r.id);
    const { onToggleRef } = await renderDetail({
      task: makeTask({ activeRefImageIds: active }),
      library,
    });

    expect((thumbnail('r0') as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(thumbnail('r0'));

    expect(onToggleRef).toHaveBeenCalledWith('t1', 'r0');
  });
});

describe('TaskDetail — generate gate (BI-007 / BI-031.2)', () => {
  it('enables Generate on a prompt alone', async () => {
    await renderDetail({ task: makeTask({ basePrompt: 'a red bicycle' }) });

    expect((generateButton() as HTMLButtonElement).disabled).toBe(false);
    expect(generateButton().getAttribute('title')).toBe('Generate a batch');
  });

  it('enables Generate on a reference alone', async () => {
    await renderDetail({
      task: makeTask({ activeRefImageIds: ['r0'] }),
      library: [makeRef('r0')],
    });

    expect((generateButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables Generate with neither a prompt nor a reference', async () => {
    const { onGenerate } = await renderDetail();

    expect((generateButton() as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('Add a prompt or a reference to generate.')).toBeTruthy();
    expect(onGenerate).not.toHaveBeenCalled();
  });

  it('treats a whitespace-only prompt as no prompt', async () => {
    await renderDetail({ task: makeTask({ basePrompt: '   ' }) });

    expect((generateButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('clears the gate as soon as the draft is typed into', async () => {
    await renderDetail();

    fireEvent.change(promptBox(), { target: { value: 'a blue door' } });

    expect((generateButton() as HTMLButtonElement).disabled).toBe(false);
  });

  it('disables Generate when the provider bridge is absent', async () => {
    await renderDetail({
      task: makeTask({ basePrompt: 'a red bicycle' }),
      generationAvailable: false,
    });

    expect((generateButton() as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText(
        'In-app generation is Grok-Build-only — generate rounds from the terminal loop.',
      ),
    ).toBeTruthy();
  });

  it('reports the missing bridge ahead of the missing prompt when both apply', async () => {
    await renderDetail({ generationAvailable: false });

    expect(screen.queryByText('Add a prompt or a reference to generate.')).toBeNull();
    expect(generateButton().getAttribute('title')).toContain(
      'The Grok Imagine provider bridge is not installed',
    );
  });

  it('disables Generate while a batch is in flight', async () => {
    await renderDetail({ task: makeTask({ basePrompt: 'a red bicycle' }), generating: true });

    const button = screen.getByRole('button', { name: 'Generating…' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });
});

/**
 * The name field is uncontrolled, and React restores an input to its tracked
 * value after a discrete event — so a value delivered on the blur event's own
 * `target` payload would overwrite the handler's restore. Typing and blurring as
 * two events is both what a user does and what leaves the restore observable.
 */
function renameTo(value: string) {
  fireEvent.change(nameBox(), { target: { value } });
  fireEvent.blur(nameBox());
}

describe('TaskDetail — rename gate (BI-030.3)', () => {
  it('reports an accepted rename, trimmed, and keeps the new name', async () => {
    const { onRenameTask } = await renderDetail();

    renameTo('  Hero banner  ');

    expect(onRenameTask).toHaveBeenCalledWith('t1', 'Hero banner');
    expect((nameBox() as HTMLInputElement).value).toBe('  Hero banner  ');
  });

  it('restores the field when the rename is declined', async () => {
    const spies = makeSpies();
    spies.onRenameTask.mockReturnValue(false);
    await renderDetail({ spies });

    renameTo('Hero banner');

    expect((nameBox() as HTMLInputElement).value).toBe('Hero shot');
  });

  it.each([
    ['an unchanged name', 'Hero shot'],
    ['a blank name', '   '],
  ])('ignores %s', async (_label, value) => {
    const { onRenameTask } = await renderDetail();

    renameTo(value);

    expect(onRenameTask).not.toHaveBeenCalled();
  });
});

describe('TaskDetail — latest batch (BI-005)', () => {
  it('shows no batch section before the first round', async () => {
    await renderDetail();

    expect(screen.queryByText(/Latest batch/)).toBeNull();
  });

  it('stands in a full batch of skeletons while generating', async () => {
    const { container } = render(markup({ generating: true }));
    await act(async () => {});

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(DEFAULT_BATCH_SIZE);
    expect(screen.queryByRole('button', { name: 'Keep' })).toBeNull();
  });

  it('labels the latest round 1-based and hands it to the review grid', async () => {
    await renderDetail({ task: makeTask({ iterations: [makeIteration(0), makeIteration(1)] }) });

    expect(screen.getByText('Latest batch · round 2')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeTruthy();
  });

  it('forwards the review-grid callbacks with the task id attached', async () => {
    const { onSetImageDecision, onFeedback } = await renderDetail({
      task: makeTask({ iterations: [makeIteration(0)] }),
    });

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));

    expect(onSetImageDecision).toHaveBeenCalledWith('t1', 'i1', 'kept');
    expect(onFeedback).toHaveBeenCalledWith('t1', 'i1');
  });
});
