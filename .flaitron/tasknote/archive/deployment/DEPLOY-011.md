---
title: landing-page
status: completed
tags: []
created: 2026-10-17
due:
related-tasks: [CORE-012]
touches:
  - landing/**
  - justfile
  - eslint.config.mjs
  - tsconfig.json
  - README.md
  - .flaitron/tasknote/README.md
  - AGENTS.md
  - .flaitron/PLAN.md
  - ~/Code/natabula/docs/PORT-REGISTRY.md
  - ~/Code/natabula/docs/STACK-TENDENCIES.md
---

# DEPLOY-011 | landing-page

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[CORE-012]]

## 🎯 Goal

Ship a prelaunch (noindex) producer landing page for blastimage.com, built from natabula's `templates/landing/` Astro template as a Cloudflare Worker with apex canonical and `www`→apex redirect, with copy from `brand/BRAND.md`, placed so adopters checking out blastimage as a submodule are not burdened by it.

## ✅ Acceptance

- [x] Landing builds to static output — `npm --prefix landing run build` → exit 0, `test -f landing/dist/index.html`
- [x] Prelaunch exclusion: crawlable noindex, no canonical, no robots.txt Disallow — `grep -q '<meta name="robots" content="noindex"' landing/dist/index.html && ! grep -q 'rel="canonical"' landing/dist/index.html && ! test -f landing/dist/robots.txt`
- [x] Copy is read from `brand/BRAND.md` at build time, not restated — `grep -qF 'Blast out batches. Keep the best.' landing/dist/index.html && grep -qF 'A local app for generating' landing/dist/index.html && ! grep -qF 'Keep the best' landing/src/pages/index.astro`
- [x] Apex is canonical origin — `grep -q "site: 'https://blastimage.com'" landing/astro.config.mjs && grep -q 'og:url" content="https://blastimage.com/"' landing/dist/index.html`
- [x] Logo, favicon, promo (hero + og:image) and GitHub source link render — `grep -q 'rel="icon"' landing/dist/index.html && grep -q 'og:image' landing/dist/index.html && grep -qF 'https://github.com/fakeneuron/blastimage' landing/dist/index.html`
- [x] Astro check clean — `npm --prefix landing run check` → exit 0
- [x] Root app gates unaffected with `landing/node_modules`, `dist/`, `.astro/` present — `npm run typecheck && npm run lint && npm test` → exit 0
- [x] justfile keeps the root app primary: `just lint` runs root + landing; `dev` still starts Next — `just lint` → exit 0 with both `› root` and `› landing` lines; `just --show dev | grep -q 'npm run dev'` with root first
- [x] Dev port 4003 registered — `grep -q 'blastimage.*4003' ~/Code/natabula/docs/PORT-REGISTRY.md`
- [x] Deploy / custom domain / `www`→apex redirect documented as operator steps — `grep -q 'www' landing/README.md && grep -q 'wrangler deploy' landing/README.md`
- [x] Personal-config audit follow-up filed (operator request) — `grep -q 'personal' .flaitron/PLAN.md`
- [x] Page reads well in the browser — `👁️` taste/layout, no command decides it

## 🧩 Subtasks

- [x] Copy natabula `templates/landing/` into `landing/`; fill PROJECT, `site:`, port 4003, Worker name
- [x] Add `@astrojs/check` + `typescript` devDeps, `tsconfig.json`, `.gitignore` (`.astro/`); `npm install` → lockfile
- [x] `index.astro`: import BRAND.md frontmatter + `assets.json` `display_name`; import logo/favicon/promo from `../brand/` (no copied binaries); GitHub link; noindex kept
- [x] Fence root tooling: eslint `ignores` + tsconfig `exclude` for `landing/` (keep tsconfig compact one-line style)
- [x] justfile: hand-author `dev` / `lint` / `build` so the root app stays primary and landing is additive
- [x] `landing/README.md`: blastimage-specific hosts + deploy/domain/redirect operator steps
- [x] Register 4003 in natabula PORT-REGISTRY; README.md / AGENTS.md pointer
- [x] File follow-up: audit tracked files for personal configuration
- [x] Verify (acceptance commands) + 👁️

## 🔗 Related

- [[CORE-012]] — brand-chamber-reference (brand source the copy draws from)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** No landing exists; brand kit (BRAND.md, assets.json, logo/favicon/promo) is filled and approved, so the template's placeholders can be replaced now. Placement decided with the operator (in-repo).

- [x] Read relevant source files — natabula `templates/landing/` (5 files), DESIGN-STANDARDS §"Landing surfaces", STACK-TENDENCIES §"Project layout" / §"Command interface", PORT-REGISTRY; marscharts + bidviz landings; root `justfile`, `eslint.config.mjs`, `tsconfig.json`, `.gitignore`, CI; `brand/*`

- [x] **Best Practices Review** — landing is a self-contained stack (own package.json/build/port) with a one-way dependency on `brand/` (reads copy + assets, never writes). Root tooling must not reach into it (fences). No duplication: copy and images imported from `brand/`, not copied.

- [x] **Archive skim** — `archive/deployment/` (area confirmed against README table). No prior landing work. Load-bearing: DEPLOY-008.3 / CORE-002 — Next auto-rewrites `tsconfig.json` arrays onto multiple lines on new distDirs; keep the compact one-line style when adding `exclude`.

- [x] **Drift check** — PLAN line matches natabula template (Astro, Worker, apex canonical, www→apex, noindex). Template's `astro ^7` current (7.4.0). One unflagged hazard: the shared `justfile` auto-adapts by dir presence, so a `landing/` dir makes `dev` pick landing over the root Next app and makes `lint`/`build` skip the root (`ran=1`). STACK-TENDENCIES §"Command interface" sanctions hand-authored bodies for non-standard layouts.

- [x] Asked clarifying questions — operator answers: in-repo `landing/`; copy read from BRAND.md at build time; code + documented deploy steps (nothing published by agent); page shows logo + favicon, promo, GitHub source link. Side request: file a task to audit that git tracks no personal configuration.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared (omit only with no file deliverable)

**Discovery Notes:**

- Repo is public (`source_visibility: public`), so `landing/` is clonable; that is the standard's accepted case. No `homepage_url` declared → apex `https://blastimage.com` per §"Landing surfaces" table.
- Port: 4003 free in the registry (4000/4002 marscharts, 4007 postiz); pairs with app 3003.
- Promo is 16:9 not 40:21; usable as og:image, but no `social-og` claim is added to assets.json.
- `seo/sites.json` declaration + natabula output checker: not in the PLAN line; noindex verified by grep instead.
- Tailwind v4 auto source detection may scan `landing/src/*.astro` — check the root CSS output is unaffected.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended natabula `templates/landing/` verbatim where it applies (config comments, wrangler.toml, noindex head); `@astrojs/check` + `typescript` devDeps and `tsconfig.json` (`astro/tsconfigs/strict`) follow the marscharts landing precedent, since `astro check` needs them.

- [x] **Minimal refactor gate** — no refactor. The justfile's four rewritten recipes are required for Acceptance (root app stays primary), not cleanup.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A: one static page with no logic; build + grep assertions on `dist/` stand in (Phase 3).

**Implementation Notes:**

- `landing/` (8 tracked files + lockfile): `index.astro` imports `../../../brand/BRAND.md` frontmatter, `assets.json` (`display_name`, `public_metadata.source_url`), `logo.svg?url` / `favicon.svg?url` (Vite inlines both as data URIs, under 4 KB), and `promo-16x9.webp` (emitted hashed under `_astro/`; absolute `og:image` from `Astro.site`). `vite.server.fs.allow: ['..']` lets the dev server serve `../brand/`.
- Page title is `name — tagline`, not "Coming soon": blastimage is `beta` / `available`, so a coming-soon line would misstate it. Prelaunch here means SEO exclusion (noindex), not product status.
- `<style is:global>`: the screenshot showed the mark flush to the top. Astro's scoped `*` reset (`[data-astro-cid]`) outranks `body`, so it zeroed the body padding. The natabula template has the same latent bug; filing that upstream is out of scope here.
- Root fences: ESLint `ignores` gets `landing/**` (it was linting `landing/.astro/types.d.ts`, 7 errors). `tsconfig.json` is untouched: tsc's `**/*.ts` already skips dot-dirs and `node_modules`, so `npx tsc --listFilesOnly` lists 0 landing files.
- justfile: `setup` / `dev` / `lint` / `build` hand-authored; the header explains why. `test`, `e2e`, `typecheck`, `coverage` are unchanged (they never branch on `landing/`).
- Astro 7 `astro dev` daemonizes (prints pid + `astro dev stop`); `npm run dev` returns immediately.
- natabula `docs/PORT-REGISTRY.md` blastimage row: 4003 landing allocation (uncommitted in natabula).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) Asked the user for visual confirmation (`👁️ **CONFIRM**` on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Receipt (re-run after the review fixes, with `landing/node_modules`, `dist/`, `.astro/` on disk):

- `npm --prefix landing run build` → 0; `test -f landing/dist/index.html` → 0
- noindex / no canonical / no robots.txt grep → 0
- BRAND.md copy in dist, not in `index.astro` grep → 0
- apex `site:` + `og:url` grep → 0
- icon / og:image / GitHub link grep → 0
- `npm --prefix landing run check` → 0 (0 errors, 0 warnings, 0 hints)
- `npm run typecheck` → 0; `npm run lint` → 0; `npm test` → 0 (687 passed)
- `just lint` → 0, printed `› root: lint` and `› landing: astro check`; `just --show dev | grep -q 'npm run dev'` → 0 (body is `npm run dev` only)
- `grep -q 'blastimage.*4003' ~/Code/natabula/docs/PORT-REGISTRY.md` → 0
- landing README `www` + `wrangler deploy` grep → 0
- `grep -q 'personal' .flaitron/PLAN.md` → 0 (DEPLOY-012, committed 487f9f8)
- `git check-ignore` → `landing/node_modules`, `landing/dist`, `landing/.astro` all ignored
- Self-check screenshots (desktop + 390 px) after the `is:global` fix: padding restored, no overflow, 0 console errors/warnings.

External review (`/code-review medium`, forked, working-tree diff). 10 findings, 0 blockers:

1. No CI job builds/checks `landing/`, so a brand-field change can break it silently → **note, filed-on-confirm**: proposed at the 📦 gate.
2. `not_found_handling = "404-page"` with no 404 page is inert → **fixed** (key dropped, comment says how to restore).
3. Hand-authored justfile risks a natabula layer-refresh reverting it → **fixed**: blastimage added to STACK-TENDENCIES §"Command interface" fleet cases. The justfile header already explains the fork.
4. `just lint`/`build` fail if landing deps are missing → **no change**: failing loud is correct for a gate, `just setup` installs both stacks, and adopters do not run this repo's `just` verbs.
5. Root tsconfig `**/*.ts` would type-check a future `landing/**/*.ts` → **fixed** (`exclude` gets `"landing"`, compact style kept).
6. landing README overstated "root gates skip it" → **fixed** (npm/CI gates skip it; `just` verbs include it).
7. `fs.allow: ['..']` exposes the whole repo on the dev server → **fixed** (`['.', '../brand']`; dev 200 after the change).
8. Raw promo `<img>` → **fixed in part**: `loading="lazy"` + `decoding="async"`. `<Image>` transcoding declined for one 42 KB asset.
9. wrangler.toml cited natabula docs as repo-relative → **fixed**.
10. "Source on GitHub" label hardcoded → **no change**: `source_url` is GitHub; the label is UI chrome, not a portable fact.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: Docs list gets `landing/README.md`. `AGENTS.md`: Dev-port bullet names the landing stack (4003, eslint fence, hand-authored justfile). `CLAUDE.md`: no change. `.flaitron/PLAN.md`: closure stub. `VISION.md`: no change (product vision, not hosting). `docs/ADOPT.md`: no change (the adopter install path is unaffected, and `landing/` is described in its own README). `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md`: no change. `.flaitron/tasknote/README.md` quick commands: added the landing line.

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — AGENTS.md now carries the one load-bearing fact: `landing/` is a separate stack the root gates skip, and the justfile is hand-authored. Nothing further.

**Final Summary:**

blastimage.com now has a prelaunch landing page in `landing/`, built from natabula's Astro skeleton. Its copy and art are read from `brand/` at build time, it sets noindex, and its canonical origin is the apex. It is not deployed: the Worker deploy, the custom domain, and the `www`→apex redirect are operator steps in `landing/README.md`.

- Changed: `landing/` (9 files + lockfile), `justfile` (setup/dev/lint/build hand-authored), `eslint.config.mjs` (+`landing/**` ignore), `tsconfig.json` (`exclude` + `landing`), `README.md`, `AGENTS.md`, `.flaitron/tasknote/README.md`. In natabula, uncommitted at closure: `docs/PORT-REGISTRY.md` (4003), `docs/STACK-TENDENCIES.md` (hand-authored-justfile fleet case).
- Verification: all 12 Acceptance commands → 0 (receipt above); 👁️ confirmed by operator.
- Refactors: none.
- `touches:` reconciliation: `git diff --name-only` plus untracked files match the declared set exactly. `.flaitron/PLAN.md` changes with the closure stub. The two natabula paths are outside this repo's diff.
- Maintainability: the landing cannot drift from the brand copy, because the copy is read from `brand/` on every build. One known gap: CI does not build `landing/` (review note 1, proposed as a follow-up).
- Filed during the task: DEPLOY-012 personal-config-audit (Low, 487f9f8).

**Archived:** 2026-10-17
