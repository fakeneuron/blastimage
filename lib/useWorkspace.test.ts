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

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';

import { useWorkspace } from './useWorkspace';
import type { ImagegenApi } from './ImagegenContext';
import { ROUND_BATCH_SCHEMA_VERSION, type RoundBatch } from './roundBatch';
import type { RoundSelectionTask } from './roundSelection';
import { loadSession } from './storage';
import { SCHEMA_VERSION, type Session } from './types';
import type { LinkOutcome } from './useWorkspace';

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
    expect(task.iterations[0]!.images).toHaveLength(4);
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
      const loaded = loadSession(originId);
      expect(loaded.status).toBe('ok');
      const origin = (loaded as { status: 'ok'; session: Session }).session;
      const task = origin.tasks.find((t) => t.id === taskId)!;
      expect(task.iterations).toHaveLength(1);
      expect(task.iterations[0]!.images).toHaveLength(4);
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
      expect(task.iterations[0]!.images).toHaveLength(4);
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
    // The thrown message is surfaced verbatim, not collapsed into a fixed
    // sentence (BI-031.2).
    expect(result.current.error).toBe('boom');
  });
});

describe('generationAvailable (BI-031.2)', () => {
  it('is false while no Grok Imagine bridge is installed', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.generationAvailable).toBe(false);
  });

  it('flips true when the bridge is installed after mount', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.generationAvailable).toBe(false);

    // The agent installs the bridge mid-session (BI-013 installs it before
    // triggering generate); the hook re-probes on a 1.5s interval, so allow
    // more than one probe period here.
    installDeferredProvider();
    await waitFor(() => expect(result.current.generationAvailable).toBe(true), { timeout: 4000 });
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
    expect(result.current.session!.tasks[0]!.name).toBe('Hero');
    expect(result.current.session!.tasks[0]!.id).not.toBe('backup-task-1');
    expect(result.current.activeTaskId).toBe(result.current.session!.tasks[0]!.id);

    // Persisted to storage and listed.
    await waitFor(() =>
      expect(result.current.sessions.some((m) => m.id === result.current.session!.id)).toBe(true),
    );
    const stored = loadSession(result.current.session!.id);
    expect(stored).toMatchObject({ status: 'ok', session: { name: 'Imported Site' } });
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
 * Unreadable stored sessions (BI-030.4).
 *
 * A session the load guards reject is not an absent one: bootstrapping over it
 * used to be silent, and its index row kept it in the switcher as a dead entry
 * that no-oped on selection. These pin both moments through the real storage
 * layer — the fixtures are written straight into localStorage, since only a
 * *different* app version could produce them legitimately.
 */
function seedStoredSession(id: string, name: string, raw: string): void {
  localStorage.setItem(`blastimage:session:${id}`, raw);
  localStorage.setItem(
    'blastimage:index',
    JSON.stringify([{ id, name, updatedAt: '2026-08-08T00:00:00.000Z' }]),
  );
}

