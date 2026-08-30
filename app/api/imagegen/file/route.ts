/**
 * blastimage — serve one file from the linked imagegen folder (BI-045)
 *
 * The `<img src>` target behind every `imagegen:` URL, and the byte source for
 * export/download. Responses are `no-store`: the folder is edited underfoot by
 * the terminal loop, and a cached round image would survive a regeneration.
 */

import { NextResponse } from 'next/server';

import { refuseUnguarded, resultResponse, rootFrom } from '@/lib/imagegenRoute';
import { readImagegenBytes } from '@/lib/imagegenServerFs';

/** Content types for what the review loop actually writes into `imagegen/`. */
const CONTENT_TYPES: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
  avif: 'image/avif',
  json: 'application/json',
  txt: 'text/plain; charset=utf-8',
  md: 'text/markdown; charset=utf-8',
};

/** The content type for a known extension, or `null` for anything else. */
export function contentTypeFor(path: string): string | null {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? null;
}

export async function GET(req: Request) {
  const refusal = refuseUnguarded(req);
  if (refusal) return refusal;
  const params = new URL(req.url).searchParams;
  const root = await rootFrom(params.get('root'));
  if (!root.ok) return resultResponse(root);
  const path = params.get('path');
  if (!path) return resultResponse({ ok: false, error: 'Empty imagegen path.' });
  const contentType = contentTypeFor(path);
  if (!contentType) return resultResponse({ ok: false, error: `Unsupported file type: ${path}` });
  const bytes = await readImagegenBytes(root.value, path);
  if (!bytes.ok) return resultResponse(bytes);
  return new NextResponse(new Uint8Array(bytes.value), {
    headers: {
      'Content-Type': contentType,
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
