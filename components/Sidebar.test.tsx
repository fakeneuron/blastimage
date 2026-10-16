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
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';

import Sidebar from './Sidebar';
import { roundImageUrl } from '@/lib/imagegenUrl';
import {
  SCHEMA_VERSION,
  type GeneratedImage,
  type Iteration,
  type PromptTask,
  type ReviewDecision,
  type Session,
} from '@/lib/types';

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
    imagegenRoot: null,
    availableRounds: [],
    roundSummaries: [],
    currentRound: null,
    onLinkImagegen: () => {},
    onLoadRound: () => {},
    onSelectRound: () => {},
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function openProjectMenu(): void {
  fireEvent.click(screen.getByRole('button', { name: 'Project menu' }));
}

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

  it('hides Generate All in viewer mode and states the terminal-loop note (BI-053.5)', () => {
    const { unmount } = render(
      <Sidebar {...makeProps({ canGenerateAll: false, generationAvailable: false })} />,
    );
    expect(screen.queryByRole('button', { name: /Generate All/ })).toBeNull();
    expect(screen.getByText(/Viewer mode/)).toBeTruthy();
    expect(screen.getByText('Viewer')).toBeTruthy();

    unmount();
    render(<Sidebar {...makeProps({ canGenerateAll: false, generationAvailable: true })} />);
    expect(screen.getByRole('button', { name: /Generate All/ }).getAttribute('title')).toContain(
      'No eligible tasks',
    );
    expect(screen.getByText('In-app')).toBeTruthy();
    expect(screen.queryByText(/Viewer mode/)).toBeNull();
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
    openProjectMenu();

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
    openProjectMenu();

    // Both render "Import" beside a different glyph; by name alone they were
    // indistinguishable in a screen reader's button list before BI-035.3.
    expect(screen.getByRole('button', { name: 'Import project backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import tasks from JSON' })).toBeTruthy();
    expect(screen.queryAllByRole('button', { name: /^Import$/ })).toHaveLength(0);
  });

  it('qualifies the project controls that were bare verbs', () => {
    render(<Sidebar {...makeProps()} />);
    openProjectMenu();

    expect(screen.getByRole('button', { name: 'New project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Rename Demo Site' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export project backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Build task-import file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New task' })).toBeTruthy();
  });

  it('names the round chips with the round they view', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: '/repo/imagegen', availableRounds: [1, 2, 3] })} />);

    // The chips render bare "r1"/"r2"/"r3". The name keeps that visible text
    // inside it (WCAG 2.5.3) rather than replacing it with "View round 1".
    expect(screen.getByRole('button', { name: 'View round r1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View round r2' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'View round r3' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh rounds' })).toBeTruthy();
  });

  it('still offers a refresh control when no rounds exist', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: '/repo/imagegen', availableRounds: [] })} />);

    expect(screen.getByRole('button', { name: 'Refresh rounds' })).toBeTruthy();
  });

  it('shows a view chip even when only one round exists', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: '/repo/imagegen', availableRounds: [1] })} />);

    expect(screen.getByRole('button', { name: 'View round r1' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh rounds' })).toBeTruthy();
  });

  it('highlights the current round and selects the view on chip click (BI-053.4)', () => {
    const onSelectRound = vi.fn();
    const onLoadRound = vi.fn();
    render(
      <Sidebar
        {...makeProps({
          imagegenRoot: '/repo/imagegen',
          availableRounds: [1, 2],
          roundSummaries: [
            { round: 1, generatedAt: '', taskCount: 1, imageCount: 2 },
            { round: 2, generatedAt: '', taskCount: 1, imageCount: 4 },
          ],
          currentRound: 2,
          onSelectRound,
          onLoadRound,
        })}
      />,
    );

    const r2 = screen.getByRole('button', { name: 'Reload round r2' });
    expect(r2.getAttribute('aria-current')).toBe('true');
    expect(screen.getByRole('button', { name: 'View round r1' }).getAttribute('aria-current')).toBeNull();
    expect(r2.getAttribute('title')).toContain('4 images');
    expect(r2.getAttribute('title')).toContain('Click again to reload from disk');

    fireEvent.click(screen.getByRole('button', { name: 'View round r1' }));
    expect(onSelectRound).toHaveBeenCalledWith(1);
    expect(onLoadRound).not.toHaveBeenCalled();
  });

  it('reloads the current round from disk on current-chip click (BI-056)', () => {
    const onSelectRound = vi.fn();
    const onLoadRound = vi.fn();
    render(
      <Sidebar
        {...makeProps({
          imagegenRoot: '/repo/imagegen',
          availableRounds: [1, 2],
          currentRound: 2,
          onSelectRound,
          onLoadRound,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reload round r2' }));
    expect(onLoadRound).toHaveBeenCalledWith(2);
    expect(onSelectRound).not.toHaveBeenCalled();
  });

  it('names the imagegen link button for its current state', () => {
    const { unmount } = render(<Sidebar {...makeProps({ imagegenRoot: null })} />);
    openProjectMenu();
    expect(screen.getByRole('button', { name: 'Link imagegen' })).toBeTruthy();

    unmount();
    // The name contains the button's visible text — the folder label, not a bare
    // "linked" state, since BI-047 gave each project its own folder.
    render(<Sidebar {...makeProps({ imagegenRoot: '/Users/dev/Code/spinalcord/imagegen' })} />);
    openProjectMenu();
    expect(screen.getByRole('button', { name: 'imagegen linked: spinalcord/imagegen' })).toBeTruthy();
  });

  /**
   * The state-only "🔗 imagegen linked" gave the operator no way to notice they
   * were reviewing one repo's rounds while another project was selected — the
   * observation that filed BI-047.
   */
  it('names the bound folder and keeps the absolute path in the tooltip', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: '/Users/dev/Code/spinalcord/imagegen' })} />);
    openProjectMenu();

    const button = screen.getByRole('button', { name: /imagegen linked/ });
    expect(button.textContent).toBe('🔗 spinalcord/imagegen');
    expect(button.getAttribute('title')).toContain('/Users/dev/Code/spinalcord/imagegen');
  });

  it('keeps title alongside the name where the title carries extra detail', () => {
    // Eligibility reason belongs in the tooltip, not the name (BI-031.2 shape,
    // now only shown when Generate All itself is visible — BI-053.5).
    render(<Sidebar {...makeProps({ canGenerateAll: false, generationAvailable: true })} />);

    const button = screen.getByRole('button', { name: 'Generate All' });
    expect(button.getAttribute('title')).toContain('No eligible tasks');
  });
});

