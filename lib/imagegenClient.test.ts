/**
 * blastimage — `lib/imagegenClient.ts` coverage (TEST-004.4)
 *
 * `fetch` is stubbed entirely (no real `Request` is ever constructed), so the
 * `Host`/`Sec-*` forbidden-header trap the server-side suites (`imagegenRoute
 * .test.ts`, `imagegenRouteGuard.test.ts`) work around does not apply here —
 * the mock captures `(input, init)` and asserts against the parsed `URL` /
 * `init.body` directly, following `lib/imageBlob.test.ts`'s existing idiom.
 *
 * `envelope()`/`getJson()`/`sendJson()` are private and unexported; their
 * behavior (success/failure/non-JSON-body/network-throw unwrapping, and
 * GET-vs-POST/DELETE request construction) is exercised through the public
 * exports that call them, not re-asserted per helper.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  approvedConflict,
  browseDirectory,
  clearStoredRoot,
  imagegenFileUrl,
  linkImagegenRoot,
  linkRoot,
  listRounds,
  loadStoredRoot,
  promoteApproved,
  readRoundBatch,
  removeApproved,
  suggestedRoots,
  writeRoundSelection,
} from './imagegenClient';
import { ROUND_BATCH_SCHEMA_VERSION } from './roundBatch';

const ROOT = '/repo/imagegen';

function stubFetch(handler: (url: URL, init: RequestInit | undefined) => unknown) {
  const fetchMock = vi.fn(async (input: string, init?: RequestInit) => {
    const url = new URL(input, 'http://localhost:3003');
    return handler(url, init);
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

function jsonResponse(status: number, body: unknown) {
  return { status, json: async () => body };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('envelope() unwrapping (via suggestedRoots)', () => {
  it('unwraps a successful envelope', async () => {
    stubFetch(() => jsonResponse(200, { ok: true, value: ['/a', '/b'] }));
    expect(await suggestedRoots()).toEqual(['/a', '/b']);
  });

  it('collapses a failed envelope with an explicit error to []', async () => {
    stubFetch(() => jsonResponse(400, { ok: false, error: 'no folders found' }));
    expect(await suggestedRoots()).toEqual([]);
  });

  it('falls back to a status-based message when the envelope carries no error', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(500, { ok: false }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await linkRoot('/x');
    expect(result).toEqual({ ok: false, error: 'imagegen request failed (500).' });
  });

  it('treats a non-JSON body as a failure', async () => {
    const fetchMock = vi.fn(async () => ({
      status: 502,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    }));
    vi.stubGlobal('fetch', fetchMock);
    const result = await linkRoot('/x');
    expect(result).toEqual({ ok: false, error: 'imagegen request failed (502).' });
  });

  it('surfaces a network-level throw as "Could not reach the blastimage server."', async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError('fetch failed');
    });
    vi.stubGlobal('fetch', fetchMock);
    expect(await linkRoot('/x')).toEqual({
      ok: false,
      error: 'Could not reach the blastimage server.',
    });
  });
});

describe('suggestedRoots', () => {
  it('GETs /api/imagegen/link with no params', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: [] }));
    await suggestedRoots();
    const url = new URL(fetchMock.mock.calls[0]![0] as string, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/link');
    expect([...url.searchParams.keys()]).toEqual([]);
  });
});

describe('browseDirectory', () => {
  it('omits `path` when absent', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: {} }));
    await browseDirectory();
    const url = new URL(fetchMock.mock.calls[0]![0] as string, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/browse');
    expect(url.searchParams.has('path')).toBe(false);
  });

  it('includes `path` when given', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: {} }));
    await browseDirectory('/home/user/projects');
    const url = new URL(fetchMock.mock.calls[0]![0] as string, 'http://localhost:3003');
    expect(url.searchParams.get('path')).toBe('/home/user/projects');
  });
});

describe('linkRoot / linkImagegenRoot', () => {
  it('POSTs the candidate path to /api/imagegen/link', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: { root: ROOT, recognized: true } }));
    await linkRoot('/candidate');
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(new URL(input as string, 'http://localhost:3003').pathname).toBe('/api/imagegen/link');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ path: '/candidate' });
  });

  it('linkImagegenRoot returns just the canonical root on success', async () => {
    stubFetch(() => jsonResponse(200, { ok: true, value: { root: ROOT, recognized: false } }));
    expect(await linkImagegenRoot('/candidate')).toEqual({ ok: true, value: ROOT });
  });

  it('linkImagegenRoot forwards a failed link unchanged', async () => {
    stubFetch(() => jsonResponse(400, { ok: false, error: 'No such folder.' }));
    expect(await linkImagegenRoot('/nope')).toEqual({ ok: false, error: 'No such folder.' });
  });
});

describe('listRounds', () => {
  it('GETs /api/imagegen/rounds with root', async () => {
    const summaries = [
      { round: 1, generatedAt: '2026-08-30T00:00:00.000Z', taskCount: 1, imageCount: 2 },
      { round: 2, generatedAt: '2026-08-30T00:00:00.000Z', taskCount: 1, imageCount: 1 },
      { round: 3, generatedAt: '2026-08-30T00:00:00.000Z', taskCount: 2, imageCount: 4 },
    ];
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: summaries }));
    expect(await listRounds(ROOT)).toEqual(summaries);
    const url = new URL(fetchMock.mock.calls[0]![0] as string, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/rounds');
    expect(url.searchParams.get('root')).toBe(ROOT);
  });

  it('collapses a failure to []', async () => {
    stubFetch(() => jsonResponse(400, { ok: false, error: 'bad root' }));
    expect(await listRounds(ROOT)).toEqual([]);
  });
});

describe('readRoundBatch', () => {
  const batchJson = (round: number) =>
    JSON.stringify({
      schemaVersion: ROUND_BATCH_SCHEMA_VERSION,
      round,
      generatedAt: '2026-08-30T00:00:00.000Z',
      tasks: [{ slug: 'hero', name: 'Hero', prompt: 'a hero image', images: ['hero-01.png'] }],
    });

  it('GETs /api/imagegen/round with root + round, and parses a matching batch', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: batchJson(3) }));
    const result = await readRoundBatch(ROOT, 3);
    expect(result).toEqual({ ok: true, value: JSON.parse(batchJson(3)) });
    const url = new URL(fetchMock.mock.calls[0]![0] as string, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/round');
    expect(url.searchParams.get('root')).toBe(ROOT);
    expect(url.searchParams.get('round')).toBe('3');
  });

  it('forwards a failed fetch unchanged', async () => {
    stubFetch(() => jsonResponse(400, { ok: false, error: 'no such round' }));
    expect(await readRoundBatch(ROOT, 3)).toEqual({ ok: false, error: 'no such round' });
  });

  it('forwards a parseRoundBatch failure unchanged', async () => {
    stubFetch(() => jsonResponse(200, { ok: true, value: 'not valid json' }));
    const result = await readRoundBatch(ROOT, 3);
    expect(result.ok).toBe(false);
  });

  it('rejects when batch.json.round disagrees with the requested round', async () => {
    stubFetch(() => jsonResponse(200, { ok: true, value: batchJson(2) }));
    const result = await readRoundBatch(ROOT, 3);
    expect(result).toEqual({
      ok: false,
      error: 'batch.json says round 2 but folder is r3.',
    });
  });
});

describe('writeRoundSelection', () => {
  it('POSTs root, round, tasks, and selectedAt to /api/imagegen/selection', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: undefined }));
    const tasks = [{ slug: 'hero', decision: 'approve' as const, keeper: 'hero-01.png' }];
    await writeRoundSelection(ROOT, 3, tasks, '2026-08-30T00:00:00.000Z');
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(new URL(input as string, 'http://localhost:3003').pathname).toBe('/api/imagegen/selection');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({
      root: ROOT,
      round: 3,
      tasks,
      selectedAt: '2026-08-30T00:00:00.000Z',
    });
  });
});

describe('approvedConflict', () => {
  it('GETs /api/imagegen/approved with root, round, filename', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: true }));
    expect(await approvedConflict(ROOT, 3, 'hero-01.png')).toEqual({ ok: true, value: true });
    const url = new URL(fetchMock.mock.calls[0]![0] as string, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/approved');
    expect(url.searchParams.get('root')).toBe(ROOT);
    expect(url.searchParams.get('round')).toBe('3');
    expect(url.searchParams.get('filename')).toBe('hero-01.png');
  });
});

describe('promoteApproved', () => {
  it('POSTs root, round, filename to /api/imagegen/approved', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: undefined }));
    await promoteApproved(ROOT, 3, 'hero-01.png');
    const [input, init] = fetchMock.mock.calls[0]!;
    expect(new URL(input as string, 'http://localhost:3003').pathname).toBe('/api/imagegen/approved');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body as string)).toEqual({ root: ROOT, round: 3, filename: 'hero-01.png' });
  });
});

describe('removeApproved', () => {
  it('DELETEs /api/imagegen/approved with root + filename as query params', async () => {
    const fetchMock = stubFetch(() => jsonResponse(200, { ok: true, value: undefined }));
    await removeApproved(ROOT, 'hero-01.png');
    const [input, init] = fetchMock.mock.calls[0]!;
    const url = new URL(input as string, 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/approved');
    expect(url.searchParams.get('root')).toBe(ROOT);
    expect(url.searchParams.get('filename')).toBe('hero-01.png');
    expect(init?.method).toBe('DELETE');
  });
});

describe('imagegenFileUrl', () => {
  it('omits `v` when epoch is 0', () => {
    const url = new URL(imagegenFileUrl(ROOT, 'rounds/r3/hero-01.png', 0), 'http://localhost:3003');
    expect(url.pathname).toBe('/api/imagegen/file');
    expect(url.searchParams.get('root')).toBe(ROOT);
    expect(url.searchParams.get('path')).toBe('rounds/r3/hero-01.png');
    expect(url.searchParams.has('v')).toBe(false);
  });

  it('includes `v` when epoch is positive', () => {
    const url = new URL(imagegenFileUrl(ROOT, 'rounds/r3/hero-01.png', 2), 'http://localhost:3003');
    expect(url.searchParams.get('v')).toBe('2');
  });
});

describe('loadStoredRoot / clearStoredRoot', () => {
  const LEGACY_KEY = 'blastimage:imagegen-root';

  beforeEach(() => {
    localStorage.clear();
  });

  it('loadStoredRoot returns null when nothing is stored', () => {
    expect(loadStoredRoot()).toBeNull();
  });

  it('loadStoredRoot reads the legacy app-wide key', () => {
    localStorage.setItem(LEGACY_KEY, ROOT);
    expect(loadStoredRoot()).toBe(ROOT);
  });

  it('clearStoredRoot removes the legacy key', () => {
    localStorage.setItem(LEGACY_KEY, ROOT);
    clearStoredRoot();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });

  it('clearStoredRoot is a no-op when nothing is stored', () => {
    expect(() => clearStoredRoot()).not.toThrow();
    expect(localStorage.getItem(LEGACY_KEY)).toBeNull();
  });
});
