'use client';

/**
 * blastimage — workspace sidebar (BI-003)
 *
 * Session switcher (switch / new / rename) above the prompt-task list
 * (select / add / rename / delete / import-from-JSON). Naming prompts use
 * native dialogs to keep the shell minimal; richer inline editing can replace
 * them later if needed. The import file-read (DOM concern) lives here, per
 * the ReferenceLibrary precedent; parse/validate/merge live in lib (BI-019).
 */

import { useRef } from 'react';

import type { ID, Session } from '@/lib/types';
import type { SessionMeta } from '@/lib/storage';
import AccountControl from '@/components/AccountControl';

interface SidebarProps {
  session: Session;
  sessions: SessionMeta[];
  activeTaskId: ID | null;
  /** True when Generate All can fire (≥1 eligible task, nothing in flight). */
  canGenerateAll: boolean;
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
  onDeleteTask: (id: ID) => void;
  /** Fires generation for every eligible task and opens bulk review (BI-015). */
  onGenerateAll: () => void;
  /** True when the repo's `imagegen/` folder is linked via the File System Access API. */
  imagegenLinked: boolean;
  /** Round numbers under `imagegen/rounds/` that contain a `batch.json`. */
  availableRounds: number[];
  onLinkImagegen: () => void;
  /** Loads a terminal-generated round; omit `round` for the latest. */
  onLoadRound: (round?: number) => void;
}

export default function Sidebar({
  session,
  sessions,
  activeTaskId,
  canGenerateAll,
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
  imagegenLinked,
  availableRounds,
  onLinkImagegen,
  onLoadRound,
}: SidebarProps) {
  const latestRound = availableRounds.length ? availableRounds[availableRounds.length - 1] : undefined;
  const importInputRef = useRef<HTMLInputElement>(null);
  const sessionImportInputRef = useRef<HTMLInputElement>(null);

  function handleNewSession() {
    const name = window.prompt('Name the new website project:');
    if (name && name.trim()) onCreateSession(name);
  }

  function handleRenameSession() {
    const name = window.prompt('Rename this project:', session.name);
    if (name && name.trim()) onRenameSession(name);
  }

  function handleAddTask() {
    const name = window.prompt('Name the new prompt task:');
    if (name && name.trim()) onAddTask(name);
  }

  function handleRenameTask(id: ID, current: string) {
    const name = window.prompt('Rename task:', current);
    if (name && name.trim()) onRenameTask(id, name);
  }

  function handleDeleteTask(id: ID, name: string) {
    if (window.confirm(`Delete task “${name}”? This cannot be undone.`)) onDeleteTask(id);
  }

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-black/10 bg-black/[.02] dark:border-white/10 dark:bg-white/[.02]">
      {/* Session switcher */}
      <div className="border-b border-black/10 p-3 dark:border-white/10">
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide opacity-60">
          Project
        </label>
        <select
          className="w-full rounded border border-black/15 bg-background px-2 py-1.5 text-sm dark:border-white/15"
          value={session.id}
          onChange={(e) => onSwitchSession(e.target.value)}
        >
          {sessions.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <div className="mt-2 flex gap-2">
          <button
            className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            onClick={handleNewSession}
          >
            + New
          </button>
          <button
            className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            onClick={handleRenameSession}
          >
            Rename
          </button>
        </div>
        {/* Full-session backup export / import (BI-022.7); import lands a fresh
            copy — in hosted mode its images re-host to storage buckets. */}
        <div className="mt-2 flex gap-2">
          <button
            className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            title="Download this project as a full backup (.json)"
            onClick={onExportSession}
          >
            ⤓ Export
          </button>
          <button
            className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            title="Import a project backup (.json) as a new project"
            onClick={() => sessionImportInputRef.current?.click()}
          >
            ⤒ Import
          </button>
          <input
            ref={sessionImportInputRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void file.text().then(onImportSession);
              e.target.value = ''; // allow re-selecting the same file
            }}
          />
        </div>
        {/* Terminal round ingest (BI-024.1): link the repo's imagegen/ folder, then load batches. */}
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            className={`rounded border px-2 py-1 text-xs hover:bg-black/5 dark:hover:bg-white/10 ${
              imagegenLinked
                ? 'border-green-500/50 text-green-700 dark:text-green-400'
                : 'border-black/15 dark:border-white/15'
            }`}
            title="Link your repo's imagegen/ folder (standard location per ADOPT.md §7)"
            onClick={onLinkImagegen}
          >
            {imagegenLinked ? '🔗 imagegen linked' : '🔗 Link imagegen'}
          </button>
          <button
            disabled={!imagegenLinked || availableRounds.length === 0}
            className="rounded border border-black/15 px-2 py-1 text-xs enabled:hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/15 dark:enabled:hover:bg-white/10"
            title={
              imagegenLinked
                ? latestRound !== undefined
                  ? `Load rounds/r${latestRound}/batch.json into the review UI`
                  : 'No rounds found yet — run /blast-generate in a terminal session'
                : 'Link imagegen first'
            }
            onClick={() => onLoadRound()}
          >
            ↻ Load round{latestRound !== undefined ? ` r${latestRound}` : ''}
          </button>
        </div>
        {imagegenLinked && availableRounds.length > 1 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {availableRounds.map((n) => (
              <button
                key={n}
                className="rounded border border-black/15 px-1.5 py-0.5 text-[10px] hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
                title={`Load rounds/r${n}/batch.json`}
                onClick={() => onLoadRound(n)}
              >
                r{n}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Task list */}
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide opacity-60">Tasks</span>
        <div className="flex gap-1">
          <button
            className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            title="Build a task-import file (tasks.json) from pasted prompts or prompts/*.txt"
            onClick={onOpenBuilder}
          >
            🛠 Build
          </button>
          <button
            className="rounded border border-black/15 px-2 py-0.5 text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
            title="Import tasks from a JSON file ({version, tasks: [{name, basePrompt}]})"
            onClick={() => importInputRef.current?.click()}
          >
            ⇪ Import
          </button>
          <button
            className="rounded bg-foreground px-2 py-0.5 text-xs font-medium text-background hover:opacity-90"
            onClick={handleAddTask}
          >
            + New task
          </button>
        </div>
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void file.text().then(onImportTasks);
            e.target.value = ''; // allow re-selecting the same file
          }}
        />
      </div>

      {/* Generate All (BI-015) — one batch per eligible task, reviewed in one pass. */}
      <div className="px-3 pb-2">
        <button
          disabled={!canGenerateAll}
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
                      onClick={() => handleRenameTask(task.id, task.name)}
                    >
                      ✎
                    </button>
                    <button
                      className="opacity-0 transition-opacity group-hover:opacity-70 hover:!opacity-100"
                      title="Delete task"
                      onClick={() => handleDeleteTask(task.id, task.name)}
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

      {/* Hosted-mode account control (BI-022.6); renders null in local mode. */}
      <AccountControl />
    </aside>
  );
}