/** Serialized session carrying a schemaVersion this app does not support. */
function futureSessionJson(id: string, name: string): string {
  const now = '2026-08-08T00:00:00.000Z';
  return JSON.stringify({
    id,
    name,
    tasks: [],
    refLibrary: [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION + 1,
  });
}

describe('unreadable stored sessions (BI-030.4)', () => {
  it('names the project in a banner when the active session fails the version guard', async () => {
    seedStoredSession('dead-1', 'Acme Site', futureSessionJson('dead-1', 'Acme Site'));
    localStorage.setItem('blastimage:active', 'dead-1');

    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    // Still usable: a fresh default project is active…
    expect(result.current.session!.name).toBe('My Website');
    expect(result.current.session!.id).not.toBe('dead-1');
    // …but the swallowed project is named, with both versions.
    expect(result.current.error).toContain('Acme Site');
    expect(result.current.error).toContain(`schema version ${SCHEMA_VERSION + 1}`);
    expect(result.current.error).toContain(`expects ${SCHEMA_VERSION}`);
    // Nothing was deleted — the data (and its switcher entry) survive.
    expect(localStorage.getItem('blastimage:session:dead-1')).not.toBeNull();
    await waitFor(() => expect(result.current.sessions.some((m) => m.id === 'dead-1')).toBe(true));
  });

  it('names the project when the active session is corrupt', async () => {
    seedStoredSession('dead-2', 'Half Written', '{ not valid json');
    localStorage.setItem('blastimage:active', 'dead-2');

    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(result.current.session!.name).toBe('My Website');
    expect(result.current.error).toContain('Half Written');
    expect(result.current.error).toContain('corrupt');
  });

  it('explains a dead switcher entry instead of snapping silently back', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    const before = result.current.session!.id;

    // The entry is selectable because its index row outlives the guard rejection.
    seedStoredSession('dead-3', 'Acme Site', futureSessionJson('dead-3', 'Acme Site'));
    await act(async () => result.current.switchSession('dead-3'));

    expect(result.current.session!.id).toBe(before);
    expect(result.current.error).toContain('Acme Site');
  });

  it('stays silent on the ordinary absent paths (first run, unknown id)', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.error).toBeNull();

    await act(async () => result.current.switchSession('never-stored'));
    expect(result.current.error).toBeNull();
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
  promoted: string[];
  unpromoted: string[];
  selections: Array<{ round: number; tasks: RoundSelectionTask[] }>;
  /** Filenames `approvedConflict` should report as already-taken (BI-032). */
  conflicts: string[];
} {
  const promoted: string[] = [];
  const unpromoted: string[] = [];
  const selections: Array<{ round: number; tasks: RoundSelectionTask[] }> = [];
  const conflicts: string[] = [];
  const api: ImagegenApi = {
    root: '/imagegen',
    linked: true,
    setLinkedRoot: async (path) => ({ ok: true, value: path }),
    browse: async () => ({ ok: true, value: { path: '/home', parent: null, entries: [] } }),
    suggestRoots: async () => [],
    listRounds: async () =>
      Object.keys(batches)
        .map(Number)
        .sort((a, b) => a - b)
        .map((round) => {
          const batch = batches[round]!;
          return {
            round,
            generatedAt: batch.generatedAt,
            taskCount: batch.tasks.length,
            imageCount: batch.tasks.reduce((n, t) => n + t.images.length, 0),
          };
        }),
    readRound: async (round) =>
      batches[round]
        ? { ok: true, value: batches[round]! }
        : { ok: false, error: `no round ${round}` },
    writeSelection: async (round, tasks) => {
      selections.push({ round, tasks });
      return { ok: true, value: undefined };
    },
    promoteApproved: async (_round, keeperFilename) => {
      promoted.push(keeperFilename);
      return { ok: true, value: undefined };
    },
    unpromoteApproved: async (keeperFilename) => {
      unpromoted.push(keeperFilename);
      return { ok: true, value: undefined };
    },
    approvedConflict: async (_round, keeperFilename) => ({
      ok: true,
      value: conflicts.includes(keeperFilename),
    }),
    resolveDisplayUrl: async (url) => url,
    // Display-blob lifetime (BI-042.2) is a render-path concern; this stub drives
    // the hook's approve/iterate orchestration, which never resolves for display.
    blobEpoch: 0,
    retainDisplayUrl: () => () => {},
    resolveBlob: async () => new Blob(['x']),
  };
  return { api, promoted, unpromoted, selections, conflicts };
}

function roundBatch(round: number, images: string[]): RoundBatch {
  return {
    schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
    round,
    generatedAt: '2026-08-08T00:00:00Z',
    tasks: [{ slug: 'hero', name: 'Hero', prompt: 'a hero image', images }],
  };
}

/**
 * Stubs window.confirm with a fixed answer; returns the prompts it received.
 * `confirm` is stubbed as a real global rather than mocked away, per the
 * project's seam preference. Shared by the two blocking-confirm guards
 * (BI-030.3 rename, BI-032 approve collision).
 */
function stubConfirm(answer: boolean): string[] {
  const asked: string[] = [];
  vi.stubGlobal('confirm', (message?: string) => {
    asked.push(message ?? '');
    return answer;
  });
  return asked;
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

/**
 * Approve collision guard (BI-032).
 *
 * `approved/` is flat and filename-keyed, so approving `hero-001.jpg` from r2
 * would silently replace r1's file of the same name. These pin the confirm and
 * — the part most likely to be silently wrong — the decision rollback that
 * keeps session state in step with disk when the user declines.
 */
describe('approve collision guard (BI-032)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  function twoRounds() {
    return recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
      2: roundBatch(2, ['hero-001.jpg']),
    });
  }

  it('does not ask when no file of that name is already approved', async () => {
    const asked = stubConfirm(true);
    const { api, promoted } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));

    await waitFor(() => expect(promoted).toEqual(['hero-001.jpg']));
    expect(asked).toEqual([]);
  });

  it('asks before replacing a different image already at that name, and promotes on accept', async () => {
    const asked = stubConfirm(true);
    const { api, promoted, selections, conflicts } = twoRounds();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const r1 = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(r1.taskId, r1.imageIds[0]!, 'approved'));
    await waitFor(() => expect(promoted).toHaveLength(1));

    conflicts.push('hero-001.jpg');
    const r2 = await loadHero(result, 2);
    await act(async () => result.current.setImageDecision(r2.taskId, r2.imageIds[0]!, 'approved'));

    await waitFor(() => expect(promoted).toEqual(['hero-001.jpg', 'hero-001.jpg']));
    expect(asked).toHaveLength(1);
    // Names the round the resident file came from, recovered from session state.
    expect(asked[0]).toContain('round 1');
    expect(selections).toHaveLength(2);
  });

  it('declining writes nothing and reverts the decision', async () => {
    stubConfirm(false);
    const { api, promoted, selections, conflicts } = twoRounds();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const r1 = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(r1.taskId, r1.imageIds[0]!, 'approved'));
    await waitFor(() => expect(promoted).toHaveLength(1));

    conflicts.push('hero-001.jpg');
    const r2 = await loadHero(result, 2);
    await act(async () => result.current.setImageDecision(r2.taskId, r2.imageIds[0]!, 'kept'));
    await act(async () => result.current.setImageDecision(r2.taskId, r2.imageIds[0]!, 'approved'));

    // Nothing new on disk, and the decision rolled back to what it was.
    expect(promoted).toEqual(['hero-001.jpg']);
    expect(selections).toHaveLength(1);
    await waitFor(() => {
      const task = result.current.session!.tasks.find((t) => t.id === r2.taskId)!;
      const image = task.iterations
        .flatMap((it) => it.images)
        .find((img) => img.id === r2.imageIds[0]!)!;
      expect(image.decision).toBe('kept');
    });
  });

  it('a declined approve via submitFeedback keeps the feedback it committed', async () => {
    stubConfirm(false);
    const { api, promoted, conflicts } = twoRounds();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const r1 = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(r1.taskId, r1.imageIds[0]!, 'approved'));
    await waitFor(() => expect(promoted).toHaveLength(1));

    conflicts.push('hero-001.jpg');
    const r2 = await loadHero(result, 2);
    await act(async () =>
      result.current.submitFeedback(
        r2.taskId,
        r2.imageIds[0]!,
        { text: 'warmer tones', useAsReference: true },
        'approve',
      ),
    );

    expect(promoted).toEqual(['hero-001.jpg']);
    await waitFor(() => {
      const task = result.current.session!.tasks.find((t) => t.id === r2.taskId)!;
      const image = task.iterations
        .flatMap((it) => it.images)
        .find((img) => img.id === r2.imageIds[0]!)!;
      expect(image.decision).toBe('undecided');
      expect(image.feedback?.text).toBe('warmer tones');
    });
  });
});

