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
 */

import { useEffect, useState, type CSSProperties } from 'react';

import { useImagegen } from '@/lib/ImagegenContext';

interface ResolvedImageProps {
  src: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
}

export default function ResolvedImage({ src, alt, className, style }: ResolvedImageProps) {
  // `linked` (BI-038) and `blobEpoch` (BI-042.2) are intentionally in the resolve
  // effect's deps: `resolveDisplayUrl` is a stable `useCallback([])`, so without
  // them an image would never re-resolve after the handle restore settles, nor
  // after a round reload revoked the blob URL it is showing.
  const { resolveDisplayUrl, linked, blobEpoch, retainDisplayUrl } = useImagegen();
  const [displaySrc, setDisplaySrc] = useState(src);

  // A new subject drops the old blob immediately — never render the previous
  // image against the new `src`. Split from the resolve effect below so a
  // `blobEpoch` bump does not flash every mounted image back to its raw URL.
  useEffect(() => {
    setDisplaySrc(src);
  }, [src]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const resolved = await resolveDisplayUrl(src);
      if (!cancelled) setDisplaySrc(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [src, resolveDisplayUrl, linked, blobEpoch]);

  // Hold the cache entry for as long as it is rendered, so LRU eviction skips it.
  // The cleanup is the release, so the two can never drift apart.
  useEffect(() => {
    if (!displaySrc.startsWith('blob:')) return;
    return retainDisplayUrl(displaySrc);
  }, [displaySrc, retainDisplayUrl]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={displaySrc} alt={alt} className={className} style={style} />;
}