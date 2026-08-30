/**
 * blastimage — request guard for the imagegen API routes (BI-045)
 *
 * These routes read and write real files in the operator's repo, so they are
 * deliberately narrow: only this app's own pages, loaded from localhost, may
 * call them. Two independent checks, neither of which is a substitute for the
 * `realpath` confinement in `lib/imagegenServerFs.ts`:
 *
 * 1. **Host** — the request must be addressed to a loopback host. Any other
 *    host means the browser resolved some public name to 127.0.0.1, which is
 *    the shape of a DNS-rebinding attempt against a local dev server. Read from
 *    the `Host` header, falling back to `req.url` — Next builds that URL from
 *    the same header, and it is the only one of the two a synthetic `Request`
 *    can carry, since `Host` is a forbidden header name.
 * 2. **Origin** — cross-origin callers are refused. Mutating verbs demand a
 *    *positive* same-origin signal, because a form or `fetch(..., {mode:
 *    'no-cors'})` from another tab can issue a write it will never see the
 *    response to. Reads settle for the absence of a foreign signal: the
 *    same-origin policy already keeps the bytes away from a cross-origin
 *    reader, and `<img src="/api/imagegen/file?…">` legitimately sends no
 *    `Origin` header at all.
 */

const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

const SAFE_METHODS = new Set(['GET', 'HEAD']);

/** Strips the `:port` suffix from a `Host` header value, IPv6 literals included. */
function hostnameOf(host: string): string {
  if (host.startsWith('[')) {
    const close = host.indexOf(']');
    return close === -1 ? host : host.slice(0, close + 1);
  }
  const colon = host.indexOf(':');
  return colon === -1 ? host : host.slice(0, colon);
}

/**
 * The host this request was addressed to, or `null` when neither the header nor
 * the URL yields one.
 */
function requestHost(req: Request): string | null {
  const header = req.headers.get('host');
  if (header) return header;
  try {
    return new URL(req.url).host || null;
  } catch {
    return null;
  }
}

/**
 * Returns `null` when the request may proceed, or a short refusal reason. The
 * caller turns that into a 403 — the reason is deliberately generic, since a
 * caller that trips this check is not one we owe diagnostics to.
 */
export function guardImagegenRequest(req: Request): string | null {
  const host = requestHost(req);
  if (!host || !LOOPBACK_HOSTNAMES.has(hostnameOf(host))) {
    return 'The imagegen API is reachable from localhost only.';
  }

  const origin = req.headers.get('origin');
  if (origin) {
    let originHost: string;
    try {
      originHost = new URL(origin).host;
    } catch {
      return 'Cross-origin requests are not allowed.';
    }
    if (originHost !== host) return 'Cross-origin requests are not allowed.';
    return null;
  }

  // No Origin header: same-site metadata decides, and mutations need it to be
  // present and affirmative.
  const site = req.headers.get('sec-fetch-site');
  if (site && site !== 'same-origin' && site !== 'none') {
    return 'Cross-origin requests are not allowed.';
  }
  if (!SAFE_METHODS.has(req.method) && !site) {
    return 'Cross-origin requests are not allowed.';
  }
  return null;
}
