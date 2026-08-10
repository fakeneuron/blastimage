'use client';

/**
 * blastimage — iterate-from-keeper modal (BI-009)
 *
 * Opened by the review grid's per-keeper "Iterate" button. Starts a refined next
 * round seeded by a single kept {@link GeneratedImage}: that image becomes the
 * round's primary reference, and the refined prompt is pre-filled from the task's
 * base prompt plus the image's saved feedback. The prompt is fully editable, so
 * the user can keep the combined base+feedback prompt or replace it outright
 * (either composition approach). Presentational only — submit writes
 * `selection.json` via `lib/useWorkspace.ts` (`requestNextRound`) for
 * `/blast-iterate`. Mirrors the {@link FeedbackModal} idiom (Esc/backdrop/Cancel
 * dismiss without writing).
 *
 * Focus (BI-039): {@link useFocusTrap} moves focus to the prompt field on open,
 * traps Tab inside the dialog, and restores the opener on close.
 */

import { useRef, useState } from 'react';

import ResolvedImage from '@/components/ResolvedImage';
import type { GeneratedImage } from '@/lib/types';
import { useFocusTrap } from '@/lib/useFocusTrap';

interface IterateModalProps {
  /** The kept image carried forward as the next round's primary reference. */
  image: GeneratedImage;
  /** The task's base prompt, used to seed the refined-prompt prefill. */
  basePrompt: string;
  onClose: () => void;
  /** Writes a next-round request with the (possibly edited) refined prompt. */
  onSubmit: (prompt: string) => void;
}

/**
 * Composes the initial refined prompt from the base prompt and the keeper's
 * feedback. Either part may be empty; when both are present the feedback is
 * appended as an explicit refinement line. The user edits freely from here.
 */
function composePrompt(basePrompt: string, feedback: string): string {
  const base = basePrompt.trim();
  const note = feedback.trim();
  if (base && note) return `${base}\n\nRefine: ${note}`;
  return base || note;
}

export default function IterateModal({ image, basePrompt, onClose, onSubmit }: IterateModalProps) {
  const [prompt, setPrompt] = useState(() => composePrompt(basePrompt, image.feedback?.text ?? ''));
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, { onEscape: onClose });

  const canSubmit = !!prompt.trim();

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
        aria-label="Iterate from keeper"
        tabIndex={-1}
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-black/10 bg-background p-5 shadow-xl focus:outline-none dark:border-white/15"
      >
        <div className="flex items-start gap-3">
          <ResolvedImage
            src={image.url}
            alt={image.prompt || 'kept image'}
            className="aspect-[3/2] w-32 shrink-0 rounded object-cover"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Iterate from this keeper</h2>
            <p className="mt-1 text-xs opacity-60">
              This image seeds the next round as its primary reference. Edit the
              prompt below, then save a selection request for /blast-iterate.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="iterate-prompt" className="text-xs font-medium uppercase tracking-wide opacity-60">
            Refined prompt
          </label>
          <textarea
            id="iterate-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={6}
            placeholder="Describe the refined image for the next round…"
            className="w-full resize-y rounded border border-black/15 bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40 dark:border-white/15"
          />
        </div>

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
            disabled={!canSubmit}
            onClick={() => onSubmit(prompt.trim())}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Save selection request
          </button>
        </div>
      </div>
    </div>
  );
}
