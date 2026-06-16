# blastimage — Hosted-Mode Deploy Runbook

This guide deploys the **hosted mode** of blastimage (BI-EPIC-022): a personal,
cloud-persistent instance backed by Supabase (auth + Postgres/RLS + private image
storage), served as a static site from **Cloudflare Pages**.

Local / submodule mode needs none of this — it runs frontend-only on
localStorage (see [`docs/ADOPT.md`](ADOPT.md)). Hosted mode is additive and opt-in
via `NEXT_PUBLIC_BLASTIMAGE_MODE=hosted`.

> **Generation is not available in hosted mode yet.** blastimage's image
> generation rides the Grok Build sandbox (`globalThis.__grokImagineProvider` +
> the `image_gen` built-in — see [`docs/GROK-AGENT.md`](GROK-AGENT.md)), which
> does not exist in a deployed browser. Generate in **local Grok Build mode**,
> then push sessions to your cloud account with the Sidebar **Project → ↑ Import**
> control. Resolving in-browser hosted generation is tracked as **BI-023**.

---

## Prerequisites

- A **Cloudflare** account (Pages).
- A **Supabase** account + the `supabase` CLI (`supabase --version`).
- **Google** and/or **GitHub** OAuth apps you can create (for production sign-in).
- Node.js ≥ 20 (Next.js 15).

---

## Architecture at a glance

- The app is **fully client-rendered** (no RSC data fetching, no API routes, no
  route handlers), so it ships as a Next **static export** (`output: 'export'`,
  `out/`) — no `@cloudflare/next-on-pages` / edge worker needed.
- Static export is **build-gated** on `BUILD_TARGET=cloudflare` (see
  `next.config.ts`). Without it, `next build` / `next dev` behave exactly as
  before, so local and submodule adopters are unaffected.
- All hosted config is `NEXT_PUBLIC_*` (read in the browser). There are **no
  server secrets in the frontend** — the Supabase anon key is public by design;
  row security is enforced by RLS, and OAuth provider secrets live in the
  Supabase dashboard, never in this repo or the bundle.

---

## 1. Create + provision the Supabase project

1. Create a new project in the [Supabase dashboard](https://supabase.com/dashboard).
   Note its **project ref** (the `xxxx` in `https://xxxx.supabase.co`).
2. From the repo root, link and push the schema (applies both migrations —
   the owner-scoped relational schema + the private `images` storage bucket):

   ```bash
   supabase link --project-ref <your-project-ref>
   supabase db push
   ```

   `supabase/migrations/` holds:
   - `20260616000000_init_hosted_schema.sql` — `sessions` / `ref_images` /
     `tasks` / `iterations` / `generated_images` + `app_settings`, every table
     `owner uuid default auth.uid()` with owner-scoped RLS.
   - `20260616010000_image_storage_buckets.sql` — the private `images` bucket
     + owner-scoped `storage.objects` RLS (`{auth.uid()}/…` path prefix).

3. From **Project Settings → API**, copy the **Project URL** and the **anon
   public** key — you'll set them as Cloudflare env vars in step 3.

> **Note on `supabase/config.toml`:** that file configures the *local* stack
> only (ports, `:3003` auth URLs, env-substituted OAuth secrets). The cloud
> project is configured in the dashboard — the steps below, not config.toml.

---

## 2. Register the production OAuth apps

This is the live external sign-in hop deferred from BI-022.6. The Supabase
**callback URL** is the same for both providers:

```
https://<your-project-ref>.supabase.co/auth/v1/callback
```

**Google** — [Google Cloud Console](https://console.cloud.google.com/) →
*APIs & Services → Credentials → Create OAuth client ID* (Web application):
- Authorized redirect URI: the Supabase callback URL above.
- Copy the **Client ID** + **Client secret**.

**GitHub** — *Settings → Developer settings → OAuth Apps → New OAuth App*:
- Authorization callback URL: the Supabase callback URL above.
- Copy the **Client ID** + generate a **Client secret**.

Then in the **Supabase dashboard → Authentication → Providers**, enable Google
and GitHub and paste each Client ID + secret. (Production secrets live here, not
in `config.toml`.)

---

## 3. Configure + deploy Cloudflare Pages

Create a Pages project (Git integration is simplest; the repo uses a flowtron
submodule, which Pages clones recursively by default).

**Build settings:**

| Setting | Value |
|---|---|
| Build command | `npm run build` |
| Build output directory | `out` |
| Root directory | (repo root) |

**Environment variables** (Production — set in the Pages project settings):

| Variable | Value |
|---|---|
| `BUILD_TARGET` | `cloudflare` |
| `NEXT_PUBLIC_BLASTIMAGE_MODE` | `hosted` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `<anon public key>` |
| `NODE_VERSION` | `20` |

Trigger a deploy. Cloudflare assigns a URL like `https://blastimage.pages.dev`
(or your custom domain).

**Alternative — direct upload (no Git integration):**

```bash
BUILD_TARGET=cloudflare \
NEXT_PUBLIC_BLASTIMAGE_MODE=hosted \
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key> \
  npm run build

npx wrangler pages deploy out --project-name=blastimage
```

---

## 4. Point Supabase auth at the deployed URL

In **Supabase dashboard → Authentication → URL Configuration**, set:

- **Site URL:** `https://<your-cloudflare-domain>`
- **Redirect URLs:** add `https://<your-cloudflare-domain>/**`

The client-only login (`signInWithOAuth`, `lib/auth.ts`) redirects back to
`window.location.origin`, so the deployed origin must be allow-listed here or the
OAuth round-trip will be rejected.

---

## 5. Post-deploy verification

1. Visit the Cloudflare URL → the **login screen** renders (hosted-mode gate).
2. **Sign in with Google** (and/or GitHub) → redirected back, land in the
   workspace with an account email + sign-out control in the Sidebar.
3. **Create a session**, add a task → reload the page → it persists (Supabase
   round-trip; rows are owner-scoped by RLS).
4. **Migrate a local workspace:** in local mode, Sidebar **Project → ↓ Export**;
   in the hosted instance, **Project → ↑ Import** — images re-host to the storage
   bucket automatically on save.
5. Generation is intentionally unavailable in hosted mode (see the note at the
   top; tracked as BI-023).

---

## Troubleshooting

- **Login redirect rejected / loops** — the deployed origin isn't in Supabase's
  Site URL / Redirect URLs (step 4), or the provider's callback URL doesn't match
  `https://<ref>.supabase.co/auth/v1/callback` (step 2).
- **Build fails on Cloudflare** — confirm `BUILD_TARGET=cloudflare` and
  `NODE_VERSION=20` are set; without `BUILD_TARGET` the build won't emit `out/`.
- **App loads but can't reach the backend** — check `NEXT_PUBLIC_SUPABASE_URL` /
  `NEXT_PUBLIC_SUPABASE_ANON_KEY`; a misconfigured hosted build throws loudly
  (`lib/config.ts` `supabaseConfig()`), it does not silently fall back to
  localStorage.
- **Images don't render after import** — confirm `supabase db push` applied the
  buckets migration (the private `images` bucket + its RLS policy must exist).
