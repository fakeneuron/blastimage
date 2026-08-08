'use client';

/**
 * blastimage — delete-task confirmation modal (BI-033)
 *
 * Replaces the Sidebar's generic `window.confirm`. When the task is joined to
 * terminal rounds on disk, it names the slug, the rounds, and any `approved/`
 * copies the task promoted, and offers an opt-in cleanup of those copies —
 * `window.confirm` cannot carry that third choice, which is why this is a modal.
 *
 * The cleanup is opt-in and off by default because it deletes files from the
 * user's repo: consent and consequence stay on one screen. Presentational only —
 * the delete and the retraction run in `lib/useWorkspace.ts` (`deleteTask`).
 * Mirrors the {@link IterateModal} idiom (Esc/backdrop/Cancel dismiss without
 * writing).
 */

import { useEffect, useState } from 'react';

import type { DeleteSlugBreak } from '@/lib/workspace';

interface DeleteTaskModalProps {
  taskName: string;
  /** What the delete would sever on disk, or `null` when it touches nothing outside the session. */
  risk: DeleteSlugBreak | null;
  /** Gates the cleanup offer — unlike the warning, removing files needs an FS handle. */
  imagegenLinked: boolean;
  onClose: () => void;
  onConfirm: (opts: { removeApproved: boolean }) => void;
}

/** Renders `[1, 2]` as `r1, r2` for the round list. */
function roundLabel(rounds: number[]): string {
  return rounds.map((r) => `r${r}`).join(', ');
}

export default function DeleteTaskModal({
  taskName,
  risk,
  imagegenLinked,
  onClose,
  onConfirm,
}: DeleteTaskModalProps) {
  const [removeApproved, setRemoveApproved] = useState(false);

  // Esc closes the modal without deleting.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const approved = risk?.approvedFilenames ?? [];
  const canOfferCleanup = approved.length > 0 && imagegenLinked;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Delete task"
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-black/10 bg-background p-5 shadow-xl dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div>
          <h2 className="text-sm font-semibold">Delete “{taskName}”?</h2>
          {!risk && <p className="mt-1 text-xs opacity-60">This cannot be undone.</p>}
        </div>

        {risk && (
          <div className="flex flex-col gap-3 rounded border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
            <p>
              This task is joined to imagegen {risk.rounds.length > 1 ? 'rounds' : 'round'}{' '}
              <strong>{roundLabel(risk.rounds)}</strong> by the slug{' '}
              <strong>“{risk.slug}”</strong>. Deleting it here does not delete anything from
              your repo:
            </p>
            <ul className="flex list-disc flex-col gap-1 pl-4 opacity-80">
              {approved.length > 0 && (
                <li>
                  {approved.length === 1 ? 'One approved copy' : `${approved.length} approved copies`}{' '}
                  stay in <code>imagegen/approved/</code> ({approved.join(', ')}) with no way to
                  remove {approved.length === 1 ? 'it' : 'them'} from the app afterwards.
                </li>
              )}
              <li>
                <code>selection.json</code> keeps this task’s entry, so{' '}
                <code>/blast-iterate</code> still acts on the slug.
              </li>
              <li>
                The round images in <code>rounds/</code> stay put — “↻ Load round” will re-create
                this task from <code>batch.json</code> (though its decisions, ratings, and
                feedback will not come back), unless you also remove it from{' '}
                <code>imagegen/tasks.json</code>.
              </li>
            </ul>
            {canOfferCleanup && (
              <label className="flex cursor-pointer items-start gap-2 border-t border-amber-500/30 pt-3">
                <input
                  type="checkbox"
                  checked={removeApproved}
                  onChange={(e) => setRemoveApproved(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  Also remove the approved{' '}
                  {approved.length === 1 ? 'copy' : 'copies'} from{' '}
                  <code>imagegen/approved/</code> and clear this task’s{' '}
                  <code>selection.json</code>{' '}
                  {risk.rounds.length > 1 ? 'entries' : 'entry'}.
                </span>
              </label>
            )}
            {approved.length > 0 && !imagegenLinked && (
              <p className="border-t border-amber-500/30 pt-3 opacity-70">
                Link your imagegen folder first (🔗 in the sidebar) if you want the approved{' '}
                {approved.length === 1 ? 'copy' : 'copies'} removed too.
              </p>
            )}
          </div>
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
            autoFocus
            onClick={() => onConfirm({ removeApproved: canOfferCleanup && removeApproved })}
            className="rounded bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Delete task
          </button>
        </div>
      </div>
    </div>
  );
}
