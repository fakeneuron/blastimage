'use client';

/**
 * blastimage — full-size image lightbox overlay (BI-027)
 *
 * Click-to-enlarge for the review grid ({@link ReviewGrid}, which also backs
 * {@link BulkReviewPane}) and the approved gallery ({@link GalleryPanel}).
 * Mirrors the {@link FeedbackModal} overlay pattern (fixed inset-0, backdrop
 * click + Esc to close); Left/Right arrows step through the set, clamped at the
 * ends (`lib/lightbox.ts`). Presentational only — the index math lives in lib.
 */

import { useEffect } from 'react';

import ResolvedImage from '@/components/ResolvedImage';
import { stepIndex } from '@/lib/lightbox';

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

  // Esc closes; Left/Right step through the set (clamped, no wrap).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft') onIndexChange(stepIndex(index, -1, images.length));
      else if (e.key === 'ArrowRight') onIndexChange(stepIndex(index, 1, images.length));
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

      <figure
        role="dialog"
        aria-modal="true"
        aria-label="Image viewer"
        className="flex max-h-full max-w-full flex-col items-center gap-2"
        onClick={(e) => e.stopPropagation()}
      >
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
      </figure>

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
    </div>
  );
}
