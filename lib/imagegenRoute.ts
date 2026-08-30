/**
 * blastimage — shared plumbing for the imagegen API routes (BI-045)
 *
 * Six route handlers repeat the same three moves: guard the request, resolve
 * the linked root the caller named, and serialize a `Result<T>` to JSON. They
 * live here so a route file is just its own verb and arguments — and so the
 * guard cannot be forgotten in one of them.
 */

import { NextResponse } from 'next/server';

import { guardImagegenRequest } from './imagegenGuard';
import { resolveRoot } from './imagegenServerFs';
import type { Result } from './storage';

/** A 403 when the request must not proceed, else `null`. */
export function refuseUnguarded(req: Request): NextResponse | null {
  const reason = guardImagegenRequest(req);
  return reason ? NextResponse.json({ ok: false, error: reason }, { status: 403 }) : null;
}

/** Serializes a `Result<T>`: `ok` at 200, a failure at 400 with its message. */
export function resultResponse<T>(result: Result<T>): NextResponse {
  return result.ok
    ? NextResponse.json({ ok: true, value: result.value })
    : NextResponse.json({ ok: false, error: result.error }, { status: 400 });
}

/**
 * Resolves the `root` a request named — query string for reads, body for
 * writes — to a canonical directory path. Absent means the browser never
 * linked a folder, which is a caller error rather than a server one.
 */
export async function rootFrom(raw: string | null | undefined): Promise<Result<string>> {
  if (!raw) return { ok: false, error: 'Link your imagegen folder first (🔗 in the sidebar).' };
  return resolveRoot(raw);
}

/** Parses a JSON body, returning a `Result` instead of throwing on bad input. */
export async function jsonBody(req: Request): Promise<Result<Record<string, unknown>>> {
  try {
    const parsed: unknown = await req.json();
    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, error: 'Expected a JSON object body.' };
    }
    return { ok: true, value: parsed as Record<string, unknown> };
  } catch {
    return { ok: false, error: 'Expected a JSON object body.' };
  }
}

/**
 * Reads a non-negative integer round number from a raw query/body value.
 * Blank strings are rejected rather than coerced: `Number('')` is `0`, so
 * `?round=` or a `{round: ''}` body would otherwise resolve to a real round
 * directory — and on the write path, create one.
 */
export function roundFrom(raw: unknown): Result<number> {
  const n =
    typeof raw === 'string'
      ? raw.trim() === ''
        ? NaN
        : Number(raw)
      : typeof raw === 'number'
        ? raw
        : NaN;
  if (!Number.isInteger(n) || n < 0) return { ok: false, error: `Invalid round: ${String(raw)}` };
  return { ok: true, value: n };
}

/** Reads a non-empty filename, rejecting path separators outright. */
export function filenameFrom(raw: unknown): Result<string> {
  if (typeof raw !== 'string' || !raw.trim()) return { ok: false, error: 'Missing filename.' };
  if (raw.includes('/') || raw.includes('\\')) {
    return { ok: false, error: `Filename must not contain a path: ${raw}` };
  }
  return { ok: true, value: raw };
}
