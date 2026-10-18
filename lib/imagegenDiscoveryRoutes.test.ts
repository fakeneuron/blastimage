/**
 * imagegen discovery route tests (TEST-012.3)
 *
 * `browse`, `link`, `round` and `rounds` are the routes that *find* and *read*
 * the linked folder: the picker's directory listing (BI-046), the link
 * validation (BI-045), a round's `batch.json` text, and the round index
 * (BI-053.3). `lib/imagegenRouteGuard.test.ts` proves each refuses an unguarded
 * request; this suite drives the handler bodies past the guard, for real
 * against temp directories, so the wire shape is asserted rather than assumed.
 *
 * Lives in `lib/` because the vitest glob excludes `app/`. Requests are
 * request-shaped literals — the `Request` constructor drops the `Host` and
 * `Sec-*` headers the guard reads — and roots are `realpath`'d up front
 * (`resolveRoot` returns canonical paths; macOS `/var` -> `/private/var`).
 *
 * `browse` is always pointed at a temp directory: with no `path` it lists the
 * home directory, which a test has no business reading.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { GET as browseGET } from '@/app/api/imagegen/browse/route';
import { GET as linkGET, POST as linkPOST } from '@/app/api/imagegen/link/route';
import { GET as roundGET } from '@/app/api/imagegen/round/route';
import { GET as roundsGET } from '@/app/api/imagegen/rounds/route';
import { UNLINKED_FOLDER_MESSAGE } from '@/lib/types';

const SAME_ORIGIN = { host: 'localhost:3003', 'sec-fetch-site': 'same-origin' };

let root: string;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-discovery-')));
});

afterEach(async () => {
  vi.restoreAllMocks();
  await rm(root, { recursive: true, force: true });
});

/** A same-origin GET against `route` with `params` as the query string. */
function get(route: string, params: Record<string, string> = {}): Request {
  const url = new URL(`http://localhost:3003/api/imagegen/${route}`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return { method: 'GET', url: url.toString(), headers: new Headers(SAME_ORIGIN) } as unknown as Request;
}

/** A same-origin POST whose `json()` resolves to `body`. */
function post(route: string, body: unknown): Request {
  return {
    method: 'POST',
    url: `http://localhost:3003/api/imagegen/${route}`,
    headers: new Headers(SAME_ORIGIN),
    json: async () => body,
  } as unknown as Request;
}

async function writeBatch(round: number, batch: unknown): Promise<void> {
  const dir = join(root, 'rounds', `r${round}`);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'batch.json'), typeof batch === 'string' ? batch : JSON.stringify(batch));
}

describe('GET /api/imagegen/browse', () => {
  it('lists subdirectories alphabetically, flags imagegen folders, and names the parent', async () => {
    await mkdir(join(root, 'zeta'));
    await mkdir(join(root, 'alpha', 'rounds'), { recursive: true });
    await mkdir(join(root, '.hidden'));
    await writeFile(join(root, 'notes.txt'), 'not a directory');

    const response = await browseGET(get('browse', { path: root }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      value: {
        path: root,
        parent: dirname(root),
        entries: [
          { name: 'alpha', path: join(root, 'alpha'), recognized: true },
          { name: 'zeta', path: join(root, 'zeta'), recognized: false },
        ],
      },
    });
  });

  it('answers 400 for a path that does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await browseGET(get('browse', { path: missing }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
  });

  it('answers 400 for a path that is a file', async () => {
    const file = join(root, 'tasks.json');
    await writeFile(file, '{}');
    const response = await browseGET(get('browse', { path: file }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `Not a folder: ${file}` });
  });

  it('follows a symlink to a directory but not one to a file', async () => {
    const target = join(root, 'real');
    await mkdir(target);
    await writeFile(join(root, 'file.txt'), 'x');
    await symlink(target, join(root, 'linked'));
    await symlink(join(root, 'file.txt'), join(root, 'filelink'));

    const response = await browseGET(get('browse', { path: root }));

    const body = (await response.json()) as { value: { entries: { name: string }[] } };
    expect(body.value.entries.map((e) => e.name)).toEqual(['linked', 'real']);
  });

  it('answers 400 for a relative path', async () => {
    const response = await browseGET(get('browse', { path: 'imagegen' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Path must be absolute (starting with /), got "imagegen".',
    });
  });
});

describe('GET /api/imagegen/link', () => {
  it('offers an imagegen/ folder beside the running app', async () => {
    const app = join(root, 'app');
    await mkdir(app);
    await mkdir(join(root, 'imagegen'));
    vi.spyOn(process, 'cwd').mockReturnValue(app);

    const response = await linkGET(get('link'));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: [join(root, 'imagegen')] });
  });

  it('offers nothing when no candidate exists', async () => {
    const app = join(root, 'app');
    await mkdir(app);
    vi.spyOn(process, 'cwd').mockReturnValue(app);

    const response = await linkGET(get('link'));

    expect(await response.json()).toEqual({ ok: true, value: [] });
  });
});

