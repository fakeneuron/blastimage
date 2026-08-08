/**
 * useWorkspace race-fix tests (CORE-001.2; async-seam update BI-022.3).
 *
 * generate() awaits the provider and then commits the batch; these tests pin
 * the post-await reconciliation: commits that land *during* the await must
 * survive (same session), and a mid-generate session switch must persist the
 * batch into the originating stored session without flipping the UI back.
 *
 * The provider seam is the real one — a deferred globalThis.__grokImagineProvider
 * — so the await window is held open deterministically.
 *
 * Since BI-022.3 the persistence seam is async: the mount-time load resolves a
 * tick after render (tests wait for `ready`), and mutators commit optimistically
 * then persist in the background (so `act` is async to flush those microtasks).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

import { useWorkspace } from './useWorkspace';
import type { ImagegenApi } from './ImagegenContext';
import { ROUND_BATCH_SCHEMA_VERSION, type RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import { loadSession } from './storage';
import { SCHEMA_VERSION } from './types';

/** Installs a provider gated on a promise; `release()` lets the batch resolve. */
function installDeferredProvider(): { release: () => void } {
  let release!: () => void;
  const gate = new Promise<void>((r) => (release = r));
  globalThis.__grokImagineProvider = async (req) => {
    await gate;
    return Array.from({ length: req.batchSize }, (_, i) => ({
      url: `data:image/png;base64,candidate-${i}`,
      prompt: req.prompt,
    }));
  };
  return { release };
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete globalThis.__grokImagineProvider;
  cleanup();
});

describe('generate() post-await reconciliation', () => {
  it('does not drop a commit that lands during the await (same session)', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => result.current.addTask('Hero'));
    const taskId = result.current.activeTaskId!;
    await act(async () => result.current.setTaskPrompt(taskId, 'a hero image'));

    const { release } = installDeferredProvider();
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.generate(taskId);
    });

    // A concurrent edit commits while the batch is still generating.
    await act(async () => result.current.renameTask(taskId, 'Hero renamed'));

    release();
    await act(async () => {
      await generation;
    });

    const task = result.current.session!.tasks.find((t) => t.id === taskId)!;
    expect(task.name).toBe('Hero renamed'); // pre-fix: reverted to 'Hero'
    expect(task.iterations).toHaveLength(1);
    expect(task.iterations[0].images).toHaveLength(4);
  });

  it('persists the batch to the originating stored session on a mid-generate switch', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const originId = result.current.session!.id;
    await act(async () => result.current.addTask('Hero'));
    const taskId = result.current.activeTaskId!;
    await act(async () => result.current.setTaskPrompt(taskId, 'a hero image'));

    const { release } = installDeferredProvider();
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.generate(taskId);
    });

    // The user switches to a fresh session while the batch is generating.
    await act(async () => result.current.createSession('Other Site'));

    release();
    await act(async () => {
      await generation;
    });

    // UI stays on the new session — no flip back, no foreign iteration.
    expect(result.current.session!.name).toBe('Other Site');
    expect(result.current.session!.tasks).toHaveLength(0);

    // The batch landed in the originating session in storage.
    await waitFor(() => {
      const origin = loadSession(originId)!;
      const task = origin.tasks.find((t) => t.id === taskId)!;
      expect(task.iterations).toHaveLength(1);
      expect(task.iterations[0].images).toHaveLength(4);
    });
  });
});

