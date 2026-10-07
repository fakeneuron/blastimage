---
title: playwright-spine
status: completed
tags: [e2e, tooling]
created: 2026-10-07
due:
related-tasks: [TEST-007.2, TEST-009, DEPLOY-008.3]
touches:
  - playwright.config.ts
  - package.json
  - .github/workflows/ci.yml
  - README.md
  - CLAUDE.md
  - .flaitron/tasknote/README.md
  - eslint.config.mjs
---

# TEST-010 | playwright-spine

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[TEST-007.2]] · [[TEST-009]] · [[DEPLOY-008.3]]

## 🎯 Goal

Bring `playwright.config.ts` and the e2e npm script to the natabula STACK-TENDENCIES §"End-to-end testing (Playwright)" spine, so a run tears down its `next dev` tree instead of orphaning it.

## ✅ Acceptance

- [x] `webServer` carries `gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 }` — `grep -q 'gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 }' playwright.config.ts`
- [x] Workers capped `process.env.CI ? 1 : 2` — `grep -q 'workers: process.env.CI ? 1 : 2' playwright.config.ts`
- [x] html reporter added with `open: "never"` beside the console reporter (list locally, github in CI) — `grep -q '"html", { open: "never" }' playwright.config.ts`
- [x] npm script renamed `e2e` → `test:e2e`, and no live reference to `npm run e2e` remains (archive excluded) — `grep -q '"test:e2e": "playwright test"' package.json && ! grep -rn 'run e2e' --exclude-dir=node_modules --exclude-dir=.flaitron --exclude-dir=.next-e2e . && ! grep -n 'run e2e' .flaitron/tasknote/README.md`
- [x] Suite passes via the renamed script — `npm run test:e2e`
- [x] A run leaves no orphaned `next` process behind — `pgrep -fl 'next dev.*3009'` prints nothing after `npm run test:e2e` exits (before/after PID diff recorded; note the old config also left none here, see Implementation Notes)
- [x] Unit suite, lint, typecheck unaffected — `npm test && npm run lint && npm run typecheck`

## 🧩 Subtasks

- [x] Baseline: record `next`/3009 processes before any e2e run
- [x] `playwright.config.ts`: add `gracefulShutdown`, `workers: CI ? 1 : 2`, reporter array (console + html `open: "never"`), with a one-line why each, matching the file's comment style
- [x] `package.json`: rename `e2e` → `test:e2e`
- [x] Update live refs: `.github/workflows/ci.yml`, `README.md`, `CLAUDE.md`, `.flaitron/tasknote/README.md`, `eslint.config.mjs` comment
- [x] Run `npm run test:e2e`, then diff `next` processes against baseline
- [x] Run unit/lint/typecheck

## 🔗 Related