describe('POST /api/imagegen/link', () => {
  it('hands back the canonical form of a valid folder', async () => {
    const response = await linkPOST(post('link', { path: `  ${root}  ` }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: { root } });
  });

  it('answers 400 when no path is given', async () => {
    const response = await linkPOST(post('link', {}));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Enter the absolute path to your imagegen/ folder.',
    });
  });

  it('answers 400 when the path is not a string', async () => {
    const response = await linkPOST(post('link', { path: 42 }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Enter the absolute path to your imagegen/ folder.',
    });
  });

  it('answers 400 for a path that does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await linkPOST(post('link', { path: missing }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
  });

  it('answers 400 for a path that is a file', async () => {
    const file = join(root, 'tasks.json');
    await writeFile(file, '{}');
    const response = await linkPOST(post('link', { path: file }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `Not a folder: ${file}` });
  });

  it('answers 400 when the body is not a JSON object', async () => {
    const response = await linkPOST(post('link', 'path'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Expected a JSON object body.' });
  });
});

describe('GET /api/imagegen/round', () => {
  it('returns the round batch.json as text for the client parser', async () => {
    const batch = { schemaVersion: 1, round: 2, generatedAt: '2026-10-18T00:00:00Z', tasks: [] };
    await writeBatch(2, batch);

    const response = await roundGET(get('round', { root, round: '2' }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: JSON.stringify(batch) });
  });

  it('answers 400 when the round has no batch.json', async () => {
    const response = await roundGET(get('round', { root, round: '3' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Could not read rounds/r3/batch.json.' });
  });

  it('answers 400 when no root is linked', async () => {
    const response = await roundGET(get('round', { round: '1' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: UNLINKED_FOLDER_MESSAGE });
  });

  for (const bad of ['abc', '-1', '1.5']) {
    it(`answers 400 for round ${JSON.stringify(bad)}`, async () => {
      const response = await roundGET(get('round', { root, round: bad }));
      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error: `Invalid round: ${bad}` });
    });
  }

  it('answers 400 when the root does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await roundGET(get('round', { root: missing, round: '1' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
  });

  it('passes an unparseable batch.json through as text — validation is the client parser’s job', async () => {
    await writeBatch(1, '{ not json');
    const response = await roundGET(get('round', { root, round: '1' }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: '{ not json' });
  });

  it('answers 400 for a blank round rather than reading r0', async () => {
    await writeBatch(0, { tasks: [] });
    const response = await roundGET(get('round', { root, round: '' }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'Invalid round: ' });
  });
});

describe('GET /api/imagegen/rounds', () => {
  it('lists rounds with a batch.json ascending, with their summaries', async () => {
    await writeBatch(10, { generatedAt: '2026-10-10T00:00:00Z', tasks: [{ images: ['a.png', 'b.png'] }] });
    await writeBatch(2, {
      generatedAt: '2026-10-02T00:00:00Z',
      tasks: [{ images: ['a.png'] }, { images: ['b.png', 'c.png'] }],
    });
    // Skipped: no batch.json, and not a round folder at all.
    await mkdir(join(root, 'rounds', 'r3'), { recursive: true });
    await mkdir(join(root, 'rounds', 'scratch'), { recursive: true });

    const response = await roundsGET(get('rounds', { root }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      value: [
        { round: 2, generatedAt: '2026-10-02T00:00:00Z', taskCount: 2, imageCount: 3 },
        { round: 10, generatedAt: '2026-10-10T00:00:00Z', taskCount: 1, imageCount: 2 },
      ],
    });
  });

  it('lists an empty array when the root has no rounds/ folder', async () => {
    const response = await roundsGET(get('rounds', { root }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: [] });
  });

  it('answers 400 when no root is linked', async () => {
    const response = await roundsGET(get('rounds'));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: UNLINKED_FOLDER_MESSAGE });
  });

  it('lists a round whose batch.json is corrupt or sparse as an empty summary instead of failing', async () => {
    await writeBatch(1, '{ not json');
    await writeBatch(2, { tasks: [{}] });

    const response = await roundsGET(get('rounds', { root }));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      value: [
        { round: 1, generatedAt: '', taskCount: 0, imageCount: 0 },
        { round: 2, generatedAt: '', taskCount: 1, imageCount: 0 },
      ],
    });
  });

  it('answers 400 when the root does not exist', async () => {
    const missing = join(root, 'nope');
    const response = await roundsGET(get('rounds', { root: missing }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `No such folder: ${missing}` });
  });

  it('answers 400 when the root is a file', async () => {
    const file = join(root, 'tasks.json');
    await writeFile(file, '{}');
    const response = await roundsGET(get('rounds', { root: file }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: `Not a folder: ${file}` });
  });
});
