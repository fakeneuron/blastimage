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
 *
 * BI-035.3 added the second describe block below. It is naming coverage, not
 * behaviour coverage — the sidebar's accessible names are invisible to every
 * assertion above, and the delete test had been querying by `title` precisely
 * because the buttons had no usable name.
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

    // Queried by role+name since BI-035.3. This was a `getByTitle` query, with a
    // comment noting the 🗑 glyph won the accessible-name computation over the
    // title — that is exactly the defect BI-035.3 fixed, so the button now has a
    // name to query by and the title is only the hover tooltip.
    fireEvent.click(screen.getByRole('button', { name: 'Delete task' }));

    expect(confirmed).not.toHaveBeenCalled();
    expect(onDeleteTask).toHaveBeenCalledWith('t1');
  });
});

/**
 * Accessible naming (BI-035.3)
 *
 * These pin names, not markup: every assertion goes through `getByRole`'s
 * accessible-name computation, so it fails whether the label is deleted, renamed,
 * or shadowed by button content. The Import pair and the round chips are the two
 * cases worth pinning explicitly — both were ambiguous by name before this task.
 */
describe('Sidebar accessible names (BI-035.3)', () => {
  it('associates the visible Project label with the session select', () => {
    render(<Sidebar {...makeProps()} />);

    // The label sat above the select with no htmlFor, so the two were related by
    // layout only and the control announced as an unnamed combobox.
    expect(screen.getByRole('combobox', { name: 'Project' })).toBeTruthy();
  });

  it('names both icon-only task buttons', () => {
    const session = makeSession({ tasks: [makeTask('t1', 'Hero banner')] });
    render(<Sidebar {...makeProps({ session })} />);

    expect(screen.getByRole('button', { name: 'Rename task' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Delete task' })).toBeTruthy();
  });

  it('gives the two Import buttons distinct names', () => {
    render(<Sidebar {...makeProps()} />);

    // Both render "Import" beside a different glyph; by name alone they were
    // indistinguishable in a screen reader's button list before BI-035.3.
    expect(screen.getByRole('button', { name: 'Import project backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import tasks from JSON' })).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^Import$/ })).toHaveLength(0);
  });

  it('qualifies the project controls that were bare verbs', () => {
    render(<Sidebar {...makeProps()} />);

    expect(screen.getByRole('button', { name: 'New project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rename project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export project backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Build task-import file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New task' })).toBeTruthy();
  });

  it('names the round chips with the round they load', () => {
    render(<Sidebar {...makeProps({ imagegenLinked: true, availableRounds: [1, 2, 3] })} />);

    // The chips render bare "r1"/"r2"/"r3". The name keeps that visible text
    // inside it (WCAG 2.5.3) rather than replacing it with "Load round 1".
    expect(screen.getByRole('button', { name: 'Load round r1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Load round r2' })).toBeTruthy();
    // r3 is also the latest, so it names both the chip and the ↻ button.
    expect(screen.getAllByRole('button', { name: 'Load round r3' })).toHaveLength(2);
  });

  it('drops the round suffix from the load button when no rounds exist', () => {
    render(<Sidebar {...makeProps({ imagegenLinked: true, availableRounds: [] })} />);

    expect(screen.getByRole('button', { name: 'Load round' })).toBeTruthy();
  });

  it('names the imagegen link button for its current state', () => {
    const { unmount } = render(<Sidebar {...makeProps({ imagegenLinked: false })} />);
    expect(screen.getByRole('button', { name: 'Link imagegen' })).toBeTruthy();

    unmount();
    render(<Sidebar {...makeProps({ imagegenLinked: true })} />);
    expect(screen.getByRole('button', { name: 'imagegen linked' })).toBeTruthy();
  });

  it('keeps title alongside the name where the title carries extra detail', () => {
    // BI-031.2's disabled-reason string belongs in the tooltip, not the name.
    render(<Sidebar {...makeProps({ canGenerateAll: false, generationAvailable: false })} />);

    const button = screen.getByRole('button', { name: 'Generate All' });
    expect(button.getAttribute('title')).toContain('Grok-Build-only');
  });
});
