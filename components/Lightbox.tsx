'use client';

/**
 * blastimage — full-size image lightbox overlay (BI-027)
 *
 * Click-to-enlarge for the review grid ({@link ReviewGrid}, which also backs
 * {@link BulkReviewPane}) and the approved gallery ({@link GalleryPanel}).
 * Mirrors the {@link FeedbackModal} overlay pattern (fixed inset-0, backdrop
 * click + Esc to close); Left/Right arrows step through the set, clamped at the
 * ends (`lib/lightbox.ts`). Presentational only — the index math lives in lib.
 *
 * Focus (BI-035.5): the overlay backs its `aria-modal="true"` claim — opening it
 * moves focus to the dialog, Tab/Shift+Tab cycle its own controls rather than
 * reaching the page behind the backdrop, and closing restores focus to whatever
 * opened it. Tab is fully managed (the handler picks the next target itself)
 * instead of delegating to native sequential navigation, so the boundary
 * behaviour is deterministic. Both consumers unmount on close, so the restore
 * rides the effect cleanup and covers all three close paths at once.
 */

import { useEffect, useRef } from 'react';

import ResolvedImage from '@/components/ResolvedImage';
import { stepIndex } from '@/lib/lightbox';

/** Everything inside the dialog that can hold focus. Disabled nav buttons opt out. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export interface LightboxImage {
  src: string;
  alt: string;
}

interface LightboxProps {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
  onIndexChange: (index: number) => void;
}

export default function Lightbox({ images, index, onClose, onIndexChange }: LightboxProps) {
  const image = images[index];
  const dialogRef = useRef<HTMLElement>(null);

  // Move focus into the overlay on open; hand it back to the opener on close.
  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    return () => {
      if (opener instanceof HTMLElement) opener.focus();
    };
  }, []);

  // Esc closes; Left/Right step through the set (clamped, no wrap); Tab is trapped.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndexChange(stepIndex(index, -1, images.length));
      else if (e.key === 'ArrowRight') onIndexChange(stepIndex(index, 1, images.length));
      else if (e.key === 'Tab') {
        const targets = Array.from(dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []);
        if (targets.length === 0) return;
        // `at` is -1 while focus sits on the dialog itself, so a first Tab enters
        // at either end of the set depending on direction.
        const at = targets.indexOf(document.activeElement as HTMLElement);
        const next = e.shiftKey
          ? at <= 0
            ? targets.length - 1
            : at - 1
          : at === -1 || at === targets.length - 1
            ? 0
            : at + 1;
        e.preventDefault();
        targets[next]?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [index, images.length, onClose, onIndexChange]);

  if (!image) return null;

  const multiple = images.length > 1;
  const atStart = index <= 0;
  const atEnd = index >= images.length - 1;
  const navBtn =
    'absolute top-1/2 -translate-y-1/2 rounded-full bg-white/10 px-3 py-2 text-2xl leading-none text-white transition hover:bg-white/20 disabled:cursor-default disabled:opacity-25';

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      {/*
        The controls live inside the dialog, not beside it: `aria-modal` is only
        honest if the modal container holds what it owns, and the focus trap needs
        that same boundary. They stay visually put — all three are `absolute` and
        the figure is not `relative`, so the fixed backdrop remains their anchor.
      */}
      <figure
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
        tabIndex={-1}
        className="flex max-h-full max-w-full flex-col items-center gap-2 focus:outline-none"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-full bg-white/10 px-2.5 py-1 text-lg leading-none text-white transition hover:bg-white/20"
        >
          ✕
        </button>

        {multiple && (
          <button
            type="button"
            aria-label="Previous image"
            disabled={atStart}
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(stepIndex(index, -1, images.length));
            }}
            className={`${navBtn} left-3`}
          >
            ‹
          </button>
        )}

        <ResolvedImage
          src={image.src}
          alt={image.alt}
          className="max-h-[85vh] max-w-[90vw] rounded object-contain"
        />
        {multiple && (
          <figcaption className="text-xs text-white/70">
            {index + 1} / {images.length}
          </figcaption>
        )}

        {multiple && (
          <button
            type="button"
            aria-label="Next image"
            disabled={atEnd}
            onClick={(e) => {
              e.stopPropagation();
              onIndexChange(stepIndex(index, 1, images.length));
            }}
            className={`${navBtn} right-3`}
          >
            ›
          </button>
        )}
      </figure>
    </div>
  );
}
