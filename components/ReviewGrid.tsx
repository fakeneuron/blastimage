'use client';

/**
 * blastimage — batch review grid (BI-005)
 *
 * Replaces the BI-007 temporary strip in {@link TaskDetail}: a responsive grid
 * of review cards for the latest iteration's batch. Each card carries the
 * keep / discard / approve decision, a 0–5 star rating, and a feedback button,
 * with distinct visual states per {@link ReviewDecision}. Presentational only —
 * the pure decision/rating mutations + persistence live in `lib/workspace.ts` /
 * `useWorkspace`; the feedback modal itself lands in BI-006 (here it is a
 * callback).
 */

import ResolvedImage from '@/components/ResolvedImage';
import type { GeneratedImage, ID, Iteration, ReviewDecision, StarRating } from '@/lib/types';

interface ReviewGridProps {
  iteration: Iteration;
  onSetDecision: (imageId: ID, decision: ReviewDecision) => void;
  onSetRating: (imageId: ID, rating: StarRating) => void;
  onFeedback: (imageId: ID) => void;
  /** Starts a refined next round seeded by this kept image (BI-009). */
  onIterate: (imageId: ID) => void;
}

/** Per-decision card framing — the visual state cue for the reviewer. */
const STATE_RING: Record<ReviewDecision, string> = {
  approved: 'border-green-500 ring-2 ring-green-500/40',
  kept: 'border-foreground ring-2 ring-foreground/30',
  discarded: 'border-red-400/60 dark:border-red-500/50',
  undecided: 'border-black/10 dark:border-white/10',
};

/** Corner badge label per decision (none while undecided). */
const STATE_BADGE: Partial<Record<ReviewDecision, { label: string; cls: string }>> = {
  approved: { label: 'Approved', cls: 'bg-green-500 text-white' },
  kept: { label: 'Kept', cls: 'bg-foreground text-background' },
  discarded: { label: 'Discarded', cls: 'bg-red-500 text-white' },
};

const DECISIONS: { value: ReviewDecision; label: string; active: string }[] = [
  { value: 'kept', label: 'Keep', active: 'bg-foreground text-background' },
  { value: 'discarded', label: 'Discard', active: 'bg-red-500 text-white' },
  { value: 'approved', label: 'Approve', active: 'bg-green-500 text-white' },
];

export default function ReviewGrid({
  iteration,
  onSetDecision,
  onSetRating,
  onFeedback,
  onIterate,
}: ReviewGridProps) {
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {iteration.images.map((img) => (
        <ReviewCard
          key={img.id}
          image={img}
          onSetDecision={onSetDecision}
          onSetRating={onSetRating}
          onFeedback={onFeedback}
          onIterate={onIterate}
        />
      ))}
    </ul>
  );
}

interface ReviewCardProps {
  image: GeneratedImage;
  onSetDecision: (imageId: ID, decision: ReviewDecision) => void;
  onSetRating: (imageId: ID, rating: StarRating) => void;
  onFeedback: (imageId: ID) => void;
  onIterate: (imageId: ID) => void;
}

function ReviewCard({ image, onSetDecision, onSetRating, onFeedback, onIterate }: ReviewCardProps) {
  const badge = STATE_BADGE[image.decision];
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-lg border-2 transition ${STATE_RING[image.decision]}`}
    >
      {/* Image (dimmed when discarded, but still visible) */}
      <div className="relative">
        <ResolvedImage
          src={image.url}
          alt={image.prompt || 'generated image'}
          className={`aspect-[3/2] w-full object-cover transition-opacity ${
            image.decision === 'discarded' ? 'opacity-40' : ''
          }`}
        />
        {badge && (
          <span
            className={`pointer-events-none absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.cls}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 p-2">
        {/* Decision controls — clicking the active decision clears it. */}
        <div className="flex gap-1">
          {DECISIONS.map((d) => {
            const active = image.decision === d.value;
            return (
              <button
                key={d.value}
                type="button"
                aria-pressed={active}
                onClick={() => onSetDecision(image.id, active ? 'undecided' : d.value)}
                className={`flex-1 rounded px-2 py-1 text-xs font-medium transition ${
                  active
                    ? d.active
                    : 'border border-black/15 hover:bg-foreground/5 dark:border-white/15'
                }`}
              >
                {d.label}
              </button>
            );
          })}
        </div>

        {/* Star rating — clicking the current value clears it to unrated. */}
        <div className="flex items-center gap-0.5" role="radiogroup" aria-label="Rating">
          {([1, 2, 3, 4, 5] as const).map((n) => (
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={image.rating === n}
              aria-label={`${n} star${n > 1 ? 's' : ''}`}
              onClick={() => onSetRating(image.id, image.rating === n ? 0 : (n as StarRating))}
              className={`text-lg leading-none transition ${
                n <= image.rating ? 'text-amber-400' : 'text-foreground/25 hover:text-foreground/50'
              }`}
            >
              ★
            </button>
          ))}
        </div>

        {/* Feedback button — opens the modal (BI-006). Saved feedback surfaces
            as a tooltip to keep the card compact; the label flips to signal it. */}
        <button
          type="button"
          onClick={() => onFeedback(image.id)}
          title={
            image.feedback?.text
              ? image.feedback.useAsReference
                ? `${image.feedback.text}\n\n(use as reference)`
                : image.feedback.text
              : undefined
          }
          className="rounded border border-black/15 px-2 py-1 text-xs hover:bg-foreground/5 dark:border-white/15"
        >
          {image.feedback?.text ? '💬 Edit feedback' : 'Feedback'}
        </button>

        {/* Iterate — only on keepers (approved is final). Seeds the next round
            from this image as the primary reference (BI-009). */}
        {image.decision === 'kept' && (
          <button
            type="button"
            onClick={() => onIterate(image.id)}
            className="rounded bg-foreground px-2 py-1 text-xs font-medium text-background hover:opacity-90"
          >
            Iterate →
          </button>
        )}
      </div>
    </li>
  );
}
