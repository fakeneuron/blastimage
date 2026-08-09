/**
 * BulkReviewPane tests (TEST-002.5)
 *
 * `BulkReviewPane` (BI-015) is presentational only — the fired-task set and exit
 * behavior live in `Workspace`. What it owns is a per-task branch: a fired task
 * is either still generating (skeleton grid), has landed a batch (`ReviewGrid`),
 * or fired and produced nothing (a failure line). That three-way branch had no
 * test of its own — only the single-task analogue in `TaskDetail.test.tsx`
 * (TEST-002.3) pinned the skeleton-count idiom this file reuses.
 *
 * Deliberately out of scope: `ReviewGrid`'s own decision/rating/feedback/iterate
 * logic, already pinned by `ReviewGrid.test.tsx` (TEST-002.2). What this file
 * proves instead is that `BulkReviewPane`'s per-task closures forward those
 * callbacks with the *owning task's* id attached — mirroring
 * `TaskDetail.test.tsx`'s existing task-id-forwarding case.
 *
 * The real `ImagegenProvider` is mounted rather than stubbed: a landed task
 * renders `ReviewGrid`, which renders `ResolvedImage`, which throws outside a
 * provider. Safe to mount for real — happy-dom exposes no `indexedDB`, so the
 * handle-restore effect resolves to `null`, and these fixtures use `https:`
 * URLs, which `resolveDisplayUrl` passes through untouched.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';

import BulkReviewPane from './BulkReviewPane';
import { ImagegenProvider } from '@/lib/ImagegenContext';
import { DEFAULT_BATCH_SIZE } from '@/lib/useWorkspace';
import type { GeneratedImage, ID, Iteration, PromptTask } from '@/lib/types';

const NOW = '2026-08-09T00:00:00.000Z';

function makeTask(id: ID, overrides: Partial<PromptTask> = {}): PromptTask {
  return {
    id,
    name: `Task ${id}`,
    basePrompt: '',
    activeRefImageIds: [],
    iterations: [],
    createdAt: NOW,
    updatedAt: NOW,
    ...overrides,
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

function makeIteration(index: number, images: GeneratedImage[]): Iteration {
  return {
    id: `it${index}`,
    index,
    prompt: 'base prompt',
    refImageIds: [],
    primaryRefImageId: null,
    images,
    createdAt: NOW,
  };
}

interface PaneOptions {
  tasks?: PromptTask[];
  generatingTaskIds?: ID[];
}

function makeSpies() {
  return {
    onSetImageDecision: vi.fn(),
    onSetImageRating: vi.fn(),
    onFeedback: vi.fn(),
    onIterate: vi.fn(),
  };
}

function markup(
  { tasks = [], generatingTaskIds = [] }: PaneOptions,
  spies: ReturnType<typeof makeSpies>,
) {
  return (
    <ImagegenProvider>
      <BulkReviewPane
        tasks={tasks}
        generatingTaskIds={generatingTaskIds}
        onSetImageDecision={spies.onSetImageDecision}
        onSetImageRating={spies.onSetImageRating}
        onFeedback={spies.onFeedback}
        onIterate={spies.onIterate}
      />
    </ImagegenProvider>
  );
}

/**
 * Renders under a real provider and drains the provider's mount-time restore so
 * no state settles outside `act`.
 */
async function renderPane(options: PaneOptions = {}) {
  const spies = makeSpies();
  const view = render(markup(options, spies));
  await act(async () => {});
  return { ...spies, container: view.container };
}

afterEach(() => {
  cleanup();
});

describe('BulkReviewPane — generating state (BI-015 / TEST-002.3 precedent)', () => {
  it('stands in a full batch of skeletons for a task with no landed iteration', async () => {
    const { container } = await renderPane({
      tasks: [makeTask('t1')],
      generatingTaskIds: ['t1'],
    });

    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(DEFAULT_BATCH_SIZE);
    expect(screen.queryByRole('button', { name: 'Keep' })).toBeNull();
    expect(screen.queryByText(/generation failed/)).toBeNull();
  });

  it('labels the task as generating', async () => {
    await renderPane({ tasks: [makeTask('t1', { name: 'Hero shot' })], generatingTaskIds: ['t1'] });

    expect(screen.getByText(/Hero shot/)).toBeTruthy();
    expect(screen.getByText(/generating…/)).toBeTruthy();
  });
});

describe('BulkReviewPane — failed state (BI-015)', () => {
  it('shows the failure line for a fired task with no landed batch', async () => {
    await renderPane({ tasks: [makeTask('t1')], generatingTaskIds: [] });

    expect(screen.getByText('No batch — generation failed for this task.')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Keep' })).toBeNull();
    expect(screen.queryAllByText(/animate-pulse/)).toHaveLength(0);
  });
});

describe('BulkReviewPane — landed state (BI-005 wiring)', () => {
  it('renders the review grid for the latest iteration and labels the round', async () => {
    await renderPane({
      tasks: [
        makeTask('t1', {
          iterations: [makeIteration(0, [makeImage('i1')]), makeIteration(1, [makeImage('i2')])],
        }),
      ],
    });

    expect(screen.getByText(/round 2/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Keep' })).toBeTruthy();
  });

  it('forwards the review-grid callbacks with the owning task id attached', async () => {
    const { onSetImageDecision, onFeedback } = await renderPane({
      tasks: [makeTask('t1', { iterations: [makeIteration(0, [makeImage('i1')])] })],
    });

    fireEvent.click(screen.getByRole('button', { name: 'Keep' }));
    fireEvent.click(screen.getByRole('button', { name: 'Feedback' }));

    expect(onSetImageDecision).toHaveBeenCalledWith('t1', 'i1', 'kept');
    expect(onFeedback).toHaveBeenCalledWith('t1', 'i1');
  });
});

describe('BulkReviewPane — mixed multi-task render (BI-015)', () => {
  it('resolves each task to its own state independently', async () => {
    const { container, onSetImageRating } = await renderPane({
      tasks: [
        makeTask('t1', { name: 'Generating task' }),
        makeTask('t2', { name: 'Failed task' }),
        makeTask('t3', {
          name: 'Landed task',
          iterations: [makeIteration(0, [makeImage('i3')])],
        }),
      ],
      generatingTaskIds: ['t1'],
    });

    expect(screen.getByText(/Generating task/)).toBeTruthy();
    expect(screen.getByText(/Failed task/)).toBeTruthy();
    expect(screen.getByText(/Landed task/)).toBeTruthy();
    expect(screen.getByText('No batch — generation failed for this task.')).toBeTruthy();
    expect(container.querySelectorAll('.animate-pulse')).toHaveLength(DEFAULT_BATCH_SIZE);

    const stars = screen.getAllByRole('radio', { name: '3 stars' });
    fireEvent.click(stars[0]!);

    expect(onSetImageRating).toHaveBeenCalledWith('t3', 'i3', 3);
  });
});
