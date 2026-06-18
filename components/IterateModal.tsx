'use client';

/**
 * blastimage — iterate-from-keeper modal (BI-009)
 *
 * Opened by the review grid's per-keeper "Iterate" button. Starts a refined next
 * round seeded by a single kept {@link GeneratedImage}: that image becomes the
 * round's primary reference, and the refined prompt is pre-filled from the task's
 * base prompt plus the image's saved feedback. The prompt is fully editable, so
 * the user can keep the combined base+feedback prompt or replace it outright
 * (either composition approach). Presentational only — the actual generation +
 * iteration append live in `lib/useWorkspace.ts` (`generate`); here it is a
 * callback. Mirrors the {@link FeedbackModal} idiom (Esc/backdrop/Cancel dismiss
 * without generating).
 */

import { useEffect, useState } from 'react';

import ResolvedImage from '@/components/ResolvedImage';
import type { GeneratedImage } from '@/lib/types';

interface IterateModalProps {
  /** The kept image carried forward as the next round's primary reference. */
  image: GeneratedImage;
  /** The task's base prompt, used to seed the refined-prompt prefill. */
  basePrompt: string;
  onClose: () => void;
  /** Generates the next round with the (possibly edited) refined prompt. */
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

  // Esc closes the modal without generating.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const canGenerate = !!prompt.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Iterate from keeper"
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-black/10 bg-background p-5 shadow-xl dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
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
              prompt below — keep the combined version or replace it.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="iterate-prompt" className="text-xs font-medium uppercase tracking-wide opacity-60">
            Refined prompt
          </label>
          <textarea
            id="iterate-prompt"
            autoFocus
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
            disabled={!canGenerate}
            onClick={() => onSubmit(prompt.trim())}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Generate next round
          </button>
        </div>
      </div>
    </div>
  );
}