/**
 * Rename slug guard (BI-030.3).
 *
 * `slugify(task.name)` is the only thing joining a task to the round files on
 * disk, and the disk side of that join comes from the host repo's tasks.json —
 * so a rename orphans the task. These pin the hook's confirm orchestration; the
 * pure decision is covered in `workspace.test.ts`. `confirm` is stubbed as a
 * real global rather than mocked away, per the project's seam preference.
 */
describe('rename slug guard (BI-030.3)', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('warns before a rename that would orphan the task, and reverts on decline', async () => {
    const { api } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId } = await loadHero(result, 1);
    const asked = stubConfirm(false);

    let applied!: boolean;
    await act(async () => {
      applied = result.current.renameTask(taskId, 'Hero image');
    });

    expect(applied).toBe(false);
    expect(result.current.session!.tasks.find((t) => t.id === taskId)!.name).toBe('Hero');
    expect(asked).toHaveLength(1);
    expect(asked[0]).toContain('“hero”');
    expect(asked[0]).toContain('“hero-image”');
    expect(asked[0]).toContain('round r1');
  });

  it('applies the rename when the warning is accepted', async () => {
    const { api } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId } = await loadHero(result, 1);
    const asked = stubConfirm(true);

    let applied!: boolean;
    await act(async () => {
      applied = result.current.renameTask(taskId, 'Hero image');
    });

    expect(applied).toBe(true);
    expect(result.current.session!.tasks.find((t) => t.id === taskId)!.name).toBe('Hero image');
    expect(asked).toHaveLength(1);
  });

  it('does not warn for a slug-preserving rename', async () => {
    const { api } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId } = await loadHero(result, 1);
    const asked = stubConfirm(false);

    await act(async () => result.current.renameTask(taskId, 'HERO!'));

    expect(asked).toEqual([]);
    expect(result.current.session!.tasks.find((t) => t.id === taskId)!.name).toBe('HERO!');
  });

  it('does not warn for a task with no on-disk round images', async () => {
    const { result } = renderHook(() => useWorkspace());
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => result.current.addTask('Hero'));
    const taskId = result.current.activeTaskId!;
    const asked = stubConfirm(false);

    await act(async () => result.current.renameTask(taskId, 'Hero image'));

    expect(asked).toEqual([]);
    expect(result.current.session!.tasks.find((t) => t.id === taskId)!.name).toBe('Hero image');
  });
});

