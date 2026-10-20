---
name: audit
description: blastimage (Next.js 16 / TypeScript) audit — thin overlay over flaitron's bundled `ft-audit` (runs its passes by reference, applies the project deltas below). Forked from flaitron's audit-overlay template; see `docs/MIGRATION.md` §1.2.1.
flaitron-reconciled: v7.4.0
flaitron-tracks: ft-audit
---

# audit — thin overlay over `ft-audit`

> **Overlay skill.** This file does NOT restate the audit procedure. It points
> at flaitron's bundled scaffold and supplies only what diverges for this
> project. First action on every run: read the referenced scaffold below and
> run **its** procedure, finding format, closing sections, and hard rules —
> substituting the `## Deltas` values for the scaffold's `<placeholder>` slots.

**Referenced scaffold (read first, always):**
`.flaitron/core/claude/skills/ft-audit/SKILL.md`

**Pass files:** the scaffold loads its per-domain pass definitions from a
`passes/<domain>.md` sibling. This overlay has no `passes/` directory of its
own — resolve those reads **relative to the referenced scaffold's directory**,
i.e. `.flaitron/core/claude/skills/ft-audit/passes/<domain>.md`.

_(The adopter path is the read-only submodule — the audit scaffold is
forked-not-symlinked, so this submodule path is the stable, clone-independent
reference.)_

## Domains

All eight. Seven carry keyed deltas below; `context` has no forker slots and runs on its pass file as shipped (adopter mode — pass 6 skipped).

Domain tokens are `general` (default) · `backend` · `frontend` · `security` ·
`performance` · `docs` · `structure` · `context`. Invoked as `/audit <domain> [scope]`; a bare
invocation resolves to `general`.

## Deltas

These fill the bundled scaffold's §0-forker-checklist surface. Every fillable
slot lives in the pass files — the §"Scope & rubric hints" / §"The 5 passes" /
§"Severity guide" / §"Specialist additions" placeholders resolve to the values
here; everything else (the dispatcher's §1 resolution steps, pass order, capped
findings, finding format, closing sections, write-to-PLAN step, hard rules) is
inherited verbatim.

Where a value differs per domain, key it by domain (`backend: …`); an unkeyed
value applies to every domain this overlay covers.

- **Scope glob** (default-`all` target; `.flaitron/`, `node_modules/`, `.next*/`, `coverage/`, `landing/dist/` always excluded):
  - general: `{app,components,lib,e2e}/**/*.{ts,tsx}`
  - backend: `app/api/imagegen/**/*.ts`, `lib/imagegen{ServerFs,Guard,Route}.ts`, and their suites `lib/imagegen*.test.ts` (route suites live in `lib/` — AGENTS.md §Stack Testing)
  - frontend: `{app,components}/**/*.{ts,tsx,css}` (minus `app/api/`), every non-route `lib/*.{ts,tsx}` (client modules — `storage`, `workspace`, `imagegenUrl`, `imagegenClient`, `useWorkspace`, …), `landing/src/**`
  - security: backend scope + `lib/{imagegenClient,imagegenUrl,storage,persistence}.ts`, `next.config.ts`, `package.json` (bind flags in `dev`/`start`), `playwright.config.ts`, `.github/workflows/ci.yml`, `.gitleaks.toml`, `.env.example`, `justfile`, `landing/{src/**,astro.config.mjs,wrangler.toml,package.json}`
  - performance: no default — pass a scope (a component, `lib/useWorkspace.ts`, or an imagegen route); `all` is rarely useful here
  - docs: `README.md`, `VISION.md`, `AGENTS.md`, `CLAUDE.md`, `docs/*.md`, `.flaitron/tasknote/README.md`, `landing/README.md`, `brand/*.md`; `ai-referenced` walks `.flaitron/tasknote/README.md` §"AI-referenced docs"
  - structure: `{app,components,lib,e2e}/**`, `justfile`, root `*.config.*` (whole tree — structural findings live between files)
