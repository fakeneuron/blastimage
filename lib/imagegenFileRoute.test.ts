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

import { contentTypeFor, GET } from '../app/api/imagegen/file/route';

/** A request-shaped literal for a same-origin GET against the file route. */
function fileReq(root: string, path: string): Request {
  const url = new URL('http://localhost:3003/api/imagegen/file');
  url.searchParams.set('root', root);
  url.searchParams.set('path', path);
  return {
    method: 'GET',
    url: url.toString(),
    headers: new Headers({ 'sec-fetch-site': 'same-origin' }),
  } as unknown as Request;
}

describe('contentTypeFor', () => {
  it('maps every extension the review loop writes', () => {
    expect(contentTypeFor('001.png')).toBe('image/png');
    expect(contentTypeFor('rounds/r1/batch.json')).toBe('application/json');
    expect(contentTypeFor('notes.md')).toBe('text/markdown; charset=utf-8');
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
  });
});
