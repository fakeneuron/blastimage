/**
 * Workspace auto-load-round effect tests (TEST-001.3)
 *
 * BI-026 added a one-shot effect to `Workspace.tsx` that loads the latest
 * imagegen round automatically once the folder link and round list resolve, so
 * a linked session shows its images without a manual "↻ Load round" click. It
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
import { act, cleanup, render, screen, waitFor } from '@testing-library/react';

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
    imagegenLinked: true,
    linkImagegenFolder: async () => {},
    loadRound: async () => null,
    loadedRound: null,
    requestNextRound: async () => {},
    availableRounds: [1],
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
    // No argument — loadRound() defaults to the highest available round.
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

  it('never overrides a round the user already loaded', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound, loadedRound: 3 });

    const { rerender } = render(<Workspace />);
    await flush();

    // Still nothing after the round list grows — a manual load keeps precedence
    // for the whole mount, not just the first render.
    install({ loadRound, loadedRound: 3, availableRounds: [1, 2] });
    rerender(<Workspace />);
    await flush();

    expect(loadRound).not.toHaveBeenCalled();
  });

  it('fires at most once per mount even as the gate inputs churn', async () => {
    const loadRound = vi.fn(async () => ['t1']);
    install({ loadRound });

    const { rerender } = render(<Workspace />);
    await flush();
    expect(loadRound).toHaveBeenCalledTimes(1);

    // `loadedRound` stays null (the stub does not model the commit), so only the
    // one-shot ref stands between this and a re-fire on every dependency change.
    install({ loadRound, availableRounds: [1, 2] });
    rerender(<Workspace />);
    await flush();

    install({ loadRound, availableRounds: [1, 2, 3] });
    rerender(<Workspace />);
    await flush();

    expect(loadRound).toHaveBeenCalledTimes(1);
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
