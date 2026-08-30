/// <reference types="vite/client" />

/**
 * imagegen route-surface guard coverage (TEST-004.3)
 *
 * `lib/imagegenRoute.ts` exists so the guard "cannot be forgotten in one of
 * them" (BI-045), and TEST-004.2 pinned that helper — but nothing asserted the
 * other half of the claim: that every route actually calls it. This suite is
 * that assertion, and it is deliberately *derived from the filesystem* rather
 * than written against a list of known routes.
 *
 * Three shape decisions, each of which a reader is likely to want to undo:
 *
 * - **The subjects are discovered, not imported by name.** A hand-written table
 *   of the handlers that exist today passes for the next route it has never
 *   heard of — which
 *   is the only case anyone is worried about. `import.meta.glob` re-resolves the
 *   tree on every run, so a route added tomorrow is covered without editing this
 *   file. That is the whole point of the task.
 * - **The glob is cross-checked against `node:fs`.** A glob is resolved by Vite
 *   at transform time; a moved directory or a mistyped pattern would return
 *   fewer entries, and a table-driven suite over an empty table passes silently.
 *   The walk below turns that into a red test.
 * - **The file lives in `lib/`, beside the helper whose invocation it pins, not
 *   in `app/` beside the routes.** `vitest.config.ts`'s include glob is
 *   `{lib,components}/**` (TEST-001.2), so a colocated test would not be
 *   discovered at all without widening it. Since the subjects come from the
 *   filesystem, this file's own location changes nothing about what it covers.
 *
 * The request fixture is the request-shaped literal the sibling suites use: the
 * `Request` constructor silently drops `Host` and every `Sec-*` name (forbidden
 * header names), so a fixture built with `new Request` would exercise the guard
 * on headers it never received.
 */

import { readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

/** Where the route surface lives, relative to the repo root. */
const ROUTE_DIR = 'app/api/imagegen';

/**
 * The verbs Next treats as route handlers. Anything else a route file exports
 * (`dynamic`, `runtime`, a local helper) is configuration, not an entry point.
 */
const HTTP_VERBS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

type Handler = (req: Request) => Response | Promise<Response>;

const routeModules = import.meta.glob<Record<string, unknown>>(
  '../app/api/imagegen/**/route.ts',
);

/** Glob keys are `../app/...`; normalize to repo-relative for readable names. */
function repoRelative(globKey: string): string {
  return globKey.replace(/^\.\.\//, '');
}

/** Every `route.ts` under the route tree, found by walking it rather than globbing. */
async function walkForRoutes(dir: string): Promise<string[]> {
  const found: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) found.push(...(await walkForRoutes(path)));
    else if (entry.name === 'route.ts') found.push(path);
  }
  return found.sort();
}

/**
 * A cross-origin request addressed to a loopback host — the DNS-rebinding /
 * foreign-tab shape the guard exists to refuse. `json()` rejects on purpose: a
 * handler that reads the body before guarding fails instead of quietly passing.
 */
function crossOriginRequest(method: string, path: string): Request {
  return {
    method,
    url: `http://localhost:3003/${path}`,
    headers: new Headers({ origin: 'https://evil.example' }),
    json: () => Promise.reject(new Error('handler read the body before guarding')),
  } as unknown as Request;
}

/** The `(route, verb)` pairs under test, built once at module scope. */
const handlers: Array<{ route: string; verb: string; handler: Handler }> = [];

for (const [globKey, load] of Object.entries(routeModules)) {
  const route = repoRelative(globKey);
  const mod = await load();
  for (const verb of HTTP_VERBS) {
    const exported = mod[verb];
    if (typeof exported === 'function') {
      handlers.push({ route, verb, handler: exported as Handler });
    }
  }
}

describe('imagegen route discovery', () => {
  it('sees every route.ts that exists on disk', async () => {
    const onDisk = await walkForRoutes(ROUTE_DIR);
    const globbed = Object.keys(routeModules).map(repoRelative).sort();
    expect(globbed).toEqual(onDisk);
    expect(onDisk.length).toBeGreaterThan(0);
  });

  it.each(Object.keys(routeModules).map(repoRelative))(
    '%s exports at least one HTTP verb handler',
    (route) => {
      expect(handlers.filter((entry) => entry.route === route)).not.toHaveLength(0);
    },
  );
});

describe('every imagegen route handler refuses a cross-origin request', () => {
  it.each(handlers)('$verb $route', async ({ verb, route, handler }) => {
    const response = await handler(crossOriginRequest(verb, route));

    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      ok: false,
      error: 'Cross-origin requests are not allowed.',
    });
  });
});
