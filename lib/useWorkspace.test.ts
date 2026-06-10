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
import { act, cleanup, renderHook } from '@testing-library/react';

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
