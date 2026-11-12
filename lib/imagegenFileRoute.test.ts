/**
 * imagegen file route tests (BI-048)
 *
 * `app/api/imagegen/file/route.ts` used to fall back to
 * `application/octet-stream` for any extension `CONTENT_TYPES` didn't
 * recognize, serving whatever byte content sits under the linked root with an
 * anything-goes MIME type. This suite pins the hardened behavior: an
 * unrecognized extension is refused before the file is ever read, and a
 * served file carries `X-Content-Type-Options: nosniff` so a browser won't
 * MIME-sniff around a mislabeled response.
 *
 * The GET fixture and temp-root setup mirror `imagegenRoute.test.ts`'s
 * `rootFrom` suite — `resolveRoot` returns `realpath` output, so a raw temp
 * path never matches on macOS (`/var` -> `/private/var`) unless canonicalized
 * up front.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { contentTypeFor, GET, parseByteRange } from '../app/api/imagegen/file/route';

/** A request-shaped literal for a same-origin GET against the file route. */
function fileReq(root: string, path: string, range?: string): Request {
  const url = new URL('http://localhost:3003/api/imagegen/file');
  url.searchParams.set('root', root);
  url.searchParams.set('path', path);
  const headers = new Headers({ 'sec-fetch-site': 'same-origin' });
  if (range) headers.set('range', range);
  return { method: 'GET', url: url.toString(), headers } as unknown as Request;
}

describe('contentTypeFor', () => {
  it('maps every extension the review loop writes', () => {
    expect(contentTypeFor('001.png')).toBe('image/png');
    expect(contentTypeFor('rounds/r1/batch.json')).toBe('application/json');
    expect(contentTypeFor('notes.md')).toBe('text/markdown; charset=utf-8');
    expect(contentTypeFor('rounds/r1/hero-banner-001.mp4')).toBe('video/mp4');
  });

  it('is case-insensitive on the extension', () => {
    expect(contentTypeFor('001.PNG')).toBe('image/png');
  });

  it('returns null for an unrecognized extension instead of a fallback type', () => {
    expect(contentTypeFor('archive.zip')).toBeNull();
    expect(contentTypeFor('script.sh')).toBeNull();
  });

  it('returns null for a path with no extension', () => {
    expect(contentTypeFor('README')).toBeNull();
  });
});

describe('parseByteRange', () => {
  it('ignores an absent, malformed, multi-range, or non-bytes header', () => {
    expect(parseByteRange(null, 10)).toBeNull();
    expect(parseByteRange('bytes=-', 10)).toBeNull();
    expect(parseByteRange('bytes=0-1,4-5', 10)).toBeNull();
    expect(parseByteRange('items=0-1', 10)).toBeNull();
    expect(parseByteRange('bytes=5-3', 10)).toBeNull();
  });

  it('reads the closed, open-ended, and suffix forms, clamping to the file', () => {
    expect(parseByteRange('bytes=0-1', 10)).toEqual({ start: 0, end: 1 });
    expect(parseByteRange('bytes=4-', 10)).toEqual({ start: 4, end: 9 });
    expect(parseByteRange('bytes=8-99', 10)).toEqual({ start: 8, end: 9 });
    expect(parseByteRange('bytes=-3', 10)).toEqual({ start: 7, end: 9 });
    expect(parseByteRange('bytes=-99', 10)).toEqual({ start: 0, end: 9 });
  });

  it('marks a range that misses the file as unsatisfiable', () => {
    expect(parseByteRange('bytes=10-', 10)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=12-15', 10)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=-0', 10)).toBe('unsatisfiable');
    expect(parseByteRange('bytes=-5', 0)).toBe('unsatisfiable');
  });
});

describe('GET /api/imagegen/file', () => {
  let root: string;

  beforeEach(async () => {
    root = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-')));
  });

  afterEach(async () => {
    await rm(root, { recursive: true, force: true });
  });

  it('refuses an unsupported extension with a 400 and never reads the file', async () => {
    // No file is written at this path: a 400 here proves the rejection ran
    // before `readImagegenBytes`, not that the read itself failed.
    const response = await GET(fileReq(root, 'payload.exe'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Unsupported file type: payload.exe',
    });
  });

  it('serves a recognized extension with nosniff alongside the existing no-store header', async () => {
    await writeFile(join(root, '001.png'), Buffer.from([1, 2, 3]));
    const response = await GET(fileReq(root, '001.png'));
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('image/png');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Accept-Ranges')).toBe('bytes');
  });

  describe('byte ranges (BI-078.3)', () => {
    const clip = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

    beforeEach(async () => {
      await writeFile(join(root, 'take-001.mp4'), clip);
    });

    it('answers a satisfiable range with 206 and exactly that slice', async () => {
      const response = await GET(fileReq(root, 'take-001.mp4', 'bytes=2-5'));
      expect(response.status).toBe(206);
      expect(response.headers.get('Content-Type')).toBe('video/mp4');
      expect(response.headers.get('Content-Range')).toBe('bytes 2-5/10');
      expect(response.headers.get('Content-Length')).toBe('4');
      expect(response.headers.get('Accept-Ranges')).toBe('bytes');
      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([2, 3, 4, 5]);
    });

    it('serves the two-byte probe Safari sends first', async () => {
      const response = await GET(fileReq(root, 'take-001.mp4', 'bytes=0-1'));
      expect(response.status).toBe(206);
      expect([...new Uint8Array(await response.arrayBuffer())]).toEqual([0, 1]);
    });

    it('answers a range past the end with 416 and the file size', async () => {
      const response = await GET(fileReq(root, 'take-001.mp4', 'bytes=10-'));
      expect(response.status).toBe(416);
      expect(response.headers.get('Content-Range')).toBe('bytes */10');
      expect(response.headers.get('Content-Type')).toBeNull();
    });

    it('ignores the range when If-Range is sent, since no validator can match', async () => {
      const req = fileReq(root, 'take-001.mp4', 'bytes=2-5');
      req.headers.set('if-range', 'Wed, 21 Oct 2026 07:28:00 GMT');
      const response = await GET(req);
      expect(response.status).toBe(200);
      expect(new Uint8Array(await response.arrayBuffer()).length).toBe(10);
    });

    it('serves the whole file with 200 when the range is ignored', async () => {
      const response = await GET(fileReq(root, 'take-001.mp4', 'bytes=0-1,4-5'));
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Range')).toBeNull();
      expect(new Uint8Array(await response.arrayBuffer()).length).toBe(10);
    });
  });
});
