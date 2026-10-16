'use client';

/**
 * blastimage — Sidebar project ⋯ menu (BI-067.4)
 *
 * The project-header disclosure (BI-053.5), split out of {@link Sidebar}: the ⋯
 * toggle, its panel, and dismissal on an outside pointerdown or Escape. Every
 * action closes the menu before firing. The actions themselves are Sidebar's
 * callbacks; this component only presents them. Deliberately a local
 * disclosure, not a shared Menu primitive and not `role="menu"` — the panel
 * holds a combobox and file-trigger buttons (BI-053.5).
 *
 * Renders the button and panel as siblings, so the caller's container must be
 * `relative`: the panel hangs off its bottom edge (`top-full`). The hidden file
 * inputs stay with the caller, mounted outside this panel, so closing the menu
 * cannot drop a pending picker.
 *
 * Accessible naming follows Sidebar's BI-035.3 rule (explicit `aria-label`
 * containing the visible text). The project `<select>` is named the native way
 * instead — `htmlFor`/`id` on the visible "Project" label.
 */

import { useEffect, useRef, useState } from 'react';

import type { ID } from '@/lib/types';
import type { SessionMeta } from '@/lib/storage';

interface ProjectMenuProps {
  sessions: SessionMeta[];
  sessionId: ID;
  onSwitchSession: (id: ID) => void;
  onNewProject: () => void;
  imagegenRoot: string | null;
  /** `imagegenRootLabel(imagegenRoot)` as the caller already derives it, or `''` when unlinked. */
  imagegenLabel: string;
  onLinkImagegen: () => void;
  onExportSession: () => void;
  /** Opens the caller's hidden session-backup file input. */
  onImportSessionClick: () => void;
  onOpenBuilder: () => void;
  /** Opens the caller's hidden task-import file input. */
  onImportTasksClick: () => void;
}

const menuBtnClass =
  'w-full rounded border border-black/15 px-2 py-1 text-left text-xs hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10';

export default function ProjectMenu({
  sessions,
  sessionId,
  onSwitchSession,
  onNewProject,
  imagegenRoot,
  imagegenLabel,
  onLinkImagegen,
  onExportSession,
  onImportSessionClick,
  onOpenBuilder,
  onImportTasksClick,
}: ProjectMenuProps) {
  const imagegenLinked = imagegenRoot !== null;
  const menuRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

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

  function openMenuAction(action: () => void): void {
    setMenuOpen(false);
    action();
  }

  return (
    <>
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
      {menuOpen ? (
        <div
          ref={menuRef}
          className="absolute inset-x-0 top-full z-10 mt-2 flex flex-col gap-1.5 rounded border border-black/15 bg-background p-2 shadow-md dark:border-white/15"
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
            value={sessionId}
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
            onClick={() => openMenuAction(onNewProject)}
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
            onClick={() => openMenuAction(onImportSessionClick)}
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
            onClick={() => openMenuAction(onImportTasksClick)}
          >
            ⇪ Import
          </button>
        </div>
      ) : null}
    </>
  );
}