/**
 * Delete-task retraction (BI-033).
 *
 * Deleting a task severs the slug join `renameSlugBreak` guards from the other
 * side. The delete itself never writes to disk; the cleanup is opt-in from the
 * modal, so these pin that the opt-in is honoured in both directions and that
 * the flat-`approved/` guard survives the widening from one image to a whole
 * task. The imagegen seam is injected, as in the BI-030.2 / BI-032 blocks above.
 */
describe('delete-task retraction (BI-033)', () => {
  it('removes the approved copies and clears the selection entry when opted in', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg', 'hero-002.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(1));

    await act(async () => result.current.deleteTask(taskId, { removeApproved: true }));

    expect(result.current.session!.tasks.find((t) => t.id === taskId)).toBeUndefined();
    await waitFor(() => expect(unpromoted).toEqual(['hero-001.jpg']));
    await waitFor(() => expect(selections).toHaveLength(2));
    expect(selections[1]).toEqual({ round: 1, tasks: [{ slug: 'hero', decision: 'skip' }] });
  });

  it('writes nothing to disk when the cleanup is not opted into', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);

    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(1));

    await act(async () => result.current.deleteTask(taskId));

    expect(result.current.session!.tasks.find((t) => t.id === taskId)).toBeUndefined();
    expect(unpromoted).toEqual([]);
    expect(selections).toHaveLength(1); // still just the approve write
  });

  it('clears the selection entry for every round the task appeared in', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
      2: roundBatch(2, ['hero-001.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await loadHero(result, 1);
    const { taskId } = await loadHero(result, 2);

    // Nothing approved: the entries to retract are iterate/approve leftovers,
    // which a `skip` per round clears by slug merge.
    await act(async () => result.current.deleteTask(taskId, { removeApproved: true }));

    await waitFor(() => expect(selections).toHaveLength(2));
    expect(selections.map((s) => s.round)).toEqual([1, 2]);
    expect(selections.every((s) => s.tasks[0]!.decision === 'skip')).toBe(true);
    expect(unpromoted).toEqual([]); // no approved copies to remove
  });

  it('keeps an approved/ file another task’s approval still needs', async () => {
    // Two tasks whose round images land on the same flat approved/ name — the
    // BI-030.2 collision, widened from one cleared image to a whole task.
    const batch: RoundBatch = {
      schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
      round: 1,
      generatedAt: '2026-08-08T00:00:00Z',
      tasks: [
        { slug: 'hero', name: 'Hero', prompt: 'a hero image', images: ['shared-001.jpg'] },
        { slug: 'other', name: 'Other', prompt: 'another image', images: ['shared-001.jpg'] },
      ],
    };
    const { api, unpromoted } = recordingImagegen({ 1: batch });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      await result.current.loadRound(1);
    });

    const tasks = result.current.session!.tasks;
    const hero = tasks.find((t) => t.name === 'Hero')!;
    const other = tasks.find((t) => t.name === 'Other')!;
    const approveFirst = (t: typeof hero) =>
      result.current.setImageDecision(t.id, t.iterations[0]!.images[0]!.id, 'approved');
    await act(async () => approveFirst(hero));
    await act(async () => approveFirst(other));

    await act(async () => result.current.deleteTask(hero.id, { removeApproved: true }));

    // Other still holds an approval on shared-001.jpg, so the file stays.
    expect(unpromoted).toEqual([]);
  });

  it('is a session-only delete while the imagegen folder is unlinked', async () => {
    const { api, unpromoted, selections } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    const { taskId, imageIds } = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    await waitFor(() => expect(selections).toHaveLength(1));

    // The folder goes away, as in a browser session that never re-linked.
    // Mutating the injected seam mirrors the `conflicts` list above — the hook
    // reads `imagegen.linked` at call time, off this same object.
    api.linked = false;

    await act(async () => result.current.deleteTask(taskId, { removeApproved: true }));

    expect(result.current.session!.tasks.find((t) => t.id === taskId)).toBeUndefined();
    expect(unpromoted).toEqual([]);
    expect(selections).toHaveLength(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────
// Project ↔ imagegen folder binding (BI-047)
// ─────────────────────────────────────────────────────────────────────────

/**
 * An `ImagegenApi` whose live root is its own state — which is what the real
 * provider holds — so "the link follows the open project" is observable without
 * going through React. `rejects` makes named paths fail the way a folder that
 * has been moved or deleted does.
 */
function bindingImagegen(rejects: string[] = []): {
  api: ImagegenApi;
  live: () => string | null;
  pointedAt: Array<string | null>;
} {
  const pointedAt: Array<string | null> = [];
  let live: string | null = null;
  const api: ImagegenApi = {
    get root() {
      return live;
    },
    get linked() {
      return live !== null;
    },
    setLinkedRoot: async (path) => {
      pointedAt.push(path);
      if (path !== null && rejects.includes(path)) {
        live = null;
        return { ok: false, error: `No such folder: ${path}` };
      }
      live = path;
      return { ok: true, value: path };
    },
    browse: async () => ({ ok: true, value: { path: '/home', parent: null, entries: [] } }),
    suggestRoots: async () => [],
    listRounds: async () => [],
    readRound: async () => ({ ok: false, error: 'no rounds' }),
    writeSelection: async () => ({ ok: true, value: undefined }),
    promoteApproved: async () => ({ ok: true, value: undefined }),
    unpromoteApproved: async () => ({ ok: true, value: undefined }),
    approvedConflict: async () => ({ ok: true, value: false }),
    resolveDisplayUrl: async (url) => url,
    blobEpoch: 0,
    retainDisplayUrl: () => () => {},
    resolveBlob: async () => new Blob(),
  };
  return { api, live: () => live, pointedAt };
}

/** A stored session at the current schema, optionally already bound to a folder. */
function storedSessionJson(id: string, name: string, imagegenRoot?: string): string {
  const now = '2026-08-08T00:00:00.000Z';
  return JSON.stringify({
    id,
    name,
    tasks: [],
    refLibrary: [],
    createdAt: now,
    updatedAt: now,
    schemaVersion: SCHEMA_VERSION,
    ...(imagegenRoot ? { imagegenRoot } : {}),
  });
}

/** Links `path` for the active project and hands back what the picker would see. */
async function link(
  result: { current: ReturnType<typeof useWorkspace> },
  path: string,
): Promise<LinkOutcome> {
  let outcome!: LinkOutcome;
  await act(async () => {
    outcome = await result.current.linkImagegenFolder(path);
  });
  return outcome;
}

describe('binding a folder to a project (BI-047)', () => {
  it('binds the folder and names a still-default project after the repo', async () => {
    const { api, live } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    expect(await link(result, '/Code/spinalcord/imagegen')).toEqual({ status: 'linked' });

    expect(result.current.session!.imagegenRoot).toBe('/Code/spinalcord/imagegen');
    expect(result.current.session!.name).toBe('spinalcord');
    expect(live()).toBe('/Code/spinalcord/imagegen');
    // Persisted, not just held: the binding has to survive a refresh.
    const stored = loadSession(result.current.session!.id);
    expect(stored.status === 'ok' && stored.session.imagegenRoot).toBe('/Code/spinalcord/imagegen');
  });

  it('leaves a project the operator named alone', async () => {
    const { api } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => result.current.renameSession('Acme Site'));

    await link(result, '/Code/spinalcord/imagegen');

    expect(result.current.session!.name).toBe('Acme Site');
    expect(result.current.session!.imagegenRoot).toBe('/Code/spinalcord/imagegen');
  });

  it('still names a default-named project that already has tasks (BI-053.2)', async () => {
    const { api } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => result.current.addTask('Hero'));

    await link(result, '/Code/spinalcord/imagegen');

    expect(result.current.session!.name).toBe('spinalcord');
  });
});

/**
 * The bug the binding closes. Round images are stored as root-relative
 * `imagegen:` URLs, so whichever folder is live is the one they resolve
 * against — and the one selections and approvals are written into. If the link
 * did not follow the project, a switch would silently re-point the project on
 * screen at another repo's folder.
 */
describe('the live link follows the open project (BI-047)', () => {
  it('re-points at each project\'s own folder across a switch, and unlinks for an unbound one', async () => {
    const { api, live } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await link(result, '/Code/alpha/imagegen');
    const alphaId = result.current.session!.id;

    await act(async () => result.current.createSession('Beta'));
    // A project nobody has linked a folder for shows none.
    expect(live()).toBe(null);
    await link(result, '/Code/beta/imagegen');
    const betaId = result.current.session!.id;
    expect(live()).toBe('/Code/beta/imagegen');

    await act(async () => result.current.switchSession(alphaId));
    await waitFor(() => expect(result.current.session!.id).toBe(alphaId));
    expect(live()).toBe('/Code/alpha/imagegen');

    await act(async () => result.current.switchSession(betaId));
    await waitFor(() => expect(result.current.session!.id).toBe(betaId));
    expect(live()).toBe('/Code/beta/imagegen');
  });

  it('does not leak currentRound into a new project, and restores it on switch-back', async () => {
    const { api } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await loadHero(result, 1);
    expect(result.current.currentRound).toBe(1);
    const alphaId = result.current.session!.id;

    await act(async () => result.current.createSession('Beta'));
    expect(result.current.currentRound).toBe(null);

    await act(async () => result.current.switchSession(alphaId));
    await waitFor(() => expect(result.current.session!.id).toBe(alphaId));
    expect(result.current.currentRound).toBe(1);
  });

  it('reports a bound folder that no longer resolves, and links nothing instead', async () => {
    seedStoredSession('gone-1', 'Acme Site', storedSessionJson('gone-1', 'Acme Site', '/gone/imagegen'));
    localStorage.setItem('blastimage:active', 'gone-1');
    const { api, live } = bindingImagegen(['/gone/imagegen']);

    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.error).toBeTruthy());

    expect(result.current.error).toContain('Acme Site');
    expect(result.current.error).toContain('/gone/imagegen');
    expect(live()).toBe(null);
    // The binding survives — the folder may come back; the link does not guess.
    expect(result.current.session!.imagegenRoot).toBe('/gone/imagegen');
  });
});