- **Rubric files** (audit-against contracts):
  - every domain: `AGENTS.md` (§Stack — server surface, module layout, type-safety, testing), `CLAUDE.md`
  - general: `README.md`, `VISION.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/USAGE.md`
  - backend: `docs/ADOPT.md` (localhost imagegen API), `docs/REVIEW-LOOP.md` (imagegen file API, `selection.json` / `approved/` shapes)
  - frontend: `docs/USAGE.md`, `VISION.md` (generation-mode table), `brand/BRAND.md` (landing)
  - security: AGENTS.md §Stack's server-surface paragraph (loopback bind, guard checks, root confinement, `browse` exception) is the threat model; `.env.example` (declared secret surface — none browser-exposed), `.gitleaks.toml`
  - performance: none declared — no perf budget or SLO doc exists
  - docs: `.flaitron/tasknote/README.md` §"AI-referenced docs", `README.md`, `AGENTS.md`
  - structure: AGENTS.md §Stack "Module layout" (pure/hook split, BI-049 decision), `justfile` (verb roster)
- **Verification gates** (run before passes, from the repo root):
  - general · backend · structure: `npm run typecheck` · `npm run lint` · `npm test` (`.github/workflows/ci.yml` Type check / Lint / Test steps); backend and structure also run the security domain's `node:fs` importer grep.
  - frontend: `npm run typecheck` · `npm run lint` · `npm test` · `npm run build:verify` (writes `.next-verify/`, safe beside a live `just dev`) · `npm --prefix landing run check`. Bundle-analyzer and a11y slots: none configured.
  - security: `( set -o pipefail; t=$(mktemp -d); trap 'rm -rf "$t"' EXIT; git -C "$(git rev-parse --show-toplevel)" archive HEAD | tar -x -C "$t" && gitleaks dir "$t" --config .gitleaks.toml --no-banner --redact )` — scans the HEAD tree, the same surface CI's fresh-checkout `gitleaks dir .` sees; a bare local `gitleaks dir .` walks gitignored `.next*/` and reports Next's generated keys (BI-034.5). Uncommitted edits are outside it — commit or scan them by path. · `npm audit --omit=dev --audit-level=high` and `npm --prefix landing audit --omit=dev --audit-level=high` (CI's two Audit steps; dev trees deliberately ungated, BI-034.3) · `grep -rlE "from ['\"](node:)?fs" app lib | grep -v '\.test\.'` must print only `lib/imagegenServerFs.ts` (the BI-072 hard rule's mechanical check). SAST: none.
  - performance: `npm run build:verify` — its route-size table is the only measurement; profiler and load-test slots: none configured, so surface the unmeasured state first per the pass file.
  - docs: none — no markdown lint or link checker adopted; pass 3 link checks are a manual `test -e` walk.
  - structure: also none for duplication / complexity / dead-code detectors — passes run on read-the-code evidence.
- **Sacred invariants → Critical** (severity guide): an imagegen route reaching a path outside the linked root · browser-exposed DB/storage credentials · a dev/start/e2e server binding off loopback · a project's `selection.json`/`approved/` writes aimed at a different project's root (BI-047) · an e2e run dirtying the committed `test-fixtures/imagegen/` (confirmed by operator 2026-09-25)
- **Per-pass examples** (concrete stack anti-patterns to add under each pass):
  - general / Security: an imagegen handler building a path with `join(root, input)` instead of `resolveUnderRoot`; a route missing the `lib/imagegenGuard.ts` check; `dangerouslySetInnerHTML` on prompt or manifest text.
  - general / Idioms: Next 16 App Router + React 19 + TS `strict` / `noUncheckedIndexedAccess` / `exactOptionalPropertyTypes` — assigning `undefined` to an optional prop, an unguarded index read, a `Session` mutated in place instead of through `lib/workspace.ts`'s pure functions, orchestration added outside `lib/useWorkspace.ts`, `vi.mock` where an injectable seam (`ImagegenApi`, `persistence`) exists, a test missing its hand-wired `afterEach(cleanup)`.
  - backend / Input & contracts: a route reading `request.json()` fields without narrowing; a round/name param not checked against its regex before reaching `fs`.
  - backend / Error & lifecycle: a handler returning a non-`Result` error shape; a confinement failure surfaced as a raw `fs` error instead of the standard `Path escapes the linked imagegen folder:` refusal (other failures keep their own messages — `Could not read …`, `No such folder: …`); a write that leaves a partial `approved/` copy on failure.
  - backend / Persistence: `selection.json` written non-atomically, or written for a root other than `Session.imagegenRoot`.
  - backend / Async correctness: sync `fs` (`*Sync`) in a route handler; an un-awaited `fs/promises` call.
  - frontend: a `window` / `localStorage` read at module scope or during render (SSR breaks); a modal not using `useFocusTrap`; an icon-only button without `aria-label`; an `imagegen:` URL resolved against the live link instead of the project's root; `window.confirm` or error / confirm strings raised outside `useWorkspace.ts` (presentational labels in `components/` are fine); `landing/` copy diverging from `brand/BRAND.md`.
  - security / Secrets: there is no secret source of truth because the app holds no credentials — Grok auth lives in the Grok Build session (`docs/GROK-AGENT.md`). Any key, token, or `NEXT_PUBLIC_*` credential landing in the repo or bundle is a finding.
  - security / Input handling: `dangerouslySetInnerHTML` on prompt or manifest text; an imagegen path param reaching `fs` without `resolveUnderRoot`; `browse` reused for a read that should be root-confined.
  - security / Auth & authz: no accounts by design — the trust boundary is the `-H 127.0.0.1` bind plus `lib/imagegenGuard.ts`, so "route has no auth" is not a finding. A new route or config flag widening the bind, or a route skipping the guard, is. `Host` / `Origin` / `Sec-Fetch-Site` checks count as browser-only defense, never authentication.
  - security / Dependencies: report the `npm audit --omit=dev` count; the dev tree is deliberately ungated (BI-034.3).
  - performance: whole-`Session` `localStorage` rewrites on every keystroke; full-size images decoded for grid thumbnails; `listRounds` re-reading every `batch.json` on each link / mount / round action as round counts grow.
  - docs / Claims vs. code: the imagegen file API in `docs/REVIEW-LOOP.md` / `docs/ADOPT.md` vs. the `app/api/imagegen/*` routes; `justfile` verbs and `package.json` scripts cited in README / AGENTS.md.
  - docs / Cross-doc consistency: port numbers (3003 / 3009 / 4003) and the `.next-e2e` / `.next-verify` distDirs across README, AGENTS.md, tasknote README §"Project quick commands", `playwright.config.ts`, `package.json`; the two-mode description in AGENTS.md vs. `VISION.md`.
  - docs / Cross-references: plain relative `[text](path)` links in docs; `[[ID]]` wikilinks in tasknotes resolve to a PLAN row or a tasknote.
  - docs / Currency: the flaitron pin is never restated in a project file (AGENTS.md — read it with `git -C .flaitron/core describe --tags`), so a doc stating a version is a finding; the overlay's `flaitron-reconciled:` marker vs. the pin; Next / React majors named in AGENTS.md vs. `package.json`.
  - structure: path/regex constants (round dir, approved name) re-declared outside `lib/imagegenServerFs.ts` / `lib/imagegenUrl.ts`; a component calling `persistence` or `fs` APIs directly instead of through the hook; root scripts with no `justfile` verb.
- **Extra hard rules** (appended project-specific rules):
  - Every `fs` read or write under the linked root goes through `resolveUnderRoot`, and `lib/imagegenServerFs.ts` stays the only `node:fs` importer under `app/` and `lib/` (non-test — checked by the security gate's grep). `browse` is the one sanctioned unconfined surface, bounded by `lib/imagegenGuard.ts`. A bypass is Critical in any domain (BI-072).
  - `lib/useWorkspace.ts` stays whole (BI-049). A split proposed on size or member count is never a finding; only a second consumer or the `session` / `commit` hub fragmenting reopens it.
  - `.flaitron/core/` is read-only — a finding there is filed upstream to flaitron, never as a blastimage row.
