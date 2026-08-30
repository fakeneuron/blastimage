'use client';

/**
 * blastimage — imagegen folder picker (BI-046)
 *
 * Replaces the `window.prompt` that asked for an absolute path. BI-045 moved
 * the filesystem work to localhost API routes so linking works in every
 * browser; what it could not do is *hand out a path* — no browser API does,
 * which is why naming the folder stayed a paste. The server can list
 * directories, so this browses them: detected `imagegen/` shortcuts on top, a
 * navigable tree below, and typing a path kept as the fallback for anything
 * the tree omits (dot-directories, a folder behind an unreadable parent).
 *
 * Presentational, mirroring the {@link DeleteTaskModal} idiom (BI-033): the
 * listing, the shortcuts, and the link itself all arrive as callbacks from
 * `lib/useWorkspace.ts`. Failures render **inside** the dialog rather than in
 * the workspace's error banner — a mistyped path belongs next to the field
 * that produced it, and the picker stays open to correct it.
 *
 * Focus (BI-039): {@link useFocusTrap} moves focus to the first control on
 * open, traps Tab, and restores the opener on close.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { DirectoryListing } from '@/lib/imagegenServerFs';
import type { Result } from '@/lib/storage';
import { useFocusTrap } from '@/lib/useFocusTrap';

interface ImagegenLinkModalProps {
  /** Subdirectories of `path`; absent `path` starts at the home directory. */
  onBrowse: (path?: string) => Promise<Result<DirectoryListing>>;
  /** Absolute paths worth offering as one-click shortcuts. */
  onSuggest: () => Promise<string[]>;
  /** Links the folder; resolves to a failure message, or `null` on success. */
  onLink: (path: string) => Promise<string | null>;
  onClose: () => void;
}

export default function ImagegenLinkModal({
  onBrowse,
  onSuggest,
  onLink,
  onClose,
}: ImagegenLinkModalProps) {
  const [listing, setListing] = useState<DirectoryListing | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [typed, setTyped] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, { onEscape: onClose });

  const navigate = useCallback(
    async (path?: string): Promise<void> => {
      setBusy(true);
      const result = await onBrowse(path);
      setBusy(false);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setError(null);
      setListing(result.value);
    },
    [onBrowse],
  );

  // Open at the home directory (or wherever the server starts) and fetch the
  // shortcut row alongside it. Both are one-shot: the picker unmounts on close.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const found = await onSuggest();
      if (!cancelled) setSuggestions(found);
    })();
    void navigate();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-only; callbacks are stable per open
  }, []);

  async function link(path: string): Promise<void> {
    setBusy(true);
    const failure = await onLink(path);
    setBusy(false);
    if (failure) {
      setError(failure);
      return;
    }
    onClose();
  }

  return (
    // Backdrop: mouse dismiss only. Keyboard dismiss is Escape via useFocusTrap (BI-039).
    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions -- see above
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Link imagegen folder"
        tabIndex={-1}
        className="flex max-h-[80vh] w-full max-w-xl flex-col gap-4 rounded-lg border border-black/10 bg-background p-5 shadow-xl focus:outline-none dark:border-white/15"
      >
        <div>
          <h2 className="text-sm font-semibold">Link your imagegen folder</h2>
          <p className="mt-1 text-xs opacity-60">
            Pick the <code>imagegen/</code> folder in the repo you run{' '}
            <code>/blast-generate</code> from.
          </p>
        </div>

        {suggestions.length > 0 && (
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-medium opacity-70">Found nearby</h3>
            <ul className="flex flex-col gap-1">
              {suggestions.map((path) => (
                <li key={path}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void link(path)}
                    className="w-full truncate rounded border border-emerald-500/40 bg-emerald-500/5 px-3 py-1.5 text-left text-xs hover:bg-emerald-500/10 disabled:opacity-50"
                  >
                    📁 {path}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex min-h-0 flex-col gap-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy || !listing?.parent}
              onClick={() => void navigate(listing?.parent ?? undefined)}
              className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-foreground/5 disabled:opacity-40 dark:border-white/15"
            >
              ↑ Up
            </button>
            <p className="min-w-0 flex-1 truncate text-xs opacity-70" title={listing?.path ?? ''}>
              {listing?.path ?? 'Loading…'}
            </p>
          </div>
          <ul className="min-h-[8rem] flex-1 overflow-y-auto rounded border border-black/10 p-1 dark:border-white/15">
            {listing?.entries.length === 0 && (
              <li className="px-2 py-1.5 text-xs opacity-50">No sub-folders here.</li>
            )}
            {listing?.entries.map((entry) => (
              <li key={entry.path}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void navigate(entry.path)}
                  className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-xs hover:bg-foreground/5 disabled:opacity-50"
                >
                  <span className="truncate">📁 {entry.name}</span>
                  {entry.recognized && (
                    <span className="shrink-0 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-300">
                      imagegen
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form
          className="flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (typed.trim()) void link(typed.trim());
          }}
        >
          <label htmlFor="imagegen-path" className="sr-only">
            Or type an absolute path
          </label>
          <input
            id="imagegen-path"
            type="text"
            value={typed}
            disabled={busy}
            onChange={(e) => setTyped(e.target.value)}
            placeholder="…or type an absolute path"
            className="min-w-0 flex-1 rounded border border-black/15 bg-transparent px-2 py-1.5 text-xs disabled:opacity-50 dark:border-white/15"
          />
          <button
            type="submit"
            disabled={busy || !typed.trim()}
            className="rounded border border-black/15 px-3 py-1.5 text-xs hover:bg-foreground/5 disabled:opacity-40 dark:border-white/15"
          >
            Link path
          </button>
        </form>

        {error && (
          <p role="alert" className="rounded border border-red-500/40 bg-red-500/5 p-2 text-xs">
            {error}
          </p>
        )}

        <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-foreground/5 dark:border-white/15"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy || !listing}
            onClick={() => void (listing && link(listing.path))}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
          >
            Link this folder
          </button>
        </div>
      </div>
    </div>
  );
}