/**
 * Project identity (BI-053.2)
 *
 * The header is the project's name + bound-repo label, and project New/Rename
 * edit inline so they can sit next to a "Use {repo}" offer — a `window.prompt`
 * cannot. Task naming still uses the native dialog.
 */
describe('Sidebar project identity (BI-053.2)', () => {
  it('renders the project name as a header and the repo label with the absolute path as tooltip', () => {
    render(
      <Sidebar
        {...makeProps({ imagegenRoot: '/Users/dev/Code/spinalcord/imagegen' })}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Demo Site' })).toBeTruthy();
    const label = screen.getByText('spinalcord/imagegen');
    expect(label.tagName).toBe('P');
    expect(label.getAttribute('title')).toBe('/Users/dev/Code/spinalcord/imagegen');
  });

  it('hides the repo label when the project is unbound', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: null })} />);

    expect(screen.getByRole('heading', { name: 'Demo Site' })).toBeTruthy();
    expect(screen.queryByText('spinalcord/imagegen')).toBeNull();
    expect(screen.queryByRole('button', { name: /^Use / })).toBeNull();
  });

  it('offers Use {derived} when the bound repo name differs from the project name', () => {
    const onRenameSession = vi.fn();
    render(
      <Sidebar
        {...makeProps({
          imagegenRoot: '/Users/dev/Code/spinalcord/imagegen',
          onRenameSession,
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Use spinalcord' }));
    expect(onRenameSession).toHaveBeenCalledWith('spinalcord');
  });

  it('hides the offer when the project already carries the repo name', () => {
    const session = makeSession({ name: 'spinalcord' });
    render(
      <Sidebar
        {...makeProps({
          session,
          imagegenRoot: '/Users/dev/Code/spinalcord/imagegen',
        })}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Use spinalcord' })).toBeNull();
  });

  it('creates a project from the inline New input and never calls window.prompt', () => {
    const prompted = vi.fn();
    vi.stubGlobal('prompt', prompted);
    const onCreateSession = vi.fn();
    render(<Sidebar {...makeProps({ onCreateSession })} />);

    openProjectMenu();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    expect(prompted).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox', { name: 'New project name' });
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    fireEvent.blur(input);

    expect(onCreateSession).toHaveBeenCalledTimes(1);
    expect(onCreateSession).toHaveBeenCalledWith('Acme Site');
    expect(screen.queryByRole('textbox', { name: 'New project name' })).toBeNull();
  });

  it('cancels an empty New draft on Enter and on Escape', () => {
    const onCreateSession = vi.fn();
    render(<Sidebar {...makeProps({ onCreateSession })} />);

    openProjectMenu();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'New project name' }), { key: 'Enter' });
    expect(onCreateSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'New project name' })).toBeNull();

    openProjectMenu();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'New project name' }), { key: 'Escape' });
    expect(onCreateSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'New project name' })).toBeNull();
  });

  it('renames from the inline input and never calls window.prompt', () => {
    const prompted = vi.fn();
    vi.stubGlobal('prompt', prompted);
    const onRenameSession = vi.fn();
    render(<Sidebar {...makeProps({ onRenameSession })} />);

    fireEvent.click(screen.getByRole('button', { name: 'Rename Demo Site' }));
    expect(prompted).not.toHaveBeenCalled();

    const input = screen.getByRole('textbox', { name: 'Project name' });
    expect((input as HTMLInputElement).value).toBe('Demo Site');
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRenameSession).toHaveBeenCalledWith('Acme Site');
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();
  });

  it('still prompts for a new task name', () => {
    const prompted = vi.fn(() => 'Hero');
    vi.stubGlobal('prompt', prompted);
    const onAddTask = vi.fn();
    render(<Sidebar {...makeProps({ onAddTask })} />);

    fireEvent.click(screen.getByRole('button', { name: 'New task' }));

    expect(prompted).toHaveBeenCalled();
    expect(onAddTask).toHaveBeenCalledWith('Hero');
  });
});

