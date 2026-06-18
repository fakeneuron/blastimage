/**
 * blastimage — imagegen path URL helpers (BI-024.1)
 *
 * Round images on disk are referenced in session state as `imagegen:<path>`
 * strings (path relative to the linked `imagegen/` root). Keeps localStorage
 * small — see `docs/REVIEW-LOOP.md` §5.
 */

export const IMAGEGEN_URL_PREFIX = 'imagegen:';

/** Builds a session-stored URL for a file under the linked `imagegen/` root. */
export function toImagegenUrl(relativePath: string): string {
  const normalized = relativePath.replace(/^\/+/, '');
  return `${IMAGEGEN_URL_PREFIX}${normalized}`;
}

/** True when `url` is an on-disk imagegen path reference (not inline/remote). */
export function isImagegenUrl(url: string): boolean {
  return url.startsWith(IMAGEGEN_URL_PREFIX);
}

/** Strips the `imagegen:` prefix, yielding a path relative to the imagegen root. */
export function imagegenPathFromUrl(url: string): string {
  if (!isImagegenUrl(url)) return url;
  return url.slice(IMAGEGEN_URL_PREFIX.length);
}

/** Builds the stored URL for one image file inside `rounds/r<N>/`. */
export function roundImageUrl(round: number, filename: string): string {
  return toImagegenUrl(`rounds/r${round}/${filename}`);
}