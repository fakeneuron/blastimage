/**
 * imagegen approved route tests (TEST-012.3)
 *
 * `lib/imagegenRouteGuard.test.ts` proves every route refuses an unguarded
 * request; nothing drove the handler bodies past the guard. This suite does it
 * for `app/api/imagegen/approved/route.ts` — `GET` (BI-032 conflict probe),
 * `POST` (promote a keeper) and `DELETE` (undo one, BI-030.2) — for real against
 * a temp root, so "copied", "replaced" and "removed" are asserted on the
 * filesystem rather than on a mock.
 *
 * Lives in `lib/` because the vitest glob excludes `app/` (see
 * `lib/imagegenRouteGuard.test.ts`). Requests are request-shaped literals: the
 * `Request` constructor drops the `Host` and `Sec-*` headers the guard reads.
 * The root is `realpath`'d up front — `resolveRoot` returns canonical paths, so
 * a raw temp path never matches on macOS (`/var` -> `/private/var`).
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, readdir, readFile, realpath, rm, stat, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { DELETE, GET, POST } from '@/app/api/imagegen/approved/route';
import { UNLINKED_FOLDER_MESSAGE } from '@/lib/types';

const ORIGIN = 'http://localhost:3003/api/imagegen/approved';
const SAME_ORIGIN = { host: 'localhost:3003', 'sec-fetch-site': 'same-origin' };

let root: string;
let outside: string;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-approved-')));
  outside = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-outside-')));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
  await rm(outside, { recursive: true, force: true });
});

/** A same-origin request whose query is `params`; `undefined` values are omitted. */
function query(method: 'GET' | 'DELETE', params: Record<string, string | undefined>): Request {
  const url = new URL(ORIGIN);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, value);
  }
  return { method, url: url.toString(), headers: new Headers(SAME_ORIGIN) } as unknown as Request;
}

/** A same-origin POST whose `json()` resolves to `body`. */
function post(body: unknown): Request {
  return {
    method: 'POST',
    url: ORIGIN,
    headers: new Headers(SAME_ORIGIN),
    json: async () => body,
  } as unknown as Request;
}

async function seed(path: string, bytes: number[]): Promise<void> {
  await mkdir(join(root, path, '..'), { recursive: true });
  await writeFile(join(root, path), Buffer.from(bytes));
}

async function bytesAt(path: string): Promise<number[] | null> {
  try {
    return [...(await readFile(join(root, path)))];
  } catch {
    return null;
  }
}

async function dirExists(path: string): Promise<boolean> {
  try {
    return (await stat(join(root, path))).isDirectory();
  } catch {
    return false;
  }
}

