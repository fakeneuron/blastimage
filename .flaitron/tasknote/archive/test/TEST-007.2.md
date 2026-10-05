---
title: playwright-harness
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: [TEST-EPIC-007, CORE-004, TEST-007.3, TEST-007.4, TEST-007.N]
touches:
  - playwright.config.ts
  - package.json
  - package-lock.json
  - .github/workflows/ci.yml
  - e2e/
  - CLAUDE.md
# No TEST-007.1 Fan-out to echo — epic was filed from audit-repo with children starting at .2.
---

# TEST-007.2 | playwright-harness

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-007]] [[CORE-004]] [[TEST-007.3]] [[TEST-007.4]] [[TEST-007.N]]

## 🎯 Goal

Stand up a Playwright e2e harness on a dedicated port (not 3003, `reuseExistingServer: false`) with an npm script, a working `just e2e`, and a CI job — so later children can add real-browser specs.

## ✅ Acceptance

- [x] `playwright.config.ts` exists at repo root; `webServer` binds a dedicated port ≠ 3003 and sets `reuseExistingServer: false`
- [x] `package.json` has an `e2e` script; `@playwright/test` is a direct devDependency
- [x] `just e2e` runs the harness (the CORE-004 config-presence branch) instead of printing the inert-config message
- [x] `.github/workflows/ci.yml` has an `e2e` job that installs Playwright browsers and runs the suite
- [x] Vitest still discovers only `{lib,components}/**/*.test.{ts,tsx}` — e2e specs live outside that glob

## 🧩 Subtasks

- [x] Add `@playwright/test` as a direct devDependency
- [x] Add `playwright.config.ts` (dedicated port, `reuseExistingServer: false`, chromium-only, `testDir: ./e2e`, webServer = `next dev --turbopack` on that port)
- [x] Add `npm run e2e` script
- [x] Add `e2e/smoke.spec.ts` — `/` loads, title is `blastimage`, Project combobox is visible (harness proof; not TEST-007.3/.4)
- [x] Add a sibling `e2e` job to `.github/workflows/ci.yml` (`npx playwright install --with-deps` then `npm run e2e`)
- [x] Record the dedicated e2e port on the project `CLAUDE.md` Dev-port line (personal `~/.claude/CLAUDE.md` registry is out of remit)
- [x] Verify `just e2e` invokes Playwright and the unit suite is unchanged

## 🔗 Related

- [[TEST-EPIC-007]] — parent epic: real-browser harness for folder picker, round load, and review keyboard paths
- [[CORE-004]] — depends-on: made `just e2e` inert-but-honest; this child reverses that by depositing the config the recipe already looks for
- [[TEST-007.3]] — follow-up: Link imagegen + Load round against `test-fixtures/imagegen/`
- [[TEST-007.4]] — follow-up: lightbox / keep / approve / discard / focus-trap in a real browser
- [[TEST-007.N]] — epic audit (not started)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** CORE-004 left `just e2e` correctly inert (`no Playwright config found`). There is still no `playwright.config.*`, no `e2e` npm script, no `@playwright/test` direct dep, and CI has only typecheck/lint/test/build/audit + gitleaks. The PLAN line is still the right first child.

