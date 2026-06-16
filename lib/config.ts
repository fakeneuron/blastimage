/**
 * blastimage — runtime mode + backend config (BI-022.3)
 *
 * blastimage ships two modes that share the whole domain core and differ only
 * in persistence + auth:
 *
 * - **local** (default) — frontend-only, localStorage, no accounts. The
 *   submodule-adoptable mode; unchanged by the hosted work.
 * - **hosted** — a personal, cloud-persistent instance backed by Supabase
 *   (auth + Postgres + RLS). Opt-in via `NEXT_PUBLIC_BLASTIMAGE_MODE=hosted`.
 *
 * The persistence seam (`lib/persistence.ts`) reads {@link isHostedMode} once
 * at module load to resolve the active adapter, so a build with the hosted env
 * unset behaves byte-identically to the pre-hosted app.
 */

/** True when the app is configured for the Supabase-backed hosted mode. */
export function isHostedMode(): boolean {
  return process.env.NEXT_PUBLIC_BLASTIMAGE_MODE === 'hosted';
}

/**
 * The Supabase connection config for hosted mode. Throws if the env is
 * incomplete — only ever called when {@link isHostedMode} is true, so a misconfigured
 * hosted build fails loudly rather than silently falling back to localStorage.
 */
export function supabaseConfig(): { url: string; anonKey: string } {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      'Hosted mode requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.',
    );
  }
  return { url, anonKey };
}
