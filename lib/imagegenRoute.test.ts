/**
 * imagegenRoute tests (TEST-004.2)
 *
 * This module is the reason six route files cannot each forget to call the
 * guard, and the only place a `Result` becomes an HTTP status — both claims
 * were until now asserted nowhere. The suite pins the translation layer, not
 * the decisions underneath it: `guardImagegenRequest` and `resolveRoot` are
 * exercised as real collaborators (their own suites own their behaviour), so
 * what is asserted here is that a refusal becomes a 403 carrying its reason,
 * and that a failed `Result` becomes a 400 carrying its message.
 *
 * Two fixture shapes are inherited rather than invented, both for reasons
 * recorded in BI-045:
 *
 * - Requests are request-shaped literals with a bare `Headers`. The `Request`
 *   constructor silently drops `Host` and every `Sec-*` name (forbidden header
 *   names), so a fixture built with `new Request` would assert the guard's
 *   behaviour on headers it never received.
 * - `rootFrom` runs against a real `mkdtemp` directory canonicalized through
 *   `realpath` up front: `resolveRoot` returns `realpath` output, and on macOS
 *   `/var` is a symlink to `/private/var`, so a raw temp path never matches.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtemp, realpath, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import {
  filenameFrom,
  jsonBody,
  refuseUnguarded,
  resultResponse,
  rootFrom,
  roundFrom,
} from './imagegenRoute';

/** A request-shaped literal — see the header for why this is not `new Request`. */
function req(headers: Record<string, string>, method = 'GET', host = 'localhost:3003'): Request {
  return {
    method,
    url: `http://${host}/api/imagegen/rounds`,
    headers: new Headers(headers),
  } as unknown as Request;
}

/** A request whose `json()` resolves to a parsed body, or rejects like a bad parse. */
function bodyReq(json: () => Promise<unknown>): Request {
  return { json } as unknown as Request;
}

describe('refuseUnguarded', () => {
  it('returns null for a request the guard allows', () => {
    expect(refuseUnguarded(req({ 'sec-fetch-site': 'same-origin' }))).toBeNull();
  });

  it('turns a refusal into a 403 carrying the guard reason', async () => {
    const response = refuseUnguarded(req({ origin: 'https://evil.example' }, 'POST'));
    expect(response).not.toBeNull();
    expect(response!.status).toBe(403);
    expect(await response!.json()).toEqual({
      ok: false,
      error: 'Cross-origin requests are not allowed.',
    });
  });

  it('refuses a non-loopback host with the localhost-only reason', async () => {
    const response = refuseUnguarded(
      req({ 'sec-fetch-site': 'same-origin' }, 'GET', 'evil.example'),
    );
    expect(response!.status).toBe(403);
    const body = (await response!.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(body.error).toMatch(/localhost only/);
  });

  it('refuses a mutation carrying no same-origin evidence', async () => {
    const response = refuseUnguarded(req({}, 'POST'));
    expect(response!.status).toBe(403);
  });
});

describe('resultResponse', () => {
  it('serializes an ok Result at 200', async () => {
    const response = resultResponse({ ok: true, value: { rounds: [1, 2] } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: { rounds: [1, 2] } });
  });

  it('serializes a failure at 400 with its message', async () => {
    const response = resultResponse({ ok: false, error: 'No such round: 7' });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ ok: false, error: 'No such round: 7' });
  });

  it('preserves a falsy ok value rather than treating it as a failure', async () => {
    const response = resultResponse({ ok: true, value: null });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, value: null });
  });
});

describe('rootFrom', () => {
  let workspace: string;

  beforeEach(async () => {
    workspace = await realpath(await mkdtemp(join(tmpdir(), 'blastimage-')));
  });

  afterEach(async () => {
    await rm(workspace, { recursive: true, force: true });
  });

  it('resolves a real directory to its canonical path', async () => {
    const result = await rootFrom(workspace);
    expect(result).toEqual({ ok: true, value: workspace });
  });

  it('reports the unlinked-folder caller error for null, undefined, and empty string', async () => {
    for (const raw of [null, undefined, '']) {
      const result = await rootFrom(raw);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/Link your imagegen folder first/);
    }
  });

  it('delegates a path that is not a directory to resolveRoot', async () => {
    const file = join(workspace, 'tasks.json');
    await writeFile(file, '{}', 'utf8');
    const result = await rootFrom(file);
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/Not a folder/);
  });

  it('delegates a missing path to resolveRoot', async () => {
    const result = await rootFrom(join(workspace, 'nope'));
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.error).toMatch(/No such folder/);
  });
});

