/**
 * imagegenGuard tests (BI-045)
 *
 * The routes behind this guard write into the operator's repo, so the cases
 * that must stay refused are pinned individually: a public `Host` (the shape of
 * a DNS-rebinding attempt), a foreign `Origin`, and — the one asymmetry — a
 * mutation carrying no same-origin evidence at all, which is exactly what a
 * drive-by `no-cors` POST from another tab looks like.
 *
 * Requests are built as literals rather than with `new Request`: `Host` and
 * every `Sec-*` name are *forbidden header names*, which the `Request`
 * constructor silently drops — so a fixture built that way would assert the
 * guard's behaviour on headers it never received. A bare `Headers` has no such
 * guard, and the three fields below are the entire surface `guardImagegenRequest`
 * touches.
 */

import { describe, expect, it } from 'vitest';

import { guardImagegenRequest } from './imagegenGuard';

function req(headers: Record<string, string>, method = 'GET', host = 'localhost:3003'): Request {
  return {
    method,
    url: `http://${host}/api/imagegen/rounds`,
    headers: new Headers(headers),
  } as unknown as Request;
}

describe('host check', () => {
  it('allows loopback hosts, with or without a port', () => {
    for (const host of ['localhost:3003', 'localhost', '127.0.0.1:3003', '[::1]:3003']) {
      expect(
        guardImagegenRequest(req({ 'sec-fetch-site': 'same-origin' }, 'GET', host)),
      ).toBeNull();
    }
  });

  it('refuses a public host resolved at 127.0.0.1 (DNS rebinding)', () => {
    const reason = guardImagegenRequest(
      req({ 'sec-fetch-site': 'same-origin' }, 'GET', 'evil.example:3003'),
    );
    expect(reason).toMatch(/localhost only/);
  });

  it('prefers an explicit Host header over the URL when the two disagree', () => {
    const reason = guardImagegenRequest(
      req({ host: 'evil.example', 'sec-fetch-site': 'same-origin' }),
    );
    expect(reason).toMatch(/localhost only/);
  });
});

describe('origin check', () => {
  it('allows an Origin matching the host', () => {
    expect(guardImagegenRequest(req({ origin: 'http://localhost:3003' }))).toBeNull();
  });

  it('refuses an Origin from another port or site', () => {
    for (const origin of ['http://localhost:3000', 'https://evil.example']) {
      expect(guardImagegenRequest(req({ origin }))).toMatch(/Cross-origin/);
    }
  });

  it('refuses an unparseable Origin', () => {
    expect(guardImagegenRequest(req({ origin: 'not a url' }))).toMatch(/Cross-origin/);
  });

  it('refuses a cross-site fetch that sent no Origin', () => {
    expect(guardImagegenRequest(req({ 'sec-fetch-site': 'cross-site' }))).toMatch(/Cross-origin/);
  });
});

describe('reads versus writes without an Origin', () => {
  it('allows a same-origin image load, which sends no Origin header', () => {
    expect(guardImagegenRequest(req({ 'sec-fetch-site': 'same-origin' }))).toBeNull();
  });

  it('allows a direct navigation (Sec-Fetch-Site: none)', () => {
    expect(guardImagegenRequest(req({ 'sec-fetch-site': 'none' }))).toBeNull();
  });

  it('allows a GET with no same-site metadata at all — the response stays same-origin-only', () => {
    expect(guardImagegenRequest(req({}))).toBeNull();
  });

  it('refuses a POST or DELETE with no same-site evidence', () => {
    for (const method of ['POST', 'DELETE']) {
      expect(guardImagegenRequest(req({}, method))).toMatch(/Cross-origin/);
    }
  });

  it('allows a POST that proves it is same-origin', () => {
    expect(guardImagegenRequest(req({ 'sec-fetch-site': 'same-origin' }, 'POST'))).toBeNull();
    expect(guardImagegenRequest(req({ origin: 'http://localhost:3003' }, 'POST'))).toBeNull();
  });
});
