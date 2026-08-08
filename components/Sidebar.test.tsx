/**
 * Sidebar render smoke test (TEST-001.2)
 *
 * The repo's testing culture is deliberately lib-only (BI-021.3, CORE-001.1),
 * and until this task the vitest include glob (`lib/**\/*.test.ts`) could not
 * match a `.tsx` file at all — so a component test added by any later task
 * would have silently not run. This file is the proof that the widened glob
 * discovers and executes component tests: it renders the one substantial
 * props-only component (Sidebar takes no context and pulls in no
 * `ResolvedImage`, so it needs no provider wrapper) and asserts the two pieces
 * of real conditional logic it owns — task-list rendering and the Generate All
 * enabled/disabled gate.
 *
 * Deliberately minimal. Broader component coverage belongs to TEST-001.3
 * (Workspace's auto-load-round effect) and BI-029.3 (the export path).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

import Sidebar from './Sidebar';
import { SCHEMA_VERSION, type PromptTask, type Session } from '@/lib/types';

const NOW = '2026-08-06T00:00:00.000Z';

function makeTask(id: string, name: string): PromptTask {
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
    tasks: [],
    refLibrary: [],
    createdAt: NOW,
    updatedAt: NOW,
    schemaVersion: SCHEMA_VERSION,
    ...overrides,
  };
}

/** Full prop set with no-op handlers; individual tests override what they assert on. */
function makeProps(
  overrides: Partial<React.ComponentProps<typeof Sidebar>> = {},
): React.ComponentProps<typeof Sidebar> {
  const session = overrides.session ?? makeSession();
  return {
    session,
    sessions: [{ id: session.id, name: session.name, updatedAt: session.updatedAt }],
    activeTaskId: null,
    canGenerateAll: false,
    generationAvailable: true,
    onSwitchSession: () => {},
    onCreateSession: () => {},
    onRenameSession: () => {},
    onExportSession: () => {},
    onImportSession: () => {},
    onAddTask: () => {},
    onOpenBuilder: () => {},
    onImportTasks: () => {},
    onSelectTask: () => {},
    onRenameTask: () => {},
    onDeleteTask: () => {},
    onGenerateAll: () => {},
    imagegenLinked: false,
    availableRounds: [],
    onLinkImagegen: () => {},
    onLoadRound: () => {},
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Sidebar (component-test harness smoke)', () => {
  it('renders one entry per task in the session', () => {
    const session = makeSession({
      tasks: [makeTask('t1', 'Hero banner'), makeTask('t2', 'Team photo')],
    });
    render(<Sidebar {...makeProps({ session })} />);

    expect(screen.getByText('Hero banner')).toBeTruthy();
    expect(screen.getByText('Team photo')).toBeTruthy();
  });

  it('shows the empty state when the session has no tasks', () => {
    render(<Sidebar {...makeProps()} />);

    expect(screen.getByText('No tasks yet. Add one to get started.')).toBeTruthy();
  });

  it('gates the Generate All button on canGenerateAll', () => {
    const { unmount } = render(<Sidebar {...makeProps({ canGenerateAll: false })} />);
    expect(screen.getByRole('button', { name: /Generate All/ }).hasAttribute('disabled')).toBe(true);

    unmount();
    render(<Sidebar {...makeProps({ canGenerateAll: true })} />);
    expect(screen.getByRole('button', { name: /Generate All/ }).hasAttribute('disabled')).toBe(
      false,
    );
  });

  it('states the missing-bridge reason instead of the eligibility one (BI-031.2)', () => {
    const { unmount } = render(
      <Sidebar {...makeProps({ canGenerateAll: false, generationAvailable: false })} />,
    );
    const disabled = screen.getByRole('button', { name: /Generate All/ });
    expect(disabled.hasAttribute('disabled')).toBe(true);
    expect(disabled.getAttribute('title')).toContain('Grok-Build-only');

    unmount();
    render(<Sidebar {...makeProps({ canGenerateAll: false, generationAvailable: true })} />);
    expect(screen.getByRole('button', { name: /Generate All/ }).getAttribute('title')).toContain(
      'No eligible tasks',
    );
  });

  it('delegates delete without confirming it itself (BI-033)', () => {
    // The confirmation moved to DeleteTaskModal, which can state what the
    // delete severs on disk; a window.confirm here would be a second dialog.
    const confirmed = vi.fn(() => true);
    vi.stubGlobal('confirm', confirmed);
    const onDeleteTask = vi.fn();
    const session = makeSession({ tasks: [makeTask('t1', 'Hero banner')] });
    render(<Sidebar {...makeProps({ session, onDeleteTask })} />);

    // Queried by title: the button's content is the 🗑 glyph, which wins the
    // accessible-name computation over the title attribute.
    fireEvent.click(screen.getByTitle('Delete task'));

    expect(confirmed).not.toHaveBeenCalled();
    expect(onDeleteTask).toHaveBeenCalledWith('t1');
  });
});