describe('generateAll() (BI-015)', () => {
  it('fires only eligible tasks and lands every concurrent batch', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => result.current.addTask('Hero'));
    const heroId = result.current.activeTaskId!;
    await act(async () => result.current.setTaskPrompt(heroId, 'a hero image'));
    await act(async () => result.current.addTask('About'));
    const aboutId = result.current.activeTaskId!;
    await act(async () => result.current.setTaskPrompt(aboutId, 'an about photo'));
    await act(async () => result.current.addTask('Empty')); // ineligible — no prompt, no refs
    const emptyId = result.current.activeTaskId!;

    const { release } = installDeferredProvider();
    let fired!: string[];
    act(() => {
      fired = result.current.generateAll();
    });
    expect(fired).toEqual([heroId, aboutId]);
    expect(result.current.generatingTaskIds).toEqual([heroId, aboutId]);

    release();
    await waitFor(() => expect(result.current.generatingTaskIds).toHaveLength(0));

    // Both batches resolved in the same release tick; neither commit dropped
    // the other (commit() keeps sessionRef current synchronously).
    const tasks = result.current.session!.tasks;
    for (const id of [heroId, aboutId]) {
      const task = tasks.find((t) => t.id === id)!;
      expect(task.iterations).toHaveLength(1);
      expect(task.iterations[0].images).toHaveLength(4);
    }
    expect(tasks.find((t) => t.id === emptyId)!.iterations).toHaveLength(0);
  });

  it('a failing task does not block the others', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    await act(async () => result.current.addTask('Good'));
    const goodId = result.current.activeTaskId!;
    await act(async () => result.current.setTaskPrompt(goodId, 'a good image'));
    await act(async () => result.current.addTask('Bad'));
    const badId = result.current.activeTaskId!;
    await act(async () => result.current.setTaskPrompt(badId, 'bad'));

    globalThis.__grokImagineProvider = async (req) => {
      if (req.prompt === 'bad') throw new Error('boom');
      return Array.from({ length: req.batchSize }, (_, i) => ({
        url: `data:image/png;base64,candidate-${i}`,
        prompt: req.prompt,
      }));
    };

    act(() => {
      result.current.generateAll();
    });
    await waitFor(() => expect(result.current.generatingTaskIds).toHaveLength(0));

    const tasks = result.current.session!.tasks;
    expect(tasks.find((t) => t.id === goodId)!.iterations).toHaveLength(1);
    expect(tasks.find((t) => t.id === badId)!.iterations).toHaveLength(0);
    expect(result.current.error).toBe('Generation failed. Please try again.');
  });
});

describe('importSessionBackup() (BI-022.7)', () => {
  it('lands a backup as a fresh active session (new ids) with its tasks', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    const backup = {
      id: 'backup-sess-1',
      name: 'Imported Site',
      schemaVersion: SCHEMA_VERSION,
      createdAt: '2026-06-16T00:00:00.000Z',
      updatedAt: '2026-06-16T00:00:00.000Z',
      refLibrary: [],
      tasks: [
        {
          id: 'backup-task-1',
          name: 'Hero',
          basePrompt: 'a hero',
          activeRefImageIds: [],
          iterations: [],
          createdAt: '2026-06-16T00:00:00.000Z',
          updatedAt: '2026-06-16T00:00:00.000Z',
        },
      ],
    };

    await act(async () => result.current.importSessionBackup(JSON.stringify(backup)));

    // Switched to the imported session — as a fresh copy (new ids), not the backup's.
    expect(result.current.session!.name).toBe('Imported Site');
    expect(result.current.session!.id).not.toBe('backup-sess-1');
    expect(result.current.session!.tasks).toHaveLength(1);
    expect(result.current.session!.tasks[0].name).toBe('Hero');
    expect(result.current.session!.tasks[0].id).not.toBe('backup-task-1');
    expect(result.current.activeTaskId).toBe(result.current.session!.tasks[0].id);

    // Persisted to storage and listed.
    await waitFor(() =>
      expect(result.current.sessions.some((m) => m.id === result.current.session!.id)).toBe(true),
    );
    expect(loadSession(result.current.session!.id)!.name).toBe('Imported Site');
  });

  it('surfaces a validation error for an invalid backup and does not switch', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    const before = result.current.session!.id;

    await act(async () => result.current.importSessionBackup('not valid json'));

    expect(result.current.error).toBeTruthy();
    expect(result.current.session!.id).toBe(before);
  });
});

/**
 * Reversible approve (BI-030.2).
 *
 * Clearing an `approved` decision must undo both halves of the approve write:
 * the copy into `imagegen/approved/` and the task's `selection.json` entry. The
 * imagegen seam is injected (the hook's own `ImagegenApi` parameter), so these
 * pin the orchestration + sibling-approval guards, not the FSA layer.
 */
