/**
 * blastimage — the single URL→bytes path (BI-029.2)
 *
 * Stored image URLs come in three flavours: inline `data:` URLs, remote
 * `https:` URLs, and `imagegen:` path references into the linked folder
 * (BI-024.1). Only the first two are fetchable as written, so every consumer
 * that needs *bytes* — folder export, review sheet, per-image download — must
 * go through {@link resolveImageBlob} rather than calling `fetch` itself.
 *
 * The linked-folder root arrives as an argument rather than an import so
 * `lib/storage.ts` can consume the resolver without depending on React context.
 * Since BI-045 the root is the absolute path the operator linked, and an
 * `imagegen:` URL resolves by fetching the app's own `/api/imagegen/file`
 * route — which is why this now works in Safari and Brave, where the File
 * System Access handle this parameter used to carry never existed.
 * {@link import('./ImagegenContext').ImagegenProvider} binds the root once and
 * hands callers the one-argument {@link ImageBlobResolver}.
 */

import { imagegenFileUrl } from './imagegenClient';
import { imagegenPathFromUrl, isImagegenUrl } from './imagegenUrl';

/** A root-bound {@link resolveImageBlob}, as injected into byte-consuming call sites. */
export type ImageBlobResolver = (url: string) => Promise<Blob>;

/**
 * Resolves any stored image URL to its bytes: `imagegen:` paths read through
 * the linked folder `root`, everything else fetches as before. Throws when an
 * `imagegen:` URL is seen with no linked root — callers already treat a
 * rejection as "this image is unavailable" and count it.
 */
export async function resolveImageBlob(url: string, root: string | null): Promise<Blob> {
  if (isImagegenUrl(url)) {
    if (!root) throw new Error('Link your imagegen folder first (🔗 in the sidebar).');
    const res = await fetch(imagegenFileUrl(root, imagegenPathFromUrl(url), 0));
    if (!res.ok) throw new Error(`Could not read ${imagegenPathFromUrl(url)}.`);
    return res.blob();
  }
  const res = await fetch(url);
  return res.blob();
}
