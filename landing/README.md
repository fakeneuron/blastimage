# blastimage landing

Producer landing for blastimage at `https://blastimage.com`. Static Astro site, deployed as a Cloudflare Worker at the apex. Built from natabula's `templates/landing/` skeleton (DEPLOY-011). Copy, host, and review rules live in natabula `docs/DESIGN-STANDARDS.md` §"Landing surfaces".

## What this page may say

- The page renders the producer's portable facts, read from `../brand/` at build time: `brand/BRAND.md` `tagline`, `one_liner`, and `description`, plus `display_name` and `public_metadata.source_url` from `brand/assets.json`. The mark, favicon, and promo are imported from the brand kit files. Nothing is copied into this directory, so editing the brand file updates the page on the next build.
- Keep one copy source. Do not add a landing copy file or a landing schema.
- Follow the voice notes in `brand/BRAND.md`: it is a local, single-operator tool. Never present it as a hosted service.
- Leave consumer editorial, private paths, and another product's campaign out of this directory.
- The page is public and ungated, and it ships as a `prelaunch` surface: a crawlable `<meta name="robots" content="noindex">` and no `rel=canonical`. Do not add a robots.txt `Disallow`, which would hide the noindex from crawlers. Policy: natabula `docs/STACK-TENDENCIES.md` §"Public-site SEO".

## Hosts

- The apex `blastimage.com` is canonical. `site:` in `astro.config.mjs` is `https://blastimage.com`, never the `www` host.
- `www.blastimage.com` is a Cloudflare redirect to the apex, not a second Worker and not a second build.
- blastimage itself is a local app with no hosted surface, so there is no `app.` subdomain.

## Public submodule

blastimage is adopted as a git submodule, so every adopter checks out this directory. Nothing in the app imports it. The root npm gates (`npm run lint` / `typecheck` / `test`, which CI runs) skip it; the `just` verbs `setup` / `lint` / `build` include it, and CI's `landing` job runs `npm run check` and `npm run build` here. Keep the page about blastimage only. Adopter landings live in the adopter repositories.

## Review

Re-read this page when `release_stage` in `brand/assets.json` changes, when marketing readiness moves to `review-ready`, `ready`, or `stale`, or when a portable fact the page renders changes. Record that occasion as a review trigger (`templates/brand/examples/landing-review-trigger.json` in the natabula templates). The trigger does not publish the site, approve an asset, or add a copy file. The edge tables live in natabula `docs/DESIGN-STANDARDS.md` §"Attended transitions and review triggers".

## Dev

From the repo root: `just landing` (dev server on 4003). `just setup`, `just lint`, and `just build` also cover this directory. Or from here:

```bash
npm install
npm run dev        # http://localhost:4003 (strictPort)
npm run build      # outputs to dist/
npm run preview    # preview the build locally
npm run check      # astro check
```

## Deploy

`npm run build` then `npx wrangler deploy`. `wrangler.toml` points `[assets]` at `dist/`. No gate: a landing is a public page by design. Run locally with `npx wrangler dev`.

## Search intent

Declare this surface in a producer `seo/sites.json` (natabula `templates/seo/README.md`) before launch. To launch it as an indexable site, review the declaration first (`intent: indexable`), then remove the robots meta, add `<link rel="canonical" href={pageURL} />`, and add the sitemap and robots.txt the indexable checklist expects.

## Operator steps (done 2026-10-19)

- [x] Confirm `blastimage.com` is registered and its zone is on Cloudflare
- [x] `npm run build && npx wrangler deploy` (creates the `blastimage-landing` Worker)
- [x] Add `blastimage.com` as a custom domain on the `blastimage-landing` Worker (declared as a `[[routes]]` entry in `wrangler.toml`; the next `npx wrangler deploy` applies it)
- [x] Add a proxied `www` DNS record (e.g. `AAAA www 100::`) and a `www.blastimage.com` → `https://blastimage.com` redirect rule in Cloudflare (301, keep path and query) — applied with natabula `scripts/cf-www-redirect.sh`; Always Use HTTPS turned on for the zone
- [x] Optionally declare `public_metadata.homepage_url` in `brand/assets.json` once the apex serves
