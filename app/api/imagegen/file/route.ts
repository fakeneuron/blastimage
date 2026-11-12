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
  mp4: 'video/mp4',
};

/** The content type for a known extension, or `null` for anything else. */
export function contentTypeFor(path: string): string | null {
  const ext = path.slice(path.lastIndexOf('.') + 1).toLowerCase();
  return CONTENT_TYPES[ext] ?? null;
}

/** An inclusive byte span within a file of known size. */
export interface ByteRange {
  start: number;
  end: number;
}

/**
 * Parses a `Range` header against a file of `size` bytes. Returns the span to
 * serve, `'unsatisfiable'` for a well-formed range that misses the file (416),
 * or `null` to ignore the header and serve the whole file — absent, malformed,
 * a non-`bytes` unit, or several ranges at once (RFC 9110 lets a server ignore
 * `Range`; `<video>` only ever asks for one).
 */
export function parseByteRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) return null;
  const [, first = '', last = ''] = match;
  if (first === '' && last === '') return null;
  if (first === '') {
    const suffix = Number(last);
    if (suffix === 0 || size === 0) return 'unsatisfiable';
    return { start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(first);
  if (last !== '' && Number(last) < start) return null;
  if (start >= size) return 'unsatisfiable';
  return { start, end: last === '' ? size - 1 : Math.min(Number(last), size - 1) };
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
  const common = {
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };
  const headers = { ...common, 'Content-Type': contentType };
  const size = bytes.value.length;
  // No ETag or Last-Modified is sent, so no `If-Range` validator can match:
  // RFC 9110 says to answer the whole file, not a slice of a file that may
  // have been regenerated underfoot.
  const range = req.headers.has('if-range') ? null : parseByteRange(req.headers.get('range'), size);
  if (range === 'unsatisfiable') {
    // An empty body, so no `Content-Type` to describe it.
    return new NextResponse(null, { status: 416, headers: { ...common, 'Content-Range': `bytes */${size}` } });
  }
  if (range) {
    const slice = bytes.value.subarray(range.start, range.end + 1);
    return new NextResponse(new Uint8Array(slice), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${range.start}-${range.end}/${size}`,
        'Content-Length': String(slice.length),
      },
    });
  }
  return new NextResponse(new Uint8Array(bytes.value), { headers });
}
