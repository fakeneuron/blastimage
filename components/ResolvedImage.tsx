'use client';

/**
 * blastimage — imagegen-aware <img> (BI-024.1)
 *
 * Resolves `imagegen:` path URLs through the linked folder handle; passes
 * `data:` and `https:` URLs through unchanged.
 *
 * The provider revokes cached blob URLs behind our back (BI-029.4), so this
 * component both *reacts* to a staleness revocation (`blobEpoch` in the resolve
 * effect) and *prevents* a memory-bound one from stranding it (holding its blob
 * URL while it is on screen) — see BI-042.2 and {@link ImagegenApi.blobEpoch}.
 *
 * A clip (`.mp4`, BI-078.4) renders as a muted, looping `<video>` instead: its
 * poster resolves the same way, the consumer drives playback with `playing`
 * (grid hover/focus) or hands it native `controls` (Lightbox), and
 * `prefers-reduced-motion` vetoes `playing` here so no consumer can forget it.
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';

import { useImagegen } from '@/lib/ImagegenContext';
import { mediaKindFromPath } from '@/lib/imagegenUrl';
import { usePrefersReducedMotion } from '@/lib/usePrefersReducedMotion';

interface ResolvedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  /** Clips only: the still shown before and between plays (an `imagegen:` URL is resolved). */
  poster?: string | undefined;
  /** Clips only: native playback controls (user-started, so reduced motion allows them). */
  controls?: boolean;
  /**
   * Clips only: play while true, pause and rewind when false. Ignored under
   * `prefers-reduced-motion`; leave undefined to not drive playback at all.
   */
  playing?: boolean;
}

export default function ResolvedImage({
  src,
  alt,
  className,
  style,
  poster,
  controls = false,
  playing,
}: ResolvedImageProps) {
  // `linked` (BI-038) and `blobEpoch` (BI-042.2) are intentionally in the resolve
  // effect's deps: `resolveDisplayUrl` is a stable `useCallback([])`, so without
  // them an image would never re-resolve after the handle restore settles, nor
  // after a round reload revoked the blob URL it is showing.
  const { resolveDisplayUrl, linked, blobEpoch, retainDisplayUrl } = useImagegen();
  const [displaySrc, setDisplaySrc] = useState(src);
  const [displayPoster, setDisplayPoster] = useState(poster);
  const isVideo = mediaKindFromPath(src) === 'video';
  const reducedMotion = usePrefersReducedMotion();
  const videoRef = useRef<HTMLVideoElement>(null);

  // A new subject drops the old blob immediately — never render the previous
  // image against the new `src`. Adjusted during render rather than in an
  // effect (BI-050) so the swap lands before paint instead of one committed
  // render later; keying it on `src` alone is what keeps a `blobEpoch` bump
  // from flashing every mounted image back to its raw URL (BI-042.2).
  const [resetFor, setResetFor] = useState(src);
  if (resetFor !== src) {
    setResetFor(src);
    setDisplaySrc(src);
    setDisplayPoster(poster);
  }

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [resolved, resolvedPoster] = await Promise.all([
        resolveDisplayUrl(src),
        poster === undefined ? undefined : resolveDisplayUrl(poster),
      ]);
      if (cancelled) return;
      setDisplaySrc(resolved);
      setDisplayPoster(resolvedPoster);
    })();
    return () => {
      cancelled = true;
    };
  }, [src, poster, resolveDisplayUrl, linked, blobEpoch]);

  // Drive playback only when the consumer asked to; `play()` rejects when a
  // pause interrupts it or the browser refuses, and either is fine to drop.
  // `displaySrc` is a dep because a new source reloads the element paused, so
  // a card still hovered when its URL resolves (or re-resolves) must re-play.
  const shouldPlay = playing === true && !reducedMotion;
  useEffect(() => {
    const video = videoRef.current;
    if (!video || playing === undefined) return;
    if (shouldPlay) {
      void video.play()?.catch(() => {});
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [shouldPlay, playing, isVideo, displaySrc]);

  // Hold the cache entry for as long as it is rendered, so LRU eviction skips it.
  // The cleanup is the release, so the two can never drift apart.
  useEffect(() => {
    if (!displaySrc.startsWith('blob:')) return;
    return retainDisplayUrl(displaySrc);
  }, [displaySrc, retainDisplayUrl]);

  if (isVideo) {
    return (
      <video
        ref={videoRef}
        src={displaySrc}
        poster={displayPoster}
        aria-label={alt}
        muted
        playsInline
        loop
        preload="metadata"
        controls={controls}
        className={className}
        style={style}
      />
    );
  }

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={displaySrc} alt={alt} className={className} style={style} />;
}