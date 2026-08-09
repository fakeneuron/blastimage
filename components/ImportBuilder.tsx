'use client';

/**
 * blastimage — task-import builder (BI-021.3)
 *
 * Opened from the sidebar's 🛠 Build button (beside ⇪ Import). Lets adopters
 * compose a version-1 `tasks.json` in-app instead of hand-rolling a per-repo
 * emitter: paste prompts (blank-line-separated blocks → one task each) or
 * upload `prompts/*.txt` files (filename → name, contents → basePrompt), edit
 * the resulting rows, then download a file that round-trips through ⇪ Import.
 * DOM file-read lives here (ReferenceLibrary precedent); the pure parse/emit
 * logic lives in `lib/storage.ts` (`parsePastedPrompts` / `downloadTaskImport`).
 *
 * Focus (BI-039): {@link useFocusTrap} moves focus to the paste field on open,
 * traps Tab inside the dialog, and restores the opener on close. The hidden
 * file input carries `tabIndex={-1}` so it is not a trap stop (activation is
 * via the Upload button).
 */

import { useRef, useState } from 'react';

import { downloadTaskImport, parsePastedPrompts } from '@/lib/storage';
import { useFocusTrap } from '@/lib/useFocusTrap';

/** One editable preview row: a draft plus a stable React key. */
interface BuilderRow {
  key: number;
  name: string;
  basePrompt: string;
}

interface ImportBuilderProps {
  onClose: () => void;
}

export default function ImportBuilder({ onClose }: ImportBuilderProps) {
  const [rows, setRows] = useState<BuilderRow[]>([]);
  const [paste, setPaste] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const keyRef = useRef(0);
  const txtInputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, { onEscape: onClose });

  function appendDrafts(drafts: { name: string; basePrompt: string }[]) {
    setRows((prev) => [
      ...prev,
      ...drafts.map((d) => ({ key: keyRef.current++, name: d.name, basePrompt: d.basePrompt })),
    ]);
  }

  function handleAddFromPaste() {
    const drafts = parsePastedPrompts(paste);
    if (drafts.length === 0) {
      setNotice('Nothing to add — paste one or more prompts (separate tasks with a blank line).');
      return;
    }
    appendDrafts(drafts);
    setPaste('');
    setNotice(null);
  }

  async function handleTxtFiles(files: FileList) {
    const drafts: { name: string; basePrompt: string }[] = [];
    for (const file of Array.from(files)) {
      const name = file.name.replace(/\.txt$/i, '').trim();
      drafts.push({ name, basePrompt: await file.text() });
    }
    if (drafts.length) appendDrafts(drafts);
    setNotice(null);
  }

  function updateRow(key: number, patch: Partial<Pick<BuilderRow, 'name' | 'basePrompt'>>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: number) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function handleDownload() {
    if (rows.length === 0) {
      setNotice('Add at least one task before downloading.');
      return;
    }
    if (rows.some((r) => r.name.trim() === '')) {
      setNotice('Every task needs a name. Fill in the blank names (they become image filename slugs).');
      return;
    }
    downloadTaskImport(rows.map((r) => ({ name: r.name.trim(), basePrompt: r.basePrompt })));
    setNotice(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Build task-import file"
        tabIndex={-1}
        className="flex max-h-[85vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded-lg border border-black/10 bg-background p-5 shadow-xl focus:outline-none dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold">Build import file</h2>
          <p className="mt-1 text-xs opacity-60">
            Compose a <code>tasks.json</code> from pasted prompts or{' '}
            <code>prompts/*.txt</code> files, then download it and load it with ⇪ Import.
          </p>
        </div>

        {/* Add sources */}
        <div className="flex flex-col gap-2">
          <label
            htmlFor="builder-paste"
            className="text-xs font-medium uppercase tracking-wide opacity-60"
          >
            Paste prompts (one task per blank-line-separated block)
          </label>
          <textarea
            id="builder-paste"
            value={paste}
            onChange={(e) => setPaste(e.target.value)}
            rows={4}
            placeholder={'A serene forest at dawn, soft golden light.\n\nFlat-vector body map, clinical style.'}
            className="w-full resize-y rounded border border-black/15 bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40 dark:border-white/15"
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleAddFromPaste}
              className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-foreground/5 dark:border-white/15"
            >
              Add from paste
            </button>
            <span className="text-xs opacity-40">or</span>
            <button
              type="button"
              onClick={() => txtInputRef.current?.click()}
              className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-foreground/5 dark:border-white/15"
              title="One task per .txt file — filename becomes the task name, contents the prompt"
            >
              Upload .txt files
            </button>
            <input
              ref={txtInputRef}
              type="file"
              accept=".txt,text/plain"
              multiple
              tabIndex={-1}
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) void handleTxtFiles(e.target.files);
                e.target.value = ''; // allow re-selecting the same file
              }}
            />
          </div>
        </div>

        {/* Editable preview */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide opacity-60">
              Tasks ({rows.length})
            </label>
          </div>
          {rows.length === 0 ? (
            <p className="rounded border border-dashed border-black/15 px-3 py-6 text-center text-sm opacity-50 dark:border-white/15">
              No tasks yet. Paste prompts or upload .txt files to start.
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {rows.map((row) => (
                <li
                  key={row.key}
                  className="flex items-start gap-2 rounded border border-black/10 p-2 dark:border-white/10"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <input
                      type="text"
                      value={row.name}
                      onChange={(e) => updateRow(row.key, { name: e.target.value })}
                      placeholder="task name"
                      className={`w-full rounded border bg-background px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40 ${
                        row.name.trim() === ''
                          ? 'border-amber-500'
                          : 'border-black/15 dark:border-white/15'
                      }`}
                    />
                    <textarea
                      value={row.basePrompt}
                      onChange={(e) => updateRow(row.key, { basePrompt: e.target.value })}
                      rows={2}
                      placeholder="base prompt (may be empty)"
                      className="w-full resize-y rounded border border-black/15 bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-foreground/40 dark:border-white/15"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeRow(row.key)}
                    title="Remove task"
                    className="shrink-0 rounded px-2 py-1 text-sm opacity-60 hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {notice && <p className="text-xs text-amber-600 dark:text-amber-500">{notice}</p>}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-foreground/5 dark:border-white/15"
          >
            Close
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={rows.length === 0}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Download tasks.json
          </button>
        </div>
      </div>
    </div>
  );
}
