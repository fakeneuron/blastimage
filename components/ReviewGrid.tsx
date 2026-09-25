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
 *
 * Lightbox review (BI-060.3): the enlarged view carries the same controls as the
 * card ({@link ReviewControls}, shared so the toggle + keep-first rules live once)
 * plus a prompt / saved-feedback caption and lightbox-scoped keys (K / D / A,
 * 0–5; `reviewKeyAction` in `lib/lightbox.ts`). Feedback and Iterate close the
 * lightbox before handing off, so the modal's focus trap never stacks on the
 * lightbox's — the lightbox's unmount restores focus to the thumbnail, which the
 * modal then captures as its own opener.
 */

import { useState } from 'react';

import Lightbox from '@/components/Lightbox';
import ResolvedImage from '@/components/ResolvedImage';
import { reviewKeyAction } from '@/lib/lightbox';
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

/** Pressing the active decision (button or key) clears it back to undecided. */
function toggledDecision(current: ReviewDecision, pressed: ReviewDecision): ReviewDecision {
  return current === pressed ? 'undecided' : pressed;
}

export default function ReviewGrid({
  iteration,
  onSetDecision,
  onSetRating,
  onFeedback,
  onIterate,
}: ReviewGridProps) {
  // Index of the image shown full-size in the lightbox; null when closed (BI-027).
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lightboxImages = iteration.images.map((img) => ({
    src: img.url,
    alt: img.prompt || 'generated image',
  }));
  const lightboxImage = lightboxIndex === null ? undefined : iteration.images[lightboxIndex];

  // Lightbox-scoped review keys; the listener lives only while the lightbox is open.
  const onLightboxKey = (e: KeyboardEvent) => {
    if (!lightboxImage) return;
    const action = reviewKeyAction(e);
    if (action?.kind === 'decision') {
      onSetDecision(lightboxImage.id, toggledDecision(lightboxImage.decision, action.decision));
    } else if (action?.kind === 'rating') {
      onSetRating(lightboxImage.id, action.rating);
    }
  };

  // Close first, then hand off — never stack the modal's focus trap on this one.
  const closeThen = (handOff: (imageId: ID) => void) => (imageId: ID) => {
    setLightboxIndex(null);
    handOff(imageId);
  };

  return (
    <>
      <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {iteration.images.map((img, i) => (
          <ReviewCard
            key={img.id}
            image={img}
            onOpen={() => setLightboxIndex(i)}
            onSetDecision={onSetDecision}
            onSetRating={onSetRating}
            onFeedback={onFeedback}
            onIterate={onIterate}
          />
        ))}
      </ul>
      {lightboxIndex !== null && (
        <Lightbox
          images={lightboxImages}
          index={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
          onIndexChange={setLightboxIndex}
          onKey={onLightboxKey}
        >
          {lightboxImage && (
            <div className="w-full max-w-md rounded-lg bg-background text-foreground">
              <div className="flex flex-col gap-1 border-b border-black/10 p-2 text-xs dark:border-white/10">
                {lightboxImage.prompt && (
                  <p className="max-h-16 overflow-y-auto whitespace-pre-wrap">{lightboxImage.prompt}</p>
                )}
                {lightboxImage.feedback?.text && (
                  <p className="whitespace-pre-wrap text-foreground/70">
                    💬 {lightboxImage.feedback.text}
                  </p>
                )}
              </div>
              <ReviewControls
                image={lightboxImage}
                onSetDecision={onSetDecision}
                onSetRating={onSetRating}
                onFeedback={closeThen(onFeedback)}
                onIterate={closeThen(onIterate)}
              />
              <p className="px-2 pb-2 text-[10px] text-foreground/50">
                K / D / A decide · 0–5 rate · ← / → step
              </p>
            </div>
          )}
        </Lightbox>
      )}
    </>
  );
}

interface ReviewCardProps {
  image: GeneratedImage;
  /** Opens this image full-size in the lightbox (BI-027). */
  onOpen: () => void;
  onSetDecision: (imageId: ID, decision: ReviewDecision) => void;
  onSetRating: (imageId: ID, rating: StarRating) => void;
  onFeedback: (imageId: ID) => void;
  onIterate: (imageId: ID) => void;
}

function ReviewCard({ image, onOpen, onSetDecision, onSetRating, onFeedback, onIterate }: ReviewCardProps) {
  const badge = STATE_BADGE[image.decision];
  return (
    <li
      className={`flex flex-col overflow-hidden rounded-lg border-2 transition ${STATE_RING[image.decision]}`}
    >
      {/* Image (dimmed when discarded, but still visible) — click to enlarge. */}
      <div className="relative">
        <button
          type="button"
          onClick={onOpen}
          aria-label="View full size"
          className="block w-full cursor-zoom-in"
        >
          <ResolvedImage
            src={image.url}
            alt={image.prompt || 'generated image'}
            className={`aspect-[3/2] w-full object-cover transition-opacity ${
              image.decision === 'discarded' ? 'opacity-40' : ''
            }`}
          />
        </button>
        {badge && (
          <span
            className={`pointer-events-none absolute left-2 top-2 rounded px-1.5 py-0.5 text-[10px] font-semibold ${badge.cls}`}
          >
            {badge.label}
          </span>
        )}
      </div>

      <ReviewControls
        image={image}
        onSetDecision={onSetDecision}
        onSetRating={onSetRating}
        onFeedback={onFeedback}
        onIterate={onIterate}
      />
    </li>
  );
}

type ReviewControlsProps = Omit<ReviewCardProps, 'onOpen'>;

/**
 * Decision / rating / feedback / iterate controls for one image — shared by the
 * grid card and the lightbox review panel (BI-060.3).
 */
function ReviewControls({ image, onSetDecision, onSetRating, onFeedback, onIterate }: ReviewControlsProps) {
  return (
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
              onClick={() => onSetDecision(image.id, toggledDecision(image.decision, d.value))}
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
            onClick={() => onSetRating(image.id, image.rating === n ? 0 : n)}
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

      {/* Iterate — keep-first (BI-009 / BI-055). Visible on undecided so the
          next-round path is discoverable; enabled only after Keep. Hidden on
          discarded and approved (approved is final). */}
      {(image.decision === 'kept' || image.decision === 'undecided') && (
        <button
          type="button"
          disabled={image.decision !== 'kept'}
          title={image.decision === 'undecided' ? 'Keep this image first' : undefined}
          onClick={() => onIterate(image.id)}
          className="rounded bg-foreground px-2 py-1 text-xs font-medium text-background enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Iterate →
        </button>
      )}
    </div>
  );
}
