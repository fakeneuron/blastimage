'use client';

/**
 * blastimage — image feedback modal (BI-006)
 *
 * Opened by the review grid's feedback button (the seam BI-005 left as a
 * callback). Edits a {@link GeneratedImage}'s {@link FeedbackState}: a free-text
 * refinement note plus a "use as reference" flag (persisted now; consumed by the
 * BI-009 end-to-end loop). Three submit paths beyond Cancel — `Save` (feedback
 * only), `Save & Keep` (also promotes the image to a keeper), and `Approve` (the
 * quick-approve path) — all persist any typed feedback first. Presentational
 * only: the pure mutation + persistence live in `lib/workspace.ts` /
 * `useWorkspace`.
 */

import { useEffect, useState } from 'react';

import ResolvedImage from '@/components/ResolvedImage';
import type { GeneratedImage } from '@/lib/types';

/** What the submit buttons map to; `save` persists feedback only. */
export type FeedbackAction = 'save' | 'keep' | 'approve';

interface FeedbackModalProps {
  image: GeneratedImage;
  onClose: () => void;
  onSubmit: (feedback: { text: string; useAsReference: boolean }, action: FeedbackAction) => void;
}

export default function FeedbackModal({ image, onClose, onSubmit }: FeedbackModalProps) {
  const [text, setText] = useState(image.feedback?.text ?? '');
  const [useAsReference, setUseAsReference] = useState(image.feedback?.useAsReference ?? false);

  // Esc closes the modal without persisting.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (action: FeedbackAction) => onSubmit({ text: text.trim(), useAsReference }, action);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Image feedback"
        className="flex w-full max-w-lg flex-col gap-4 rounded-lg border border-black/10 bg-background p-5 shadow-xl dark:border-white/15"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <ResolvedImage
            src={image.url}
            alt={image.prompt || 'generated image'}
            className="aspect-[3/2] w-32 shrink-0 rounded object-cover"
          />
          <div className="min-w-0">
            <h2 className="text-sm font-semibold">Feedback</h2>
            <p className="mt-1 line-clamp-3 text-xs opacity-60">{image.prompt}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label htmlFor="feedback-text" className="text-xs font-medium uppercase tracking-wide opacity-60">
            Refinement notes
          </label>
          <textarea
            id="feedback-text"
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={4}
            placeholder="What should change in the next round? (e.g. warmer lighting, tighter crop…)"
            className="w-full resize-y rounded border border-black/15 bg-background p-3 text-sm focus:outline-none focus:ring-1 focus:ring-foreground/40 dark:border-white/15"
          />
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useAsReference}
            onChange={(e) => setUseAsReference(e.target.checked)}
          />
          Use as reference for the next iteration
        </label>

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
            onClick={() => submit('save')}
            className="rounded border border-black/15 px-3 py-1.5 text-sm hover:bg-foreground/5 dark:border-white/15"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => submit('keep')}
            className="rounded bg-foreground px-3 py-1.5 text-sm font-medium text-background hover:opacity-90"
          >
            Save &amp; Keep
          </button>
          <button
            type="button"
            onClick={() => submit('approve')}
            className="rounded bg-green-500 px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
          >
            Approve
          </button>
        </div>
      </div>
    </div>
  );
}