/**
 * Sidebar regroup (BI-053.5)
 *
 * The open rail is identity + rounds + tasks; the eight-action stack from
 * BI-003..022 lives in a ⋯ disclosure. These pin presence/absence, not style.
 */
describe('Sidebar regroup (BI-053.5)', () => {
  it('keeps Link / switch / backup / Build / Import tasks out of the open rail', () => {
    render(<Sidebar {...makeProps()} />);

    expect(screen.getByRole('button', { name: 'Project menu' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Link imagegen' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Project' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'New project' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Export project backup' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Build task-import file' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Import tasks from JSON' })).toBeNull();
    expect(screen.getByRole('button', { name: 'New task' })).toBeTruthy();
  });

  it('surfaces the moved actions inside the Project menu', () => {
    render(<Sidebar {...makeProps()} />);
    openProjectMenu();

    expect(screen.getByRole('combobox', { name: 'Project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'New project' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Link imagegen' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Export project backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import project backup' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Build task-import file' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Import tasks from JSON' })).toBeTruthy();
  });

  it('hides the rounds block until the project is linked', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: null })} />);

    expect(screen.queryByRole('button', { name: 'Refresh rounds' })).toBeNull();
    expect(screen.queryByText('Rounds')).toBeNull();
  });

  it('shows rounds and refresh on the open rail once linked', () => {
    render(
      <Sidebar
        {...makeProps({
          imagegenRoot: '/repo/imagegen',
          availableRounds: [1],
          currentRound: 1,
        })}
      />,
    );

    expect(screen.getByText('Rounds')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Refresh rounds' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Reload round r1' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: /imagegen linked/ })).toBeNull();
  });
});

describe('Sidebar progress badges (BI-060.2)', () => {
  function image(id: string, decision: ReviewDecision, round: number): GeneratedImage {
    return {
      id,
      url: roundImageUrl(round, `${id}.jpg`),
      prompt: '',
      status: 'ready',
      decision,
      rating: 0,
      feedback: null,
      createdAt: NOW,
    };
  }

  function iteration(index: number, images: GeneratedImage[]): Iteration {
    return {
      id: `it${index}`,
      index,
      prompt: '',
      refImageIds: [],
      primaryRefImageId: null,
      images,
      createdAt: NOW,
    };
  }

  const task: PromptTask = {
    ...makeTask('t1', 'Hero banner'),
    iterations: [
      iteration(0, [image('a', 'approved', 1)]),
      iteration(1, [
        image('b', 'undecided', 2),
        image('c', 'undecided', 2),
        image('d', 'kept', 2),
        image('e', 'discarded', 2),
      ]),
    ],
  };

  it('shows non-zero undecided / kept / approved counts for the round in view', () => {
    render(<Sidebar {...makeProps({ session: makeSession({ tasks: [task] }), currentRound: 2 })} />);

    expect(screen.getByText('2 undecided')).toBeTruthy();
    expect(screen.getByText('1 kept')).toBeTruthy();
    expect(screen.queryByText(/approved/)).toBeNull();
    expect(screen.queryByText(/discarded/)).toBeNull();
    expect(screen.getByTitle('2 undecided · 1 kept')).toBeTruthy();
  });

  it('follows currentRound rather than the latest iteration', () => {
    render(<Sidebar {...makeProps({ session: makeSession({ tasks: [task] }), currentRound: 1 })} />);

    expect(screen.getByText('1 approved')).toBeTruthy();
    expect(screen.queryByText(/undecided/)).toBeNull();
  });

  it('renders no badges for a task with no round', () => {
    const session = makeSession({ tasks: [makeTask('t2', 'Empty')] });
    render(<Sidebar {...makeProps({ session })} />);

    expect(screen.queryByText(/undecided|kept|approved/)).toBeNull();
  });

  it('keeps the badges out of the task button name', () => {
    render(<Sidebar {...makeProps({ session: makeSession({ tasks: [task] }), currentRound: 2 })} />);

    expect(screen.getByRole('button', { name: 'Hero banner' })).toBeTruthy();
  });
});

/**
 * Draft input characterization (BI-067.2)
 *
 * Pins the inline New / Rename draft before BI-067.3 moves it into its own
 * component. Everything asserts through callbacks, roles, and focus, so the tests
 * survive the move.
 *
 * The double-submit guard (`draftKindRef`) only matters for a blur that reaches
 * `submitDraft` after Enter has submitted but before React has removed the input,
 * while the render closure still sees the old draft state. happy-dom never blurs
 * the input by itself, and a blur sent after the removal never reaches React (the
 * root listener cannot see a detached node) — which is why the original Enter-then-
 * blur test passed with the guard deleted. `commitThenBlur` delivers the blur from
 * inside the commit callback, which is that window.
 */
describe('Sidebar project draft input (BI-067.2)', () => {
  function commitThenBlur(getInput: () => HTMLInputElement) {
    const handler = vi.fn<(name: string) => void>(() => {
      if (handler.mock.calls.length === 1) fireEvent.blur(getInput());
    });
    return handler;
  }

  function openNewDraft(): HTMLInputElement {
    openProjectMenu();
    fireEvent.click(screen.getByRole('button', { name: 'New project' }));
    return screen.getByRole('textbox', { name: 'New project name' });
  }

  function openRenameDraft(): HTMLInputElement {
    fireEvent.click(screen.getByRole('button', { name: 'Rename Demo Site' }));
    return screen.getByRole('textbox', { name: 'Project name' });
  }

  it('focuses the New draft input when it opens', () => {
    render(<Sidebar {...makeProps()} />);
    const input = openNewDraft();
    expect(document.activeElement).toBe(input);
  });

  it('focuses the Rename draft input when it opens', () => {
    render(<Sidebar {...makeProps()} />);
    const input = openRenameDraft();
    expect(document.activeElement).toBe(input);
  });

  it('commits a New draft on blur alone', () => {
    const onCreateSession = vi.fn();
    render(<Sidebar {...makeProps({ onCreateSession })} />);

    const input = openNewDraft();
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.blur(input);

    expect(onCreateSession).toHaveBeenCalledTimes(1);
    expect(onCreateSession).toHaveBeenCalledWith('Acme Site');
    expect(screen.queryByRole('textbox', { name: 'New project name' })).toBeNull();
  });

  it('commits a Rename draft on blur alone', () => {
    const onRenameSession = vi.fn();
    render(<Sidebar {...makeProps({ onRenameSession })} />);

    const input = openRenameDraft();
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.blur(input);

    expect(onRenameSession).toHaveBeenCalledTimes(1);
    expect(onRenameSession).toHaveBeenCalledWith('Acme Site');
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();
  });

  it('submits a New draft once when a blur lands while Enter is still committing it', () => {
    const onCreateSession = commitThenBlur(() =>
      screen.getByRole('textbox', { name: 'New project name' }),
    );
    render(<Sidebar {...makeProps({ onCreateSession })} />);

    const input = openNewDraft();
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onCreateSession).toHaveBeenCalledTimes(1);
    expect(onCreateSession).toHaveBeenCalledWith('Acme Site');
  });

  it('submits a Rename draft once when a blur lands while Enter is still committing it', () => {
    const onRenameSession = commitThenBlur(() =>
      screen.getByRole('textbox', { name: 'Project name' }),
    );
    render(<Sidebar {...makeProps({ onRenameSession })} />);

    const input = openRenameDraft();
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onRenameSession).toHaveBeenCalledTimes(1);
    expect(onRenameSession).toHaveBeenCalledWith('Acme Site');
  });

  it('discards a typed New draft on Escape', () => {
    const onCreateSession = vi.fn();
    render(<Sidebar {...makeProps({ onCreateSession })} />);

    const input = openNewDraft();
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onCreateSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'New project name' })).toBeNull();

    // The discarded text does not come back when the draft is opened again.
    expect(openNewDraft().value).toBe('');
  });

  it('discards a typed Rename draft on Escape and reopens with the current name', () => {
    const onRenameSession = vi.fn();
    render(<Sidebar {...makeProps({ onRenameSession })} />);

    const input = openRenameDraft();
    fireEvent.change(input, { target: { value: 'Acme Site' } });
    fireEvent.keyDown(input, { key: 'Escape' });

    expect(onRenameSession).not.toHaveBeenCalled();
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Rename Demo Site' })).toBeTruthy();
    expect(openRenameDraft().value).toBe('Demo Site');
  });

  it('trims the name before committing', () => {
    const onCreateSession = vi.fn();
    const onRenameSession = vi.fn();
    render(<Sidebar {...makeProps({ onCreateSession, onRenameSession })} />);

    const renameInput = openRenameDraft();
    fireEvent.change(renameInput, { target: { value: '  Acme Site  ' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });
    expect(onRenameSession).toHaveBeenCalledWith('Acme Site');

    const newInput = openNewDraft();
    fireEvent.change(newInput, { target: { value: '  Beta  ' } });
    fireEvent.keyDown(newInput, { key: 'Enter' });
    expect(onCreateSession).toHaveBeenCalledWith('Beta');
  });

  it('treats a blank or whitespace-only draft as a no-op that still closes the input', () => {
    const onCreateSession = vi.fn();
    const onRenameSession = vi.fn();
    render(<Sidebar {...makeProps({ onCreateSession, onRenameSession })} />);

    const renameInput = openRenameDraft();
    fireEvent.change(renameInput, { target: { value: '' } });
    fireEvent.keyDown(renameInput, { key: 'Enter' });
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();

    const renameBlurInput = openRenameDraft();
    fireEvent.change(renameBlurInput, { target: { value: '   ' } });
    fireEvent.blur(renameBlurInput);
    expect(screen.queryByRole('textbox', { name: 'Project name' })).toBeNull();

    const newInput = openNewDraft();
    fireEvent.change(newInput, { target: { value: '   ' } });
    fireEvent.keyDown(newInput, { key: 'Enter' });
    expect(screen.queryByRole('textbox', { name: 'New project name' })).toBeNull();

    expect(onRenameSession).not.toHaveBeenCalled();
    expect(onCreateSession).not.toHaveBeenCalled();
  });

  it('hides the Use {repo} offer while a draft is open and restores it after', () => {
    render(<Sidebar {...makeProps({ imagegenRoot: '/Users/dev/Code/spinalcord/imagegen' })} />);
    expect(screen.getByRole('button', { name: 'Use spinalcord' })).toBeTruthy();

    const renameInput = openRenameDraft();
    expect(screen.queryByRole('button', { name: 'Use spinalcord' })).toBeNull();
    fireEvent.keyDown(renameInput, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Use spinalcord' })).toBeTruthy();

    const newInput = openNewDraft();
    expect(screen.queryByRole('button', { name: 'Use spinalcord' })).toBeNull();
    fireEvent.keyDown(newInput, { key: 'Escape' });
    expect(screen.getByRole('button', { name: 'Use spinalcord' })).toBeTruthy();
  });
});