describe('jsonBody', () => {
  const BAD = 'Expected a JSON object body.';

  it('returns the parsed object for a JSON object body', async () => {
    const result = await jsonBody(bodyReq(async () => ({ root: 'a/root', round: 2 })));
    expect(result).toEqual({ ok: true, value: { root: 'a/root', round: 2 } });
  });

  it('accepts an empty object', async () => {
    expect(await jsonBody(bodyReq(async () => ({})))).toEqual({ ok: true, value: {} });
  });

  it('rejects malformed JSON instead of throwing', async () => {
    const result = await jsonBody(
      bodyReq(() => Promise.reject(new SyntaxError('Unexpected end of JSON input'))),
    );
    expect(result).toEqual({ ok: false, error: BAD });
  });

  it('rejects JSON null and scalar bodies', async () => {
    for (const parsed of [null, 42, 'a string', true]) {
      expect(await jsonBody(bodyReq(async () => parsed))).toEqual({ ok: false, error: BAD });
    }
  });

  // An array is `typeof 'object'` and non-null, so it passes the guard as
  // written. Pinned as-is: every caller reads named keys off the result, which
  // an array simply does not have, so this is a shape the routes tolerate
  // rather than one they act on.
  it('lets an array through as an object body', async () => {
    const result = await jsonBody(bodyReq(async () => [1, 2]));
    expect(result.ok).toBe(true);
  });
});

describe('roundFrom', () => {
  it('accepts a numeric string, as a query parameter arrives', () => {
    expect(roundFrom('3')).toEqual({ ok: true, value: 3 });
  });

  it('accepts a number, as a JSON body arrives', () => {
    expect(roundFrom(7)).toEqual({ ok: true, value: 7 });
  });

  // The guard is `n < 0`, so round 0 is accepted. Left as-is — round
  // numbering starts at 1 in practice and nothing writes r0 any more, but
  // tightening to `n < 1` is a behaviour change no failure here proves.
  it('accepts round 0', () => {
    expect(roundFrom('0')).toEqual({ ok: true, value: 0 });
  });

  // `Number('')` is 0, so a blank round used to resolve to r0 — and on the
  // POST path, create `rounds/r0/selection.json` in the operator's repo.
  // Fixed in this task; pinned here so it cannot silently come back.
  it('rejects a blank or whitespace-only round rather than coercing it to 0', () => {
    for (const raw of ['', '   ', '\n']) {
      expect(roundFrom(raw).ok).toBe(false);
    }
  });

  it('rejects negatives, non-integers, and unparseable strings', () => {
    for (const raw of ['-1', -1, '2.5', 2.5, 'abc', '']) {
      const result = roundFrom(raw);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toMatch(/^Invalid round: /);
    }
  });

  it('rejects non-string non-number inputs', () => {
    for (const raw of [null, undefined, {}, [], true]) {
      expect(roundFrom(raw).ok).toBe(false);
    }
  });

  it('names the offending value in the error', () => {
    const result = roundFrom('abc');
    expect(result.ok === false && result.error).toBe('Invalid round: abc');
  });
});

describe('filenameFrom', () => {
  it('accepts a plain filename', () => {
    expect(filenameFrom('001.png')).toEqual({ ok: true, value: '001.png' });
  });

  it('rejects missing, empty, and whitespace-only names', () => {
    for (const raw of [null, undefined, '', '   ', 42]) {
      const result = filenameFrom(raw);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toBe('Missing filename.');
    }
  });

  it('rejects any path separator, forward or backward', () => {
    for (const raw of ['../secrets.env', 'sub/001.png', '/rooted.png', 'sub\\001.png']) {
      const result = filenameFrom(raw);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.error).toBe(`Filename must not contain a path: ${raw}`);
    }
  });

  // Trimming decides only whether the name is empty; the value is returned
  // verbatim, so a padded name stays padded for the caller that joins it.
  it('returns the name unmodified rather than trimmed', () => {
    expect(filenameFrom(' 001.png ')).toEqual({ ok: true, value: ' 001.png ' });
  });
});
