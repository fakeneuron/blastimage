/**
 * blastimage — lightbox navigation logic (BI-027)
 *
 * Pure index math for the {@link Lightbox} overlay: stepping through a set of
 * images with the arrow keys / prev-next buttons, clamped at the ends (no
 * wrap). Kept here, unit-tested, because the components are presentational-only
 * by convention (see ReviewGrid / FeedbackModal docstrings).
 */

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