- [[TEST-007.2]] — predecessor: stood up the harness (config, `e2e` script, CI job)
- [[TEST-009]] — predecessor: exact `@playwright/test` pin (the spine's other per-repo rule)
- [[DEPLOY-008.3]] — related-decision: `.next-e2e/` distDir so e2e runs beside `just dev`

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** All four gaps the PLAN line cites are present at HEAD 970066d: no `gracefulShutdown`, workers set only in CI, reporter `github`/`list` with no html, script named `e2e`.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flaitron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

- **Sources read:** `playwright.config.ts`, `package.json`, `justfile` (`just e2e` calls `npx playwright test` directly, so the rename doesn't touch it, as the spine intends), `.github/workflows/ci.yml` e2e job (`npm run e2e`, no artifact upload), `.gitignore` (`playwright-report*/`, `test-results/` already ignored), `eslint.config.mjs` (both dirs already lint-ignored; comment names `npm run e2e`), natabula `docs/STACK-TENDENCIES.md` §"End-to-end testing (Playwright)" and `templates/nextjs/playwright.config.ts`.
- **Live refs to the old script:** `package.json:17`, `README.md:12`, `CLAUDE.md:15` (Testing bullet), `.flaitron/tasknote/README.md:83`, `eslint.config.mjs:69` (comment), `.github/workflows/ci.yml:154`. Archived tasknotes are historical records and stay as written.
- **Best practices:** config-only change; no code abstractions involved. The template's `reuseExistingServer: !process.env.CI` / `command: 'npm run dev'` are deliberately **not** adopted. The spine itself says to give e2e its own strict port when the harness owns its servers, which is what the 3009 + `.next-e2e/` setup does (DEPLOY-008.3). The spine says it is "spine-standardized, not byte-uniform".
- **Port/strictPort:** `next dev` has no `strictPort` flag. With `reuseExistingServer: false`, Playwright already refuses to start if 3009 is answering, which covers the silent-bump hazard the spine warns about. No change.
- **Archive skim (`archive/test/`, plus `archive/deployment/` for DEPLOY-008.3):** TEST-007.2 created the config, the `e2e` script, and the CI job. DEPLOY-008.3 added the `.next-e2e/` distDir so e2e runs beside `just dev`, and that must survive. TEST-009 pinned `@playwright/test` 1.63.0 exactly (the spine's pin rule is already met). TEST-007.N ran with 4 workers locally, so the 2-worker cap will slow local runs a little; the spine accepts that for thermal reasons.
- **Drift check:** the cited lines still match HEAD (`:20` workers, `:21` reporter, `:32` webServer, `package.json:17`). The plan below differs from the spine's literal `reporter: 'html'` (see clarifications). That was an operator-approved reading of the spine, not drift from the PLAN line.
- **Clarifications (AskUserQuestion):** (1) Reporter is `[[CI ? "github" : "list"], ["html", { open: "never" }]]`. The bare html reporter's default `open: "on-failure"` serves the report and blocks the terminal after a failed local run, which would hang agent runs, and it would drop CI's github annotations. (2) Clean rename `e2e` → `test:e2e` with no alias, updating every live reference.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A: harness config only; the e2e suite itself is the test

**Implementation Notes:**

- **Pattern:** extended the existing `playwright.config.ts` in place. Comment wording follows the natabula `templates/nextjs/playwright.config.ts` (so a fleet reader sees the same rationale) and the file's own `(TASK-ID)` attribution style. The old CI-only spread `...(process.env.CI ? { workers: 1 } : {})` became the plain spine ternary. `fullyParallel`, the 3009 port, `reuseExistingServer: false`, and `NEXT_E2E_BUILD` are untouched.
- **Reporter:** `[[CI ? "github" : "list"], ["html", { open: "never" }]]`, per the operator's answer. It writes `playwright-report/` on every run, which is already gitignored and lint-ignored, so no ignore edit was needed.
- **Rename:** `e2e` → `test:e2e` in `package.json`, and the six live references updated with single-token substitutions (ci.yml run step, README quickstart, CLAUDE.md Testing bullet, tasknote README E2E line, eslint ignore comment). `just e2e` is unchanged because it calls `npx playwright test` directly.
- **Refactor:** none.
- **Pre-fix repro, recorded honestly:** a run on the *old* config (no `gracefulShutdown`) also left zero `next` processes on this machine (`pgrep -fl 'next|3009'` → exit 1). The orphan class the PLAN line cites did not reproduce here, likely because Next's turbopack dev tree exits when its parent's stdio closes. So `gracefulShutdown` is adopted as fleet-spine hardening, not as a fix for a stray observed in this repo.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation — N/A: no rendered UI changed (test-harness config + docs)

External review (`/code-review medium`, working-tree diff) — 5 findings, 0 blockers:

1. **note, filed → [[TEST-011]]**: in CI the html reporter writes `playwright-report/` but the e2e job never uploads it. Keeping html in CI was the operator's choice; adding an `upload-artifact` step changes CI, so it is out of scope here and parked.
2. **note, fixed**: the `gracefulShutdown` comment claimed SIGKILL orphans Next's children. Playwright kills the detached process group, and the pre-fix run reproduced no orphan, so the comment was reworded to cite the fleet spine (NAT-186.3) and say no orphan reproduced here.
3. **note, fixed**: the Acceptance stale-ref grep searched `.git/` and skipped `.flaitron/PLAN.md`. Re-verified with `git grep` over tracked files (receipt above).
4. **note, no change**: the 2-worker local cap is the machine-specific spine doctrine (M3 Air thermals) the PLAN line asks for. `--workers` overrides it per run.
5. **note, no change**: `fullyParallel: true` with serial CI predates this diff (CI was already `workers: 1`). Outside this task's scope.

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Verification receipt (HEAD 970066d + working tree):

- `grep -q 'gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 }' playwright.config.ts` → 0
- `grep -q 'workers: process.env.CI ? 1 : 2' playwright.config.ts` → 0 (run log: "Running 10 tests using 2 workers")
- `grep -q '"html", { open: "never" }' playwright.config.ts` → 0 (`playwright-report/` written, ignored, the run did not block)
- `grep -q '"test:e2e"…' package.json && ! grep -rn 'run e2e' … && ! grep -n 'run e2e' .flaitron/tasknote/README.md` → 0. Re-verified after review with the tighter `git grep -n 'run e2e' -- ':!.flaitron/tasknote/archive' ':!.flaitron/tasknote/TEST-010.md'` → 1 (no match; tracked files only, PLAN.md included)
- `npm run test:e2e` → 0 (10 passed, 8.0s)
- `pgrep -fl 'next|3009'` before → 1 (none); `pgrep -fl 'next'` 3s after `npm run test:e2e` exits → 1 (none). Zero orphans before and after the change (see the Implementation Notes repro).
- `npm test` → 0 (668 passed); `npm run lint` → 0; `npm run typecheck` → 0
- Post-review (comment reword only): `npm run lint` → 0, `npm run typecheck` → 0
- Structural: no dead code (the replaced CI-only workers spread is gone, not left alongside); no public-surface growth beyond the renamed script; code-facing docs naming the script are updated.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

Doc-drift sweep (`.flaitron/tasknote/README.md` §"AI-referenced docs"):
- `README.md`: updated (quickstart `npm run test:e2e`)
- `AGENTS.md`: no change (no e2e mention)
- `CLAUDE.md`: updated (Testing bullet names `npm run test:e2e`)
- `.flaitron/PLAN.md`: TEST-010 flipped; TEST-011 filed (341a3b9)
- `VISION.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md`: no change (no e2e/Playwright mention)
- Also: the tasknote README quick-commands E2E line was updated.

Recap: `playwright.config.ts` now matches the natabula Playwright spine: `gracefulShutdown` SIGTERM/5s on the webServer, `workers: CI ? 1 : 2`, and `[[CI ? github : list], [html, open: never]]`. The npm script is renamed `e2e` → `test:e2e` and all six live references (ci.yml, README, CLAUDE.md, tasknote README, eslint comment, package.json) are updated. `npm run test:e2e` → 10 passed on 2 workers with zero `next` processes before and after. Unit (668), lint and typecheck are all 0. No refactor. Honest caveat: the orphan did not reproduce on the old config here, so the shutdown change is fleet-spine hardening. `touches:` reconciliation: the declared 7 paths match `git diff --name-only` exactly, plus this tasknote. Maintainability: the config is now reviewable against the fleet spine, and `playwright-report/` gives a browsable local failure report without blocking the terminal.

Learnings: N/A. The `test:e2e` name already reaches the always-loaded layer through the CLAUDE.md edit.

**Archived:** 2026-10-07