describe('a folder another project already owns (BI-047)', () => {
  it('names the owner, links nothing, and leaves the active project unbound', async () => {
    const { api, live } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await link(result, '/Code/shared/imagegen');
    const ownerId = result.current.session!.id;
    const ownerName = result.current.session!.name;
    await act(async () => result.current.createSession('Beta'));

    const outcome = await link(result, '/Code/shared/imagegen');

    expect(outcome).toEqual({
      status: 'owned',
      ownerId,
      ownerName,
      root: '/Code/shared/imagegen',
    });
    expect(result.current.session!.imagegenRoot ?? null).toBe(null);
    // Reverted: the picker left the live link where the active project had it.
    expect(live()).toBe(null);
  });

  it('lets a project re-link the folder it already owns', async () => {
    const { api } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    await link(result, '/Code/alpha/imagegen');
    expect(await link(result, '/Code/alpha/imagegen')).toEqual({ status: 'linked' });
  });
});

/**
 * Before BI-047 the root lived in one app-wide key. Adopting it means an
 * operator who had linked a folder does not have to link it again; clearing it
 * means a second project never inherits the same folder silently.
 */
describe('adopting the pre-BI-047 app-wide root', () => {
  it('binds it to the project open at first load, then forgets the key', async () => {
    localStorage.setItem('blastimage:imagegen-root', '/Code/legacy/imagegen');
    const { api, live } = bindingImagegen();

    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.session?.imagegenRoot).toBe('/Code/legacy/imagegen'));

    expect(live()).toBe('/Code/legacy/imagegen');
    expect(localStorage.getItem('blastimage:imagegen-root')).toBe(null);
  });

  it('does not hand the same folder to a project created afterwards', async () => {
    localStorage.setItem('blastimage:imagegen-root', '/Code/legacy/imagegen');
    const { api, live } = bindingImagegen();
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.session?.imagegenRoot).toBe('/Code/legacy/imagegen'));

    await act(async () => result.current.createSession('Beta'));

    expect(result.current.session!.imagegenRoot ?? null).toBe(null);
    expect(live()).toBe(null);
  });
});