function recordingImagegen(batches: Record<number, RoundBatch>): {
  api: ImagegenApi;
  unpromoted: string[];
  selections: Array<{ round: number; tasks: RoundSelectionTask[] }>;
} {
  const unpromoted: string[] = [];
  const selections: Array<{ round: number; tasks: RoundSelectionTask[] }> = [];
  const api: ImagegenApi = {
    linked: true,
    linkFolder: async () => ({ status: 'cancelled' }),
    listRounds: async () => Object.keys(batches).map(Number),
    readRound: async (round) =>
      batches[round]
        ? { ok: true, value: batches[round]! }
        : { ok: false, error: `no round ${round}` },
    writeSelection: async (round, tasks) => {
      selections.push({ round, tasks });
      return { ok: true, value: undefined };
    },
    promoteApproved: async () => ({ ok: true, value: undefined }),
    unpromoteApproved: async (keeperFilename) => {
      unpromoted.push(keeperFilename);
      return { ok: true, value: undefined };
    },
    resolveDisplayUrl: async (url) => url,
    resolveBlob: async () => new Blob(['x']),
  };
  return { api, unpromoted, selections };
}

function roundBatch(round: number, images: string[]): RoundBatch {
  return {
    schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
    round,
    generatedAt: '2026-08-08T00:00:00Z',
    tasks: [{ slug: 'hero', name: 'Hero', prompt: 'a hero image', images }],
  };
}

/** Loads `round` and returns the hero task id plus its image ids for that round. */
async function loadHero(
  result: { current: ReturnType<typeof useWorkspace> },
  round: number,
): Promise<{ taskId: string; imageIds: string[] }> {
  await act(async () => {
    await result.current.loadRound(round);
  });
  const task = result.current.session!.tasks.find((t) => t.name === 'Hero')!;
  const iteration = task.iterations[task.iterations.length - 1]!;
  return { taskId: task.id, imageIds: iteration.images.map((img) => img.id) };
}

describe('reversible approve (BI-030.2)', () => {
  it('clearing an approve removes the file and rewrites the entry to skip', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg', 'hero-002.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(1));

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'undecided'));

    await waitFor(() => expect(unpromoted).toEqual(['hero-001.jpg']));
    await waitFor(() => expect(selections).toHaveLength(2));
    expect(selections[1]).toEqual({ round: 1, tasks: [{ slug: 'hero', decision: 'skip' }] });
  });

  it('switching approve → kept also clears, via submitFeedback', async () => {
    const { api, unpromoted, selections } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(1));

    await act(async () =>
      result.current.submitFeedback(
        taskId,
        imageIds[0]!,
        { text: 'not quite', useAsReference: false },
        'keep',
      ),
    );

    await waitFor(() => expect(unpromoted).toEqual(['hero-001.jpg']));
    await waitFor(() => expect(selections).toHaveLength(2));
    expect(selections[1]!.tasks).toEqual([{ slug: 'hero', decision: 'skip' }]);
  });

  it('does not rewrite the entry while a sibling image of the task stays approved', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg', 'hero-002.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await act(async () => result.current.setImageDecision(taskId, imageIds[1]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(2));

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'undecided'));

    // Its own file goes, but hero-002 still owns the slug's approve entry.
    await waitFor(() => expect(unpromoted).toEqual(['hero-001.jpg']));
    expect(selections).toHaveLength(2);
    expect(selections.some((s) => s.tasks[0]!.decision === 'skip')).toBe(false);
  });

  it('is a silent no-op when the imagegen folder is not linked', async () => {
    const { api, unpromoted, selections } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const state = { api };
    const { result, rerender } = renderHook(() => useWorkspace(state.api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(1));

    // The user unlinks the folder, then clears the approve.
    state.api = { ...api, linked: false };
    rerender();
    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'undecided'));

    expect(unpromoted).toEqual([]);
    expect(selections).toHaveLength(1);
    expect(result.current.error).toBeNull();
  });

  it('keeps the approved/ file when another round approved the same filename', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
      2: roundBatch(2, ['hero-001.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const r1 = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(r1.taskId, r1.imageIds[0]!, 'approved'));
    const r2 = await loadHero(result, 2);
    await act(async () => result.current.setImageDecision(r2.taskId, r2.imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(2));

    await act(async () => result.current.setImageDecision(r2.taskId, r2.imageIds[0]!, 'undecided'));

    // approved/hero-001.jpg is still the round-1 approval's file — leave it.
    await waitFor(() => expect(selections).toHaveLength(3));
    expect(unpromoted).toEqual([]);
    expect(selections[2]).toEqual({ round: 2, tasks: [{ slug: 'hero', decision: 'skip' }] });
  });
});
