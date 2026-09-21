'use client';

/**
 * blastimage — workspace sidebar (BI-003)
 *
 * Visible rail (BI-053.5): project header (name, repo, Viewer/In-app badge),
 * rounds list + refresh, tasks + New task, and Generate All only when the
 * bridge is installed. Project New/Switch, Link imagegen, backup Export/Import,
 * Build, and Import tasks live in a ⋯ disclosure. Project New/Rename edit
 * inline (BI-053.2); task New/Rename still use native dialogs. Delete routes
 * to {@link DeleteTaskModal} via `onDeleteTask`, because what it severs on
 * disk does not fit a `window.confirm` (BI-033). The import file-read (DOM
 * concern) lives here, per the ReferenceLibrary precedent; parse/validate/merge
 * live in lib (BI-019). Hidden file inputs stay mounted outside the ⋯ panel so
 * closing the disclosure cannot drop a pending picker.
 *
 * Accessible naming (BI-035.3): every button carries an explicit `aria-label`,
 * because the glyph-bearing ones would otherwise be named by their content —
 * `✎`, `🗑`, and `⋯` announce as bare glyphs, and the two `Import` buttons
 * announce identically. Each label *contains* its button's visible text (WCAG
 * 2.5.3 Label in Name), which is why the round chips are "View round r1" /
 * "Reload round r1", not "View round 1", and the header rename control is
 * "Rename {name}". `title`
 * stays alongside: it is the hover tooltip and carries detail the name should
 * not (the Generate All disabled reason, the chips' `rounds/rN/batch.json`
 * path). The project `<select>` is named the native way instead —
 * `htmlFor`/`id` on the visible "Project" label inside the ⋯ panel.
 */

import { useEffect, useRef, useState } from 'react';

import type { ID, Session } from '@/lib/types';
import type { SessionMeta } from '@/lib/storage';
import type { RoundSummary } from '@/lib/roundBatch';
import { imagegenRootLabel, projectNameFromRoot } from '@/lib/workspace';

interface SidebarProps {
  session: Session;
  sessions: SessionMeta[];
  activeTaskId: ID | null;
  /** True when Generate All can fire (bridge installed, ≥1 eligible task, nothing in flight). */
  canGenerateAll: boolean;
  /**
   * True when the Grok Imagine bridge is installed (BI-031.2). Distinguishes
   * "nothing eligible" from "this browser cannot generate at all" in the
   * disabled button's reason.
   */
  generationAvailable: boolean;
  onSwitchSession: (id: ID) => void;
  onCreateSession: (name: string) => void;
  onRenameSession: (name: string) => void;
  /** Downloads the current session as a full-workspace backup JSON (BI-022.7). */
  onExportSession: () => void;
  /** Receives the raw text of a selected full-session backup JSON file (BI-022.7). */
  onImportSession: (json: string) => void;
  onAddTask: (name: string) => void;
  /** Opens the in-app task-import builder modal (BI-021.3). */
  onOpenBuilder: () => void;
  /** Receives the raw text of a selected task-import JSON file (BI-019). */
  onImportTasks: (json: string) => void;
  onSelectTask: (id: ID) => void;
  onRenameTask: (id: ID, name: string) => void;
  /** Opens the delete-task modal (BI-033) — the confirmation is not this component's. */
  onDeleteTask: (id: ID) => void;
  /** Fires generation for every eligible task and opens bulk review (BI-015). */
  onGenerateAll: () => void;
  /**
   * The `imagegen/` folder this project is bound to, or `null` when it has none
   * (BI-047). Replaces the earlier boolean: the state is derivable from it, and
   * naming the folder is what tells the operator which repo they are reviewing.
   */
  imagegenRoot: string | null;
  /** Round numbers under `imagegen/rounds/` that contain a `batch.json`. */
  availableRounds: number[];
  /** Per-round counts from `batch.json` (BI-053.3), same order as {@link SidebarProps.availableRounds}. */
  roundSummaries: RoundSummary[];
  /** The terminal round currently in view (BI-053.4), or `null`. */
  currentRound: number | null;
  onLinkImagegen: () => void;
  /** Refresh (no arg) or BI-043-replace the given round (BI-056 current-chip click). */
  onLoadRound: (round?: number) => void;
  /** Sets the round view-filter; does not re-ingest (BI-053.4). */
  onSelectRound: (round: number) => void;
}

