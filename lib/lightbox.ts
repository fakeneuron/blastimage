/**
 * blastimage — lightbox navigation logic (BI-027)
 *
 * Pure index math for the {@link Lightbox} overlay: stepping through a set of
 * images with the arrow keys / prev-next buttons, clamped at the ends (no
 * wrap). Kept here, unit-tested, because the components are presentational-only
 * by convention (see ReviewGrid / FeedbackModal docstrings). BI-060.3 adds the
 * review-mode key map beside it for the same reason.
 */

import type { ReviewDecision, StarRating } from '@/lib/types';

/**
 * Move `current` by `delta` within `[0, length - 1]`, clamped at both ends.
 * Returns 0 for an empty set so callers never produce a negative index.
 */
export function stepIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return 0;
  const next = current + delta;
  if (next < 0) return 0;
  if (next > length - 1) return length - 1;
  return next;
}

/** What a review-mode lightbox key asks for (BI-060.3); `null` for any other key. */
export type ReviewKeyAction =
  | { kind: 'decision'; decision: Exclude<ReviewDecision, 'undecided'> }
  | { kind: 'rating'; rating: StarRating };

const DECISION_KEYS: Record<string, Exclude<ReviewDecision, 'undecided'>> = {
  k: 'kept',
  d: 'discarded',
  a: 'approved',
};

/**
 * Map a keydown to a review action: K / D / A (either case) → decision, 0–5 →
 * rating (0 clears). Ctrl / Meta / Alt chords return `null` so browser
 * shortcuts (Cmd+A, Ctrl+D, …) keep working while the lightbox is open, and so
 * do auto-repeats — a held K would otherwise flicker the toggle.
 */
export function reviewKeyAction(
  e: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'altKey' | 'repeat'>,
): ReviewKeyAction | null {
  if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return null;
  const decision = DECISION_KEYS[e.key.toLowerCase()];
  if (decision) return { kind: 'decision', decision };
  if (/^[0-5]$/.test(e.key)) return { kind: 'rating', rating: Number(e.key) as StarRating };
  return null;
}
