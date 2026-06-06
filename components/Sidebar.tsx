'use client';

/**
 * blastimage — workspace sidebar (BI-003)
 *
 * Session switcher (switch / new / rename) above the prompt-task list
 * (select / add / rename / delete). Naming prompts use native dialogs to keep
 * the shell minimal; richer inline editing can replace them later if needed.
 */

import type { ID, Session } from '@/lib/types';
import type { SessionMeta } from '@/lib/storage';

interface SidebarProps {
  session: Session;
  sessions: SessionMeta[];
  activeTaskId: ID | null;
  onSwitchSession: (id: ID) => void;
  onCreateSession: (name: string) => void;
  onRenameSession: (name: string) => void;
  onAddTask: (name: string) => void;
  onSelectTask: (id: ID) => void;
  onRenameTask: (id: ID, name: string) => void;
  onDeleteTask: (id: ID) => void;
}

export default function Sidebar({
  session,
  sessions,
  activeTaskId,
  onSwitchSession,
  onCreateSession,
  onRenameSession,
  onAddTask,
  onSelectTask,
  onRenameTask,
  onDeleteTask,
}: SidebarProps) {
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
      </div>

      {/* Task list */}
      <div className="flex items-center justify-between px-3 pb-1 pt-3">
        <span className="text-xs font-medium uppercase tracking-wide opacity-60">Tasks</span>
        <button
          className="rounded bg-foreground px-2 py-0.5 text-xs font-medium text-background hover:opacity-90"
          onClick={handleAddTask}
        >
          + New task
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
    </aside>
  );
}
