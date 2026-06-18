'use client';

/**
 * blastimage — imagegen-aware <img> (BI-024.1)
 *
 * Resolves `imagegen:` path URLs through the linked folder handle; passes
 * `data:` and `https:` URLs through unchanged.
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
  const { resolveDisplayUrl } = useImagegen();
  const [displaySrc, setDisplaySrc] = useState(src);

  useEffect(() => {
    let cancelled = false;
    setDisplaySrc(src);
    void (async () => {
      const resolved = await resolveDisplayUrl(src);
      if (!cancelled) setDisplaySrc(resolved);
    })();
    return () => {
      cancelled = true;
    };
  }, [src, resolveDisplayUrl]);

  // eslint-disable-next-line @next/next/no-img-element
  return <img src={displaySrc} alt={alt} className={className} style={style} />;
}