/**
 * Workspace auto-load-round effect tests (TEST-001.3)
 *
 * BI-026 added a one-shot effect to `Workspace.tsx` that loads the latest
 * imagegen round automatically once the folder link and round list resolve, so
 * a linked session shows its images without a manual load click. BI-053.3
 * kept the effect and pointed it at ingest-missing (no-arg `loadRound()`). It
 * shipped verified by trace and a green suite only ("Updated/added tests —
 * N/A"), because no component test path existed at the time. TEST-001.2 opened
 * that path; this file spends it on the effect's four documented behaviours —
 * fires when the gates open, at most once per mount, never overrides a round
 * the user already loaded, and opens the bulk-review pane for a multi-task
 * round — plus the negative side of every gate.
 *
 * `Workspace` has no injection seam: it constructs its own `ImagegenProvider`
 * and calls `useWorkspace()` internally. Since the effect is expressed purely
 * over that hook's outputs, the hook is the one thing mocked here — the repo's
 * first `vi.mock`, everything else runs for real. `ImagegenProvider` is safe to
 * mount because happy-dom exposes no `indexedDB` and `loadImagegenHandle`
 * short-circuits on that, so the handle restore resolves to `null`.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import Workspace from './Workspace';
import type { UseWorkspace } from '@/lib/useWorkspace';
import { SCHEMA_VERSION, type ID, type PromptTask, type Session } from '@/lib/types';

/**
 * The hook result the mocked `useWorkspace` hands back, swapped per test.
 * Hoisted so the `vi.mock` factory below can close over it.
 */
const hoisted = vi.hoisted(() => ({ ws: null as unknown }));

// Only `useWorkspace` itself is replaced — `DEFAULT_BATCH_SIZE` lives in the
// same module and is imported by TaskDetail + BulkReviewPane, so the original
// exports are spread back in.
vi.mock('@/lib/useWorkspace', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/useWorkspace')>();
  return { ...actual, useWorkspace: () => hoisted.ws };
});

const NOW = '2026-08-06T00:00:00.000Z';

function makeTask(id: ID, name: string): PromptTask {
  return {
    id,
    name,
    basePrompt: '',
    activeRefImageIds: [],
    iterations: [],
    createdAt: NOW,
    updatedAt: NOW,
  };
}

function makeSession(overrides: Partial<Session> = {}): Session {
  return {
    id: 's1',
    name: 'Demo Site',
    tasks: [makeTask('t1', 'Hero banner'), makeTask('t2', 'Team photo')],
    refLibrary: [],
    createdAt: NOW,
    updatedAt: NOW,
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  };
}

/**
 * Full `UseWorkspace` stub with no-op handlers; each test overrides only the
 * members the auto-load effect reads. Typed as the real interface on purpose —
 * a hook-contract change surfaces as a typecheck failure rather than a mock
 * that has silently drifted out of date.
 */
function makeWorkspace(overrides: Partial<UseWorkspace> = {}): UseWorkspace {
  const session = overrides.session === undefined ? makeSession() : overrides.session;
  return {
    ready: true,
    session,
    sessions: session ? [{ id: session.id, name: session.name, updatedAt: session.updatedAt }] : [],
    activeTask: null,
    activeTaskId: null,
    generatingTaskIds: [],
    error: null,
    approvedImages: [],
    createSession: () => {},
    switchSession: () => {},
    renameSession: () => {},
    addTask: () => {},
    importTasks: () => {},
    importSessionBackup: () => {},
    renameTask: () => true,
    deleteTask: () => {},
    setTaskPrompt: () => {},
    generate: async () => {},
    generateAll: () => [],
    selectTask: () => {},
    setImageDecision: () => {},
    setImageRating: () => {},
    submitFeedback: () => {},
    addRefImage: () => {},
    removeRefImage: () => {},
    toggleTaskRef: () => {},
    dismissError: () => {},
    exportSession: () => {},
    exportAll: () => {},
    exportToFolder: async () => {},
    exportReviewSheet: async () => {},
    generationAvailable: false,
    imagegenLinked: true,
    imagegenRoot: '/repo/imagegen',
    linkImagegenFolder: async () => ({ status: 'linked' as const }),
    browseImagegen: async () => ({ ok: true, value: { path: '/home', parent: null, entries: [] } }),
    suggestImagegenRoots: async () => [],
    loadRound: async () => null,
    currentRound: null,
    setCurrentRound: () => {},
    requestNextRound: async () => {},
    availableRounds: [1],
    roundSummaries: [{ round: 1, generatedAt: '', taskCount: 0, imageCount: 0 }],
    refreshAvailableRounds: async () => {},
    ...overrides,
  };
}

/** Installs the hook result for the next render. */
function install(overrides: Partial<UseWorkspace> = {}): UseWorkspace {
  const ws = makeWorkspace(overrides);
  hoisted.ws = ws;
  return ws;
}

