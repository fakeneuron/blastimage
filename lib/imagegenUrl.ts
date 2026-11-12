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

/** Extracts the round number from an `imagegen:rounds/r<N>/…` URL, or `null`. */
export function roundNumberFromImageUrl(url: string): number | null {
  if (!isImagegenUrl(url)) return null;
  const m = /^rounds\/r(\d+)\//.exec(imagegenPathFromUrl(url));
  return m ? Number(m[1]) : null;
}

/** Extracts the filename (relative to `rounds/r<N>/`) from a round image URL. */
export function roundImageFilenameFromUrl(url: string): string | null {
  if (!isImagegenUrl(url)) return null;
  const m = /^rounds\/r\d+\/(.+)$/.exec(imagegenPathFromUrl(url));
  return m ? m[1]! : null;
}

/** What a round file renders as (BI-078.2). */
export type MediaKind = 'image' | 'video';

/**
 * Media kind from a filename, a path relative to `imagegen/`, or an
 * `imagegen:` URL — by extension, so no persisted discriminator is needed.
 * `.mp4` is the only clip format (BI-078.1); everything else is an image.
 * Pass the stored path or `imagegen:` URL, never a display URL from
 * `imagegenFileUrl` — its trailing `&v=<epoch>` hides the extension.
 */
export function mediaKindFromPath(path: string): MediaKind {
  return /\.mp4$/i.test(path.trim()) ? 'video' : 'image';
}