/**
 * The round list belongs to the folder that produced it. BI-047 made the
 * folder a property of the project, so an unlink (or a switch to a project
 * with no folder) has to empty the list *immediately* — a switched project
 * showing the previous repo's rounds is the failure this pins.
 *
 * Characterization coverage added by BI-050 before rewriting where the clear
 * happens: it passes against the discover effect's `!linked` branch and
 * against the render-time adjustment that replaced it.
 */
describe('availableRounds tracks the linked folder (BI-047)', () => {
  it('discovers rounds while linked and empties the list the moment the link drops', async () => {
    const { api } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']), 2: roundBatch(2, []) });

    const { result, rerender } = renderHook(({ a }: { a: ImagegenApi }) => useWorkspace(a), {
      initialProps: { a: api },
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(result.current.availableRounds).toEqual([1, 2]));

    // A project switch to one with no folder: same shape the provider serves
    // when `root` goes back to null.
    const unlinked: ImagegenApi = { ...api, root: null, linked: false, listRounds: async () => [] };
    await act(async () => {
      rerender({ a: unlinked });
    });

    expect(result.current.availableRounds).toEqual([]);
  });

  it('re-discovers when a folder is linked again', async () => {
    const { api } = recordingImagegen({ 3: roundBatch(3, ['hero-003.jpg']) });
    const unlinked: ImagegenApi = { ...api, root: null, linked: false, listRounds: async () => [] };

    const { result, rerender } = renderHook(({ a }: { a: ImagegenApi }) => useWorkspace(a), {
      initialProps: { a: unlinked },
    });
    await waitFor(() => expect(result.current.ready).toBe(true));
    expect(result.current.availableRounds).toEqual([]);

    await act(async () => {
      rerender({ a: api });
    });

    await waitFor(() => expect(result.current.availableRounds).toEqual([3]));
  });
});

describe('loadRound no-arg ingests missing rounds only (BI-053.3)', () => {
  it('ingests every on-disk round the session does not already hold', async () => {
    const { api } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
      2: roundBatch(2, ['hero-002.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await waitFor(() => expect(result.current.availableRounds).toEqual([1, 2]));

    await act(async () => {
      await result.current.loadRound();
    });

    expect(result.current.currentRound).toBe(2);
    const task = result.current.session!.tasks.find((t) => t.name === 'Hero')!;
    expect(task.iterations).toHaveLength(2);
  });

  it('keeps review decisions when the same rounds are refreshed', async () => {
    const { api } = recordingImagegen({ 1: roundBatch(1, ['hero-001.jpg']) });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const { taskId, imageIds } = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'approved'));
    const keptId = imageIds[0]!;

    await act(async () => {
      await result.current.loadRound();
    });

    const task = result.current.session!.tasks.find((t) => t.id === taskId)!;
    const image = task.iterations[0]!.images[0]!;
    expect(image.id).toBe(keptId);
    expect(image.decision).toBe('approved');
  });

  it('ingests a newly appeared round without rewriting an earlier one', async () => {
    const batches: Record<number, RoundBatch> = {
      1: roundBatch(1, ['hero-001.jpg']),
    };
    const { api } = recordingImagegen(batches);
    // recordingImagegen closes over `batches`, so growing it is how ↻ sees r2.
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));

    const { taskId, imageIds } = await loadHero(result, 1);
    await act(async () => result.current.setImageDecision(taskId, imageIds[0]!, 'kept'));

    batches[2] = roundBatch(2, ['hero-002.jpg']);
    await act(async () => {
      await result.current.loadRound();
    });

    const task = result.current.session!.tasks.find((t) => t.id === taskId)!;
    expect(task.iterations).toHaveLength(2);
    expect(task.iterations[0]!.images[0]!.decision).toBe('kept');
    expect(task.iterations[0]!.images[0]!.id).toBe(imageIds[0]);
    expect(result.current.currentRound).toBe(1);
    expect(result.current.availableRounds).toEqual([1, 2]);
  });

  it('setCurrentRound persists the view without re-ingesting', async () => {
    const { api } = recordingImagegen({
      1: roundBatch(1, ['hero-001.jpg']),
      2: roundBatch(2, ['hero-002.jpg']),
    });
    const { result } = renderHook(() => useWorkspace(api));
    await waitFor(() => expect(result.current.ready).toBe(true));
    await act(async () => {
      await result.current.loadRound();
    });
    expect(result.current.currentRound).toBe(2);
    const imageId = result.current.session!.tasks[0]!.iterations[0]!.images[0]!.id;

    await act(async () => result.current.setCurrentRound(1));
    expect(result.current.currentRound).toBe(1);
    expect(result.current.session!.tasks[0]!.iterations[0]!.images[0]!.id).toBe(imageId);
  });
});