describe('GET /api/imagegen/approved', () => {
  it('reports no conflict when nothing is approved under that name', async () => {
    await seed('rounds/r1/hero.png', [1, 2, 3]);
    const response = await GET(query('GET', { root, round: '1', filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: false });
  });

  it('reports no conflict when the approved image is byte-identical', async () => {
    await seed('rounds/r1/hero.png', [1, 2, 3]);
    await seed('approved/hero.png', [1, 2, 3]);
    const response = await GET(query('GET', { root, round: '1', filename: 'hero.png' }));
    expect(await response.json()).toEqual({ ok: true, value: false });
  });

  it('reports a conflict when a different image already holds the name', async () => {
    await seed('rounds/r1/hero.png', [1, 2, 3]);
    await seed('approved/hero.png', [9, 9, 9]);
    const response = await GET(query('GET', { root, round: '1', filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: true });
  });

  it('answers 400 when the round has no such source image', async () => {
    await seed('approved/hero.png', [9, 9, 9]);
    const response = await GET(query('GET', { root, round: '1', filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Could not read rounds/r1/hero.png.' });
  });

  it('answers 400 when no root is linked', async () => {
    const response = await GET(query('GET', { round: '1', filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: UNLINKED_FOLDER_MESSAGE });
  });

  it('answers 400 when the root does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await GET(query('GET', { root: missing, round: '1', filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
  });

  it('answers 400 when approved/ is a symlink out of the root', async () => {
    await seed('rounds/r1/hero.png', [1, 2, 3]);
    await writeFile(join(outside, 'hero.png'), Buffer.from([9, 9, 9]));
    await symlink(outside, join(root, 'approved'));
    const response = await GET(query('GET', { root, round: '1', filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Path escapes the linked imagegen folder: approved/hero.png',
    });
  });

  const refusals: [string, Record<string, string>, string][] = [
    ['the round is not a number', { round: 'x', filename: 'hero.png' }, 'Invalid round: x'],
    ['the filename is missing', { round: '1' }, 'Missing filename.'],
    ['the filename is ..', { round: '1', filename: '..' }, 'Filename must not contain a path: ..'],
    ['the filename carries a path', { round: '1', filename: '../x.png' }, 'Filename must not contain a path: ../x.png'],
  ];

  for (const [name, params, error] of refusals) {
    it(`answers 400 when ${name}`, async () => {
      const response = await GET(query('GET', { root, ...params }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error });
    });
  }
});

describe('POST /api/imagegen/approved', () => {
  it('copies the keeper into approved/, creating the folder', async () => {
    await seed('rounds/r2/hero.png', [4, 5, 6]);
    const response = await POST(post({ root, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await bytesAt('approved/hero.png')).toEqual([4, 5, 6]);
    // A promote copies — the round's own file is left alone.
    expect(await bytesAt('rounds/r2/hero.png')).toEqual([4, 5, 6]);
  });

  it('replaces a different image already approved under that name', async () => {
    await seed('rounds/r2/hero.png', [4, 5, 6]);
    await seed('approved/hero.png', [9, 9, 9]);
    const response = await POST(post({ root, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await bytesAt('approved/hero.png')).toEqual([4, 5, 6]);
  });

  it('answers 400 and writes nothing when the round has no such image', async () => {
    const response = await POST(post({ root, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Could not promote hero.png to approved/.' });
    expect(await bytesAt('approved/hero.png')).toBeNull();
  });

  const refusals: [string, unknown, string][] = [
    ['the body is not an object', 'hero', 'Expected a JSON object body.'],
    ['the body is null', null, 'Expected a JSON object body.'],
    ['no root is named', { round: 2, filename: 'hero.png' }, UNLINKED_FOLDER_MESSAGE],
    ['the root is not a string', { root: 7, round: 2, filename: 'hero.png' }, UNLINKED_FOLDER_MESSAGE],
  ];

  for (const [name, body, error] of refusals) {
    it(`answers 400 when ${name}`, async () => {
      const response = await POST(post(body));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error });
    });
  }

  it('answers 400 when the round is invalid, without creating approved/', async () => {
    await seed('rounds/r2/hero.png', [4, 5, 6]);
    const response = await POST(post({ root, round: -1, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Invalid round: -1' });
    expect(await dirExists('approved')).toBe(false);
  });

  const badFilenames = ['sub/hero.png', 'sub\\hero.png', '.', '..'];

  for (const filename of badFilenames) {
    it(`answers 400 for filename ${JSON.stringify(filename)}, without creating approved/`, async () => {
      await seed('rounds/r2/hero.png', [4, 5, 6]);
      const response = await POST(post({ root, round: 2, filename }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        error: `Filename must not contain a path: ${filename}`,
      });
      expect(await dirExists('approved')).toBe(false);
    });
  }

  it('answers 400 when the root does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await POST(post({ root: missing, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
    expect(await dirExists('nope')).toBe(false);
  });

  it('answers 400 when the root is a file', async () => {
    const file = join(root, 'tasks.json');
    await writeFile(file, '{}');
    const response = await POST(post({ root: file, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `Not a folder: ${file}` });
  });

  it('answers 400 and writes nothing when approved/ is a symlink out of the root', async () => {
    await seed('rounds/r2/hero.png', [4, 5, 6]);
    await symlink(outside, join(root, 'approved'));
    const response = await POST(post({ root, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Path escapes the linked imagegen folder: approved/hero.png',
    });
    expect(await readdir(outside)).toEqual([]);
  });

  it('answers 400 and writes nothing when the source image is a symlink out of the root', async () => {
    await writeFile(join(outside, 'secret.png'), Buffer.from([7, 7, 7]));
    await mkdir(join(root, 'rounds', 'r2'), { recursive: true });
    await symlink(join(outside, 'secret.png'), join(root, 'rounds', 'r2', 'hero.png'));
    const response = await POST(post({ root, round: 2, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Path escapes the linked imagegen folder: rounds/r2/hero.png',
    });
    expect(await bytesAt('approved/hero.png')).toBeNull();
  });

  it('answers 400 when the body is not valid JSON', async () => {
    const request = {
      method: 'POST',
      url: ORIGIN,
      headers: new Headers(SAME_ORIGIN),
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    } as unknown as Request;
    const response = await POST(request);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Expected a JSON object body.' });
  });
});

describe('DELETE /api/imagegen/approved', () => {
  it('removes a previously promoted keeper', async () => {
    await seed('approved/hero.png', [4, 5, 6]);
    const response = await DELETE(query('DELETE', { root, filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await bytesAt('approved/hero.png')).toBeNull();
  });

  it('leaves the round source untouched', async () => {
    await seed('rounds/r1/hero.png', [4, 5, 6]);
    await seed('approved/hero.png', [4, 5, 6]);
    await DELETE(query('DELETE', { root, filename: 'hero.png' }));
    expect(await bytesAt('rounds/r1/hero.png')).toEqual([4, 5, 6]);
  });

  it('succeeds when the file is already gone (idempotent)', async () => {
    await mkdir(join(root, 'approved'));
    const response = await DELETE(query('DELETE', { root, filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('succeeds when approved/ was never created', async () => {
    const response = await DELETE(query('DELETE', { root, filename: 'hero.png' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
  });

  it('answers 400 when the name points at a directory rather than a file', async () => {
    await mkdir(join(root, 'approved', 'hero.png'), { recursive: true });
    const response = await DELETE(query('DELETE', { root, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Could not remove hero.png from approved/.' });
  });

  it('answers 400 when no root is linked', async () => {
    const response = await DELETE(query('DELETE', { filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: UNLINKED_FOLDER_MESSAGE });
  });

  it('answers 400 when the root does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await DELETE(query('DELETE', { root: missing, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
  });

  it('answers 400 and deletes nothing when approved/ is a symlink out of the root', async () => {
    await writeFile(join(outside, 'hero.png'), Buffer.from([7, 7, 7]));
    await symlink(outside, join(root, 'approved'));
    const response = await DELETE(query('DELETE', { root, filename: 'hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Path escapes the linked imagegen folder: approved/hero.png',
    });
    expect([...(await readFile(join(outside, 'hero.png')))]).toEqual([7, 7, 7]);
  });

  for (const filename of ['.', '..']) {
    it(`answers 400 and deletes nothing for filename ${JSON.stringify(filename)}`, async () => {
      await seed('approved/hero.png', [4, 5, 6]);
      const response = await DELETE(query('DELETE', { root, filename }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        ok: false,
        error: `Filename must not contain a path: ${filename}`,
      });
      expect(await bytesAt('approved/hero.png')).toEqual([4, 5, 6]);
    });
  }

  it('answers 400 and deletes nothing when the filename carries a path', async () => {
    await seed('approved/hero.png', [4, 5, 6]);
    const response = await DELETE(query('DELETE', { root, filename: '../approved/hero.png' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Filename must not contain a path: ../approved/hero.png',
    });
    expect(await bytesAt('approved/hero.png')).toEqual([4, 5, 6]);
  });
});