- [x] Read relevant source files — `justfile` (e2e recipe 69-75), `package.json` (scripts, no playwright), `.github/workflows/ci.yml`, `vitest.config.mts` (include glob), `.gitignore` (already ignores `playwright-report*` / `test-results/`), CORE-004 archive, DEPLOY-001 / BI-034.3 CI-job shape.

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  Touched surfaces are config + CI, not app modules. Patterns to extend:
  - **just e2e** already runs `npx playwright test` at repo root once `playwright.config.*` exists (CORE-004). Do not rewrite the fleet `justfile` recipe; depositing the config *is* the wire-up. (justfile is a natabula base-stable deposit — CORE-004 scoped blastimage-local edits only.)
  - **CI jobs:** DEPLOY-001 added a sibling `secrets` job rather than stuffing gitleaks into `ci`. Playwright browser install is slow and needs `--with-deps`; a sibling `e2e` job matches that shape and keeps the unit job's ~1 min signal intact.
  - **Test isolation:** vitest include is `{lib,components}/**/*.test.{ts,tsx}` (TEST-001.2). Specs go in `e2e/*.spec.ts` so vitest never discovers them.
  - **Port:** app `npm run dev` stays 3003; Playwright `webServer` owns a second port with `reuseExistingServer: false` so `just dev` can stay up.
  - Deferred: TEST-007.3 / .4 feature specs; editing `~/.claude/CLAUDE.md` port registry (outside this repo).

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Explicit assumptions:
  1. **Port 3009.** PLAN names "a dedicated e2e port (not 3003)" without a number. 3000–3003 are taken on this workstation; 3009 is unused and far enough from 3003 that coexistence is obvious. Documented in-repo (`CLAUDE.md`); the personal `~/.claude/CLAUDE.md` registry is out of remit.
  2. **Chromium-only.** Matches a local Next app; firefox/webkit are a later call (audit or follow-up).
  3. **One boot-smoke spec** (`e2e/smoke.spec.ts`: title + Project combobox). Playwright fails with zero tests; the smoke proves webServer/port/CI without stealing TEST-007.3/.4 (folder picker, keyboard).
  4. **`justfile` is not edited.** CORE-004's presence guard takes the root `npx playwright test` branch once `playwright.config.ts` exists. That *is* the wire-up.
  5. **Sibling `e2e` job in `ci.yml`**, not a new workflow and not stuffed into the unit `ci` job. Install via `npx playwright install --with-deps chromium`.
  6. **webServer command is `npx next dev --turbopack -p 3009`**, not `npm run dev` (which hard-pins 3003). `reuseExistingServer: false` always, including CI.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Current state (verified live):**
- No `playwright.config.*` anywhere. `package.json` scripts: `dev`/`build`/`lint`/`typecheck`/`test` — no `e2e`. `@playwright/test` appears only transitively (`package-lock.json`, via `@vitest/browser-playwright`).
- `justfile:69-75` `e2e` recipe: if `playwright.config.*` at root, `npx playwright test`; else the CORE-004 inert message. Blastimage has no `frontend/` subdir.
- CI `ci` job: checkout → Node 22 → `npm ci` → typecheck → lint → test → build → `npm audit --omit=dev --audit-level=high`. Sibling `secrets` job (gitleaks). No Playwright.
- `.gitignore` already lists `playwright-report*` and `test-results/` (fleet deposit; no change needed unless we add `blob-report/` / `.playwright/` cache).
- `test-fixtures/imagegen/` exists (for TEST-007.3, not this child).

**Archive skim (`archive/test/` + path greps):**
- `archive/test/`: TEST-001.* through TEST-006 — vitest glob, component coverage, happy-dom, imagegen route tests, focus-trap, vitest `.mts`. None mention Playwright as a runner.
- **CORE-004** (`just-e2e-inert-verb`) — load-bearing predecessor. Deliberately took the "state the absence" branch, *not* depositing a harness (`[light]`). Explicit assumption that a full Playwright harness was a later multi-file effort. This child is that effort. `justfile` is a natabula base-stable deposit; do not invent a blastimage-only `just e2e` fork (e.g. wrapping `npm run e2e`) unless the fleet recipe cannot run the config as-is. It can.
- **DEPLOY-001** — sibling-job precedent for CI add-ons that shouldn't share the unit job's filesystem/time budget.
- **BI-034.3 / DEPLOY-002** — `ci.yml` comment culture (rationale above the step). Mirror that on the new e2e job.
- BI-013 / BI-021.3 mention Playwright *MCP* for live visual confirmation — unrelated to a committed test runner.

**Drift check:**
- PLAN.md line matches HEAD: no config, no script, no CI job, `just e2e` inert. Port 3003 is still `package.json:9` / CLAUDE.md Dev-port.
- No TEST-007.1 Discovery note exists (PLAN: "Discovery supplied by audit-repo 2026-09-09"); children start at `.2`. No Fan-out YAML to echo.
- SPEC: ordinary implementation child of a TEST- epic; no contract contradiction. Cross-repo remit: do not edit natabula's canonical justfile or `~/.claude/CLAUDE.md`.
- Line-number drift: CORE-004 cited `justfile:70-75`; current recipe is `69-75` (comment one line earlier). Behavior unchanged.