/**
 * Project menu characterization (BI-067.2)
 *
 * Pins the ⋯ disclosure's open/close contract before BI-067.4 moves it into its
 * own component: what dismisses it, what does not, and that every action closes
 * it before firing. Presence of the individual buttons is already pinned above.
 */
describe('Sidebar project menu (BI-067.2)', () => {
  const menuOpen = (): boolean => screen.queryByRole('combobox', { name: 'Project' }) !== null;

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('toggles from the ⋯ button and reports it through aria-expanded', () => {
    render(<Sidebar {...makeProps()} />);
    const toggle = screen.getByRole('button', { name: 'Project menu' });
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menuOpen()).toBe(false);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(menuOpen()).toBe(true);

    fireEvent.click(toggle);
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(menuOpen()).toBe(false);
  });

  it('closes on a pointerdown outside the menu', () => {
    render(<Sidebar {...makeProps()} />);
    openProjectMenu();

    fireEvent.pointerDown(document.body);

    expect(menuOpen()).toBe(false);
  });

  it('stays open on a pointerdown inside the menu or on the ⋯ button', () => {
    render(<Sidebar {...makeProps()} />);
    openProjectMenu();

    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Project' }));
    expect(menuOpen()).toBe(true);

    fireEvent.pointerDown(screen.getByRole('button', { name: 'Export project backup' }));
    expect(menuOpen()).toBe(true);

    // The ⋯ button is exempt so its own click toggles instead of close-then-reopen.
    fireEvent.pointerDown(screen.getByRole('button', { name: 'Project menu' }));
    expect(menuOpen()).toBe(true);
  });

  it('closes on Escape and ignores other keys', () => {
    render(<Sidebar {...makeProps()} />);
    openProjectMenu();

    fireEvent.keyDown(document, { key: 'Enter' });
    expect(menuOpen()).toBe(true);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(menuOpen()).toBe(false);
  });

  it('fires each direct action once and closes the menu', () => {
    const onLinkImagegen = vi.fn();
    const onExportSession = vi.fn();
    const onOpenBuilder = vi.fn();
    render(<Sidebar {...makeProps({ onLinkImagegen, onExportSession, onOpenBuilder })} />);

    for (const [name, handler] of [
      ['Link imagegen', onLinkImagegen],
      ['Export project backup', onExportSession],
      ['Build task-import file', onOpenBuilder],
    ] as const) {
      openProjectMenu();
      fireEvent.click(screen.getByRole('button', { name }));
      expect(handler).toHaveBeenCalledTimes(1);
      expect(menuOpen()).toBe(false);
    }
  });

  it('routes each Import button to its own hidden file input and closes the menu', async () => {
    const onImportSession = vi.fn();
    const onImportTasks = vi.fn();
    const clicked: HTMLInputElement[] = [];
    vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(function (
      this: HTMLInputElement,
    ) {
      clicked.push(this);
    });
    render(<Sidebar {...makeProps({ onImportSession, onImportTasks })} />);

    openProjectMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Import project backup' }));
    expect(menuOpen()).toBe(false);

    openProjectMenu();
    fireEvent.click(screen.getByRole('button', { name: 'Import tasks from JSON' }));
    expect(menuOpen()).toBe(false);

    expect(clicked).toHaveLength(2);
    const [sessionInput, tasksInput] = clicked as [HTMLInputElement, HTMLInputElement];
    expect(sessionInput).not.toBe(tasksInput);
    expect(sessionInput.type).toBe('file');
    expect(tasksInput.type).toBe('file');

    // The inputs outlive the closed menu, and each feeds only its own handler.
    expect(sessionInput.isConnected).toBe(true);
    expect(tasksInput.isConnected).toBe(true);
    fireEvent.change(sessionInput, {
      target: { files: [new File(['{"session":1}'], 'backup.json')] },
    });
    await waitFor(() => expect(onImportSession).toHaveBeenCalledWith('{"session":1}'));
    expect(onImportTasks).not.toHaveBeenCalled();

    fireEvent.change(tasksInput, {
      target: { files: [new File(['{"tasks":1}'], 'tasks.json')] },
    });
    await waitFor(() => expect(onImportTasks).toHaveBeenCalledWith('{"tasks":1}'));
    expect(onImportSession).toHaveBeenCalledTimes(1);
  });

  it('closes when New project opens the draft input', () => {
    render(<Sidebar {...makeProps()} />);
    openProjectMenu();

    fireEvent.click(screen.getByRole('button', { name: 'New project' }));

    expect(menuOpen()).toBe(false);
    expect(screen.getByRole('textbox', { name: 'New project name' })).toBeTruthy();
  });

  it('switches project from the select and closes the menu', () => {
    const onSwitchSession = vi.fn();
    const session = makeSession();
    render(
      <Sidebar
        {...makeProps({
          session,
          sessions: [
            { id: session.id, name: session.name, updatedAt: session.updatedAt },
            { id: 's2', name: 'Other Site', updatedAt: session.updatedAt },
          ],
          onSwitchSession,
        })}
      />,
    );
    openProjectMenu();

    fireEvent.change(screen.getByRole('combobox', { name: 'Project' }), {
      target: { value: 's2' },
    });

    expect(onSwitchSession).toHaveBeenCalledTimes(1);
    expect(onSwitchSession).toHaveBeenCalledWith('s2');
    expect(menuOpen()).toBe(false);
  });
});
