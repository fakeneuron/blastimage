/**
 * useWorkspace race-fix tests (CORE-001.2).
 *
 * generate() awaits the provider and then commits the batch; these tests pin
 * the post-await reconciliation: commits that land *during* the await must
 * survive (same session), and a mid-generate session switch must persist the
 * batch into the originating stored session without flipping the UI back.
 *
 * The provider seam is the real one — a deferred globalThis.__grokImagineProvider
 * — so the await window is held open deterministically.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

import { useWorkspace } from './useWorkspace';
import { loadSession } from './storage';

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
    expect(result.current.ready).toBe(true);

    act(() => result.current.addTask('Hero'));
    const taskId = result.current.activeTaskId!;
    act(() => result.current.setTaskPrompt(taskId, 'a hero image'));

    const { release } = installDeferredProvider();
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.generate(taskId);
    });

    // A concurrent edit commits while the batch is still generating.
    act(() => result.current.renameTask(taskId, 'Hero renamed'));

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
    expect(result.current.ready).toBe(true);

    const originId = result.current.session!.id;
    act(() => result.current.addTask('Hero'));
    const taskId = result.current.activeTaskId!;
    act(() => result.current.setTaskPrompt(taskId, 'a hero image'));

    const { release } = installDeferredProvider();
    let generation!: Promise<void>;
    act(() => {
      generation = result.current.generate(taskId);
    });

    // The user switches to a fresh session while the batch is generating.
    act(() => result.current.createSession('Other Site'));

    release();
    await act(async () => {
      await generation;
    });

    // UI stays on the new session — no flip back, no foreign iteration.
    expect(result.current.session!.name).toBe('Other Site');
    expect(result.current.session!.tasks).toHaveLength(0);

    // The batch landed in the originating session in storage.
    const origin = loadSession(originId)!;
    const task = origin.tasks.find((t) => t.id === taskId)!;
    expect(task.iterations).toHaveLength(1);
    expect(task.iterations[0].images).toHaveLength(4);
  });
});

describe('generateAll() (BI-015)', () => {
  it('fires only eligible tasks and lands every concurrent batch', async () => {
    const { result } = renderHook(() => useWorkspace());
    expect(result.current.ready).toBe(true);

    act(() => result.current.addTask('Hero'));
    const heroId = result.current.activeTaskId!;
    act(() => result.current.setTaskPrompt(heroId, 'a hero image'));
    act(() => result.current.addTask('About'));
    const aboutId = result.current.activeTaskId!;
    act(() => result.current.setTaskPrompt(aboutId, 'an about photo'));
    act(() => result.current.addTask('Empty')); // ineligible — no prompt, no refs
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
    expect(result.current.ready).toBe(true);

    act(() => result.current.addTask('Good'));
    const goodId = result.current.activeTaskId!;
    act(() => result.current.setTaskPrompt(goodId, 'a good image'));
    act(() => result.current.addTask('Bad'));
    const badId = result.current.activeTaskId!;
    act(() => result.current.setTaskPrompt(badId, 'bad'));

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