/** Flushes the provider's mount-time restore and any effect microtasks. */
async function flush(): Promise<void> {
  await act(async () => {});
}

beforeEach(() => {
  hoisted.ws = null;
});

afterEach(() => {
  cleanup();
});

describe('Workspace auto-load-round effect (BI-026)', () => {
  it('loads the latest round once every gate is open', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound });

    render(<Workspace />);
    await flush();

    expect(loadRound).toHaveBeenCalledTimes(1);
    // No argument — loadRound() re-lists and ingests missing rounds.
    expect(loadRound).toHaveBeenCalledWith();
  });

  it('waits for the imagegen folder link before firing', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound, imagegenLinked: false });

    const { rerender } = render(<Workspace />);
    await flush();
    expect(loadRound).not.toHaveBeenCalled();

    install({ loadRound, imagegenLinked: true });
    rerender(<Workspace />);
    await flush();

    expect(loadRound).toHaveBeenCalledTimes(1);
  });

  it('waits for the mount-time load before firing', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound, ready: false, session: null });

    const { rerender } = render(<Workspace />);
    await flush();
    expect(loadRound).not.toHaveBeenCalled();

    install({ loadRound, ready: true });
    rerender(<Workspace />);
    await flush();

    expect(loadRound).toHaveBeenCalledTimes(1);
  });

  it('does not fire when no rounds are available', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound, availableRounds: [] });

    render(<Workspace />);
    await flush();

    expect(loadRound).not.toHaveBeenCalled();
  });

  it('still fires ingest-missing when currentRound is already set', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound, currentRound: 3, availableRounds: [1, 2, 3] });

    render(<Workspace />);
    await flush();

    // Remount / first shot for this session must still pick up new rounds
    // (BI-053.3); viewing r3 is not a skip.
    expect(loadRound).toHaveBeenCalledTimes(1);
    expect(loadRound).toHaveBeenCalledWith();
  });

  it('fires at most once per session even as the gate inputs churn', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound });

    const { rerender } = render(<Workspace />);
    await flush();
    expect(loadRound).toHaveBeenCalledTimes(1);

    // `currentRound` stays null (the stub does not model the commit), so only the
    // per-session ref stands between this and a re-fire on every dependency change.
    install({ loadRound, availableRounds: [1, 2] });
    rerender(<Workspace />);
    await flush();

    install({ loadRound, availableRounds: [1, 2, 3] });
    rerender(<Workspace />);
    await flush();

    expect(loadRound).toHaveBeenCalledTimes(1);
  });

  it('fires again after a project switch (session id changes)', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound });

    const { rerender } = render(<Workspace />);
    await flush();
    expect(loadRound).toHaveBeenCalledTimes(1);

    install({
      loadRound,
      currentRound: null,
      session: makeSession({ id: 's2', name: 'Other' }),
    });
    rerender(<Workspace />);
    await flush();

    expect(loadRound).toHaveBeenCalledTimes(2);
  });

  it('chip click selects the round view instead of re-ingesting (BI-053.4)', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    const setCurrentRound = vi.fn();
    install({
      loadRound,
      setCurrentRound,
      currentRound: 1,
      availableRounds: [1, 2],
      roundSummaries: [
        { round: 1, generatedAt: '', taskCount: 1, imageCount: 2 },
        { round: 2, generatedAt: '', taskCount: 1, imageCount: 2 },
      ],
    });

    render(<Workspace />);
    await flush();
    loadRound.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Load round r2' }));
    expect(setCurrentRound).toHaveBeenCalledWith(2);
    expect(loadRound).not.toHaveBeenCalled();
  });
});

describe('Workspace auto-load bulk-review branch (BI-026)', () => {
  it('opens the bulk-review pane for a multi-task round', async () => {
    install({ loadRound: vi.fn(async () => ['t1', 't2']) });

    render(<Workspace />);

    await waitFor(() =>
      expect(screen.getByRole('heading', { name: /Bulk review · 2 tasks/ })).toBeTruthy(),
    );
  });

  it('stays on the single-task view for a one-task round', async () => {
    install({ loadRound: vi.fn(async () => ['t1']) });

    render(<Workspace />);
    await flush();

    expect(screen.queryByRole('heading', { name: /Bulk review/ })).toBeNull();
    // TaskDetail's no-selection state — proves the pane, not just the heading, is absent.
    expect(screen.getByText('Select a task, or add one from the sidebar.')).toBeTruthy();
  });

  it('stays on the single-task view when the round loads nothing', async () => {
    install({ loadRound: vi.fn(async () => null) });

    render(<Workspace />);
    await flush();

    expect(screen.queryByRole('heading', { name: /Bulk review/ })).toBeNull();
  });
});