export default function Sidebar({
  session,
  sessions,
  activeTaskId,
  canGenerateAll,
  generationAvailable,
  onSwitchSession,
  onCreateSession,
  onRenameSession,
  onExportSession,
  onImportSession,
  onAddTask,
  onOpenBuilder,
  onImportTasks,
  onSelectTask,
  onRenameTask,
  onDeleteTask,
  onGenerateAll,
  imagegenRoot,
  availableRounds,
  roundSummaries,
  currentRound,
  onLinkImagegen,
  onLoadRound,
  onSelectRound,
}: SidebarProps) {
  const imagegenLinked = imagegenRoot !== null;
  // Visible text and accessible name share the folder label for the same reason
  // the round chips do (BI-035.3): the name must contain the visible text.
  const imagegenLabel = imagegenRoot ? imagegenRootLabel(imagegenRoot) : '';
  const derivedName = imagegenRoot ? projectNameFromRoot(imagegenRoot) : '';
  const offerRepoName = derivedName.length > 0 && derivedName !== session.name;
  const latestRound = availableRounds.length ? availableRounds[availableRounds.length - 1] : undefined;
  // Shared by the button's visible text and its accessible name (BI-035.3), so the
  // two cannot drift apart — the name must contain the visible text (WCAG 2.5.3).
  const refreshLabel = 'Refresh rounds';
  const importInputRef = useRef<HTMLInputElement>(null);
  const sessionImportInputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [draftKind, setDraftKind] = useState<'new' | 'rename' | null>(null);
  const [draftValue, setDraftValue] = useState('');
  // Enter unmounts the input, which fires blur in the browser; the ref is what
  // makes the second submitDraft a no-op (setState would still see the old kind).
  const draftKindRef = useRef<'new' | 'rename' | null>(null);
  const draftInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (draftKind) draftInputRef.current?.focus();
  }, [draftKind]);

  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent): void {
      const t = e.target as Node;
      if (menuRef.current?.contains(t) || menuButtonRef.current?.contains(t)) return;
      setMenuOpen(false);
    }
    function onKey(e: KeyboardEvent): void {
      if (e.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  function openDraft(kind: 'new' | 'rename'): void {
    draftKindRef.current = kind;
    setDraftKind(kind);
    setDraftValue(kind === 'rename' ? session.name : '');
  }

  function cancelDraft(): void {
    draftKindRef.current = null;
    setDraftKind(null);
    setDraftValue('');
  }

  function submitDraft(): void {
    const kind = draftKindRef.current;
    if (!kind) return;
    const name = draftValue.trim();
    cancelDraft();
    if (kind === 'new' && name) onCreateSession(name);
    if (kind === 'rename' && name) onRenameSession(name);
  }

  function handleDraftKey(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (e.key === 'Enter') {
      e.preventDefault();
      submitDraft();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelDraft();
    }
  }

  function handleAddTask() {
    const name = window.prompt('Name the new prompt task:');
    if (name && name.trim()) onAddTask(name);
  }

  function handleRenameTask(id: ID, current: string) {
    const name = window.prompt('Rename task:', current);
    if (name && name.trim()) onRenameTask(id, name);
  }

  function openMenuAction(action: () => void): void {
    setMenuOpen(false);
    action();
  }

  const menuBtnClass =
    'w-full rounded border border-black/15 px-2 py-1 text-left text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10';

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/[.02]">
      {/* Project header (BI-053.2 / BI-053.5): name, repo, mode; actions in ⋯. */}
      <div className="relative border-b border-black/10 p-3 dark:border-white/10">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {draftKind === 'rename' ? (
              <input
                ref={draftInputRef}
                aria-label="Project name"
                className="w-full rounded border border-black/15 bg-background px-2 py-1 text-sm dark:border-white/15"
                value={draftValue}
                onChange={(e) => setDraftValue(e.target.value)}
                onKeyDown={handleDraftKey}
                onBlur={submitDraft}
              />
            ) : (
              <button
                type="button"
                className="block max-w-full truncate text-left"
                aria-label={`Rename ${session.name}`}
                title="Rename project"
                onClick={() => openDraft('rename')}
              >
                <h2 className="truncate text-sm font-medium">{session.name}</h2>
              </button>
            )}
            {imagegenRoot ? (
              <p className="mt-0.5 truncate text-xs opacity-60" title={imagegenRoot}>
                {imagegenLabel}
              </p>
            ) : null}
            {offerRepoName && draftKind === null ? (
              <button
                type="button"
                className="mt-1 rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                aria-label={`Use ${derivedName}`}
                onClick={() => onRenameSession(derivedName)}
              >
                Use {derivedName}
              </button>
            ) : null}
            <span
              className="mt-1 inline-block rounded border border-black/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide opacity-60 dark:border-white/15"
              title={
                generationAvailable
                  ? 'In-app generation is available in this browser'
                  : 'Viewer mode — generate rounds from the terminal loop'
              }
            >
              {generationAvailable ? 'In-app' : 'Viewer'}
            </span>
          </div>
          <button
            ref={menuButtonRef}
            type="button"
            className="shrink-0 rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            aria-label="Project menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
            onClick={() => setMenuOpen((open) => !open)}
          >
            ⋯
          </button>
        </div>
        {draftKind === 'new' ? (
          <input
            ref={draftInputRef}
            aria-label="New project name"
            placeholder="Project name"
            className="mt-2 w-full rounded border border-black/15 bg-background px-2 py-1 text-sm dark:border-white/15"
            value={draftValue}
            onChange={(e) => setDraftValue(e.target.value)}
            onKeyDown={handleDraftKey}
            onBlur={submitDraft}
          />
        ) : null}
        {menuOpen ? (
          <div
            ref={menuRef}
            className="absolute inset-x-3 z-10 mt-2 flex flex-col gap-1.5 rounded border border-black/15 bg-background p-2 shadow-md dark:border-white/15"
          >
            <label
              htmlFor="project-select"
              className="text-xs font-medium uppercase tracking-wide opacity-60"
            >
              Project
            </label>
            <select
              id="project-select"
              className="w-full rounded border border-black/15 bg-background px-2 py-1.5 text-sm dark:border-white/15"
              value={session.id}
              onChange={(e) => {
                setMenuOpen(false);
                onSwitchSession(e.target.value);
              }}
            >
              {sessions.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={menuBtnClass}
              aria-label="New project"
              onClick={() => openMenuAction(() => openDraft('new'))}
            >
              + New
            </button>
            <button
              type="button"
              className={`${menuBtnClass} ${
                imagegenLinked ? 'border-green-500/50 text-green-700 dark:text-green-400' : ''
              }`}
              title={
                imagegenRoot
                  ? `This project is linked to ${imagegenRoot} — click to link a different folder`
                  : "Link this project's imagegen/ folder (standard location per ADOPT.md §7)"
              }
              aria-label={imagegenRoot ? `imagegen linked: ${imagegenLabel}` : 'Link imagegen'}
              onClick={() => openMenuAction(onLinkImagegen)}
            >
              {imagegenLinked ? `🔗 ${imagegenLabel}` : '🔗 Link imagegen'}
            </button>
            <button
              type="button"
              className={menuBtnClass}
              title="Download this project as a full backup (.json)"
              aria-label="Export project backup"
              onClick={() => openMenuAction(onExportSession)}
            >
              ⤓ Export
            </button>
            <button
              type="button"
              className={menuBtnClass}
              title="Import a project backup (.json) as a new project"
              aria-label="Import project backup"
              onClick={() => openMenuAction(() => sessionImportInputRef.current?.click())}
            >
              ⤒ Import
            </button>
            <button
              type="button"
              className={menuBtnClass}
              title="Build a task-import file (tasks.json) from pasted prompts or prompts/*.txt"
              aria-label="Build task-import file"
              onClick={() => openMenuAction(onOpenBuilder)}
            >
              🛠 Build
            </button>
            <button
              type="button"
              className={menuBtnClass}
              title="Import tasks from a JSON file ({version, tasks: [{name, basePrompt}]})"
              aria-label="Import tasks from JSON"
              onClick={() => openMenuAction(() => importInputRef.current?.click())}
            >
              ⇪ Import
            </button>
          </div>
        ) : null}
        <input
          ref={sessionImportInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void file.text().then(onImportSession);
            e.target.value = '';
          }}
        />
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void file.text().then(onImportTasks);
            e.target.value = '';
          }}
        />
      </div>

      {imagegenLinked ? (
        <div className="border-b border-black/10 px-3 py-2 dark:border-white/10">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium uppercase tracking-wide opacity-60">Rounds</span>
            <button
              type="button"
              disabled={availableRounds.length === 0}
              className="rounded border border-black/15 px-2 py-0.5 text-xs enabled:hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:enabled:hover:bg-white/10"
              title={
                latestRound !== undefined
                  ? 'Re-list rounds and ingest any that are not already in this project'
                  : 'No rounds found yet — run /blast-generate in a terminal session'
              }
              aria-label={refreshLabel}
              onClick={() => onLoadRound()}
            >
              ↻ {refreshLabel}
            </button>
          </div>
          {availableRounds.length > 0 ? (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {availableRounds.map((n) => {
                const summary = roundSummaries.find((s) => s.round === n);
                const current = currentRound === n;
                const countTitle = summary
                  ? `r${n} · ${summary.taskCount} task${summary.taskCount === 1 ? '' : 's'} · ${summary.imageCount} image${summary.imageCount === 1 ? '' : 's'}`
                  : `rounds/r${n}/batch.json`;
                const title = current
                  ? `${countTitle} · Click again to reload from disk`
                  : countTitle;
                return (
                  <button
                    key={n}
                    className={`rounded border px-1.5 py-0.5 text-[10px] ${
                      current
                        ? 'border-foreground bg-foreground/10'
                        : 'border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10'
                    }`}
                    title={title}
                    aria-label={current ? `Reload round r${n}` : `View round r${n}`}
                    aria-current={current ? 'true' : undefined}
                    onClick={() => (current ? onLoadRound(n) : onSelectRound(n))}
                  >
                    r{n}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide opacity-60">Tasks</span>
        <button
          className="rounded bg-foreground px-2 py-0.5 text-xs font-medium text-background hover:opacity-90"
          aria-label="New task"
          onClick={handleAddTask}
        >
          + New task
        </button>
      </div>

      {generationAvailable ? (
        <div className="px-3 pb-2">
          <button
            disabled={!canGenerateAll}
            aria-label="Generate All"
            onClick={onGenerateAll}
            className="w-full rounded bg-foreground px-2 py-1.5 text-xs font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            title={
              canGenerateAll
                ? 'Generate a batch for every task with a prompt or reference'
                : 'No eligible tasks (add a prompt or reference), or a run is in flight'
            }
          >
            ⚡ Generate All
          </button>
        </div>
      ) : (
        <p className="px-3 pb-2 text-xs opacity-60">
          Viewer mode — generate rounds from the terminal loop.
        </p>
      )}

      <nav className="flex-1 overflow-y-auto p-2">
        {session.tasks.length === 0 ? (
          <p className="px-2 py-4 text-sm opacity-50">No tasks yet. Add one to get started.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {session.tasks.map((task) => {
              const isActive = task.id === activeTaskId;
              return (
                <li key={task.id}>
                  <div
                    className={`group flex items-center gap-1 rounded px-2 py-1.5 text-sm ${
                      isActive
                        ? 'bg-foreground text-background'
                        : 'hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <button
                      className="flex-1 truncate text-left"
                      onClick={() => onSelectTask(task.id)}
                      title={task.name}
                    >
                      {task.name}
                    </button>
                    <button
                      className="opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
                      title="Rename task"
                      aria-label="Rename task"
                      onClick={() => handleRenameTask(task.id, task.name)}
                    >
                      ✎
                    </button>
                    <button
                      className="opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
                      title="Delete task"
                      aria-label="Delete task"
                      onClick={() => onDeleteTask(task.id)}
                    >
                      🗑
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}
