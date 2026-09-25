/**
 * `POST /api/imagegen/selection` body validation (BI-062)
 *
 * Every write reads `selection.json` first, so an entry the reader rejects,
 * once persisted, fails every later write to that round. The route must refuse
 * such a body before it reaches disk. The handler is driven for real against a
 * temp root, so "writes nothing" is asserted on the filesystem, not on a mock.
 *
 * Lives in `lib/` because the vitest glob excludes `app/` (see
 * `lib/imagegenRouteGuard.test.ts`). The request is a request-shaped literal:
 * the `Request` constructor drops `Host` and `Sec-*` headers, which the guard
 * reads.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { access, mkdtemp, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { POST } from '@/app/api/imagegen/selection/route';

let root: string;

beforeEach(async () => {
  root = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-selection-')));
});

afterEach(async () => {
  await rm(root, { recursive: true, force: true });
});

/** A same-origin localhost POST whose `json()` resolves to `body`. */
function post(body: Record<string, unknown>): Request {
  return {
    method: 'POST',
    url: 'http://localhost:3003/api/imagegen/selection',
    headers: new Headers({ host: 'localhost:3003', 'sec-fetch-site': 'same-origin' }),
    json: async () => ({ root, round: 1, selectedAt: '2026-09-25T00:00:00.000Z', ...body }),
  } as unknown as Request;
}

async function selectionExists(): Promise<boolean> {
  try {
    await access(join(root, 'rounds/r1/selection.json'));
    return true;
  } catch {
    return false;
  }
}

describe('POST /api/imagegen/selection', () => {
  it('writes a well-formed body, normalized by the shared parser', async () => {
    const response = await POST(post({ tasks: [{ slug: ' hero ', decision: 'approve', keeper: 'hero-01.png' }] }));

    expect(response.status).toBe(200);
    const onDisk = JSON.parse(await readFile(join(root, 'rounds/r1/selection.json'), 'utf8')) as unknown;
    expect(onDisk).toMatchObject({ tasks: [{ slug: 'hero', decision: 'approve', keeper: 'hero-01.png' }] });
  });

  const malformed: [string, Record<string, unknown>, string][] = [
    ['tasks is not an array', { tasks: 'hero' }, 'Expected a tasks array.'],
    ['an entry is not an object', { tasks: [null] }, 'Task 1 must be an object.'],
    [
      'an entry has no slug',
      { tasks: [{ slug: 'ok', decision: 'skip' }, { decision: 'skip' }] },
      'Task 2 needs a non-empty "slug".',
    ],
    [
      'an entry has an unknown decision',
      { tasks: [{ slug: 'hero', decision: 'delete' }] },
      'Task 1 "decision" must be iterate, approve, or skip.',
    ],
    ['selectedAt is missing', { tasks: [], selectedAt: undefined }, 'Expected a selectedAt timestamp.'],
    ['selectedAt is blank', { tasks: [], selectedAt: '   ' }, 'Expected a selectedAt timestamp.'],
  ];

  for (const [name, body, error] of malformed) {
    it(`answers 400 and writes nothing when ${name}`, async () => {
      const response = await POST(post(body));

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ ok: false, error });
      expect(await selectionExists()).toBe(false);
    });
  }
});