**Assumptions (no ask):** port **3009**; chromium-only; one boot-smoke spec so Playwright does not fail with zero tests; `justfile` untouched; sibling `e2e` CI job; webServer is `npx next dev --turbopack -p 3009` with `reuseExistingServer: false`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

  Extended three existing shapes rather than inventing a blastimage-only runner: CORE-004's `just e2e` presence guard (deposit `playwright.config.ts`, do not fork the fleet recipe); DEPLOY-001's sibling CI job (Playwright Chromium install stays off the unit `ci` job); TEST-001.2's vitest glob (specs live in `e2e/*.spec.ts`). New file `playwright.config.ts` is justified — there was no Playwright runner shape in-tree.

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

  Only extra edit: `eslint.config.mjs` ignores for `playwright-report/**` and `test-results/**` so a local `npm run e2e` does not make `npm run lint` crawl generated HTML. `justfile` untouched. Deferred: firefox/webkit, report-artifact upload, personal port-registry edit.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

  `e2e/smoke.spec.ts` — title `blastimage` + Project combobox. Proves webServer/port/CI; folder-picker / keyboard stay in TEST-007.3 / .4.

**Implementation Notes:** Port **3009**. `webServer.command` is `npx next dev --turbopack -p 3009` (not `npm run dev`, which hard-pins 3003). `@playwright/test` `^1.63.0`. Chromium-only. `reuseExistingServer: false` always.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

  No duplication (one config, one smoke, one CI job). No dead code. Public surface is the `e2e` npm script + `just e2e` (already existed). Docs updated at the three cold-start surfaces (CLAUDE.md, README.md, tasknote README quick commands).

- [x] (frontend) Asked the user for visual confirmation — N/A, no rendered UI change; the smoke spec is the browser check.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:** `npx tsc --noEmit` exit 0. `npm run lint` exit 0. `npm test` 32 files / 575 tests passed. `just e2e` → `1 passed (5.9s)` (`e2e/smoke.spec.ts` workspace shell loads); no CORE-004 inert message. Port 3009 was free; webServer bound it for the run.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  - `README.md` — **updated**: Install block gained `npm test` / `npx playwright install chromium` / `npm run e2e`; CI paragraph names the Playwright e2e job on 3009
  - `AGENTS.md` — no change (no testing section)
  - `CLAUDE.md` — **updated**: Dev-port line names 3009; Testing bullet names Playwright / `e2e/*.spec.ts` / chromium-only
  - `.flowtron/PLAN.md` — this child's stub flip (nested under TEST-EPIC-007)
  - `VISION.md` — no change
  - `docs/ADOPT.md` — no change (app port 3003 still correct)
  - `docs/WORKFLOW.md` — no change
  - `docs/REVIEW-LOOP.md` — no change
  - `docs/GROK-AGENT.md` — no change

  Also updated `.flowtron/tasknote/README.md` Project quick commands (e2e line) — not itself an AI-referenced-docs entry.

- [x] Closed — every `## ✅ Acceptance` criterion ticked. YAML `status:` flipped to `completed`. PLAN.md line to stub form, kept nested beneath TEST-EPIC-007. Tasknote moved to `.flowtron/tasknote/archive/test/TEST-007.2.md`. No superseded-claim pointer: CORE-004's "no config" was accurate for that task and named this harness as later work.

- [x] **Evidence-based recap** drafted — see below.

**Final Summary:** CORE-004 left `just e2e` honest-but-inert; this child deposits the missing Playwright harness so that recipe actually runs. `@playwright/test` `^1.63.0` + `playwright.config.ts` (port **3009**, `reuseExistingServer: false`, chromium-only, `webServer` = `npx next dev --turbopack -p 3009`) + `npm run e2e` + `e2e/smoke.spec.ts` (title + Project combobox) + a sibling `e2e` job in `.github/workflows/ci.yml`. `justfile` was not forked — the CORE-004 presence guard is the wire-up. Verified: `tsc` / `lint` / `npm test` (575) green; `just e2e` 1 passed in 5.9s. Docs: CLAUDE.md, README.md, tasknote README quick commands. Deferred: firefox/webkit, TEST-007.3/.4 feature specs, personal port-registry edit, CI report artifacts.

**Archived:** 2026-09-09
