'use client';

/**
 * blastimage — `prefers-reduced-motion` as a React value (BI-078.4)
 *
 * Read by {@link import('@/components/ResolvedImage').default} so a clip never
 * plays on its own when the viewer asked for reduced motion. Server render and
 * a browser without `matchMedia` both read `false`.
 */

import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void): () => void {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const list = window.matchMedia(QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}

function getSnapshot(): boolean {
  return typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(QUERY).matches;
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
