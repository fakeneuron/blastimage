---
title: e2e-dev-coexistence
status: completed
tags: [e2e, tooling]
created: 2026-09-24
due:
related-tasks: [DEPLOY-EPIC-008, CORE-002, TEST-007.2, BI-058.2]
touches:
  - next.config.ts
  - playwright.config.ts
  - tsconfig.json
  - .gitignore
  - eslint.config.mjs
  - CLAUDE.md
  - .flowtron/tasknote/README.md
---

# DEPLOY-008.3 | e2e-dev-coexistence

[← PLAN.md](../../../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-008]] · [[CORE-002]]

## 🎯 Goal

Let `npm run e2e` / `just e2e` run while `just dev` is up. Today Playwright's own `next dev` shares `.next/` with the operator's dev server, so Next 16 refuses to start it.

## ✅ Acceptance

- [x] `npm run e2e` passes while `npm run dev` is live on :3003 — `npm run e2e` → exit 0 with the :3003 dev server running
- [x] The e2e server writes a separate `distDir` (`.next-e2e/`), and plain `dev` / `build` / `build:verify` are unchanged — `grep` on `next.config.ts` plus `ls .next-e2e`
- [x] `.next-e2e/` is git-ignored and lint-ignored, and the tree is clean after an e2e run — `git status --porcelain` shows only intended diffs; `npm run lint` → 0
- [x] Type-check still passes with Next's auto-added `tsconfig` include entries — `npm run typecheck` → 0

## 🧩 Subtasks

- [x] Add an env-gated `distDir: ".next-e2e"` to `next.config.ts`, following the `NEXT_VERIFY_BUILD` pattern
- [x] Set that env var on the Playwright `webServer` (via `env`) and update the config's header comment
- [x] Add `.next-e2e/` to `.gitignore` and the eslint ignores
- [x] Run e2e with dev live; keep Next's `tsconfig` include additions in the repo's compact one-line array style
- [x] Verify: e2e, lint, typecheck, `git status`

## 🔗 Related

- [[DEPLOY-EPIC-008]] — parent epic
- [[CORE-002]] — `related-decision:` established the env-gated `distDir` pattern (`.next-verify`) this task extends
- [[BI-058.2]] — just changed the same webServer command (`-H 127.0.0.1`); it records that e2e dies when another Next dev holds the lock

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Reproduced today during audit-repo: `npm run e2e` with `just dev` up exits 1 with "You can access the existing server at http://localhost:3003". Nothing has fixed it since.

- [x] Read relevant source files — `playwright.config.ts` (webServer `npx next dev --turbopack -H 127.0.0.1 -p 3009`, `reuseExistingServer: false`), `next.config.ts` (`NEXT_VERIFY_BUILD` → `.next-verify`), `tsconfig.json` include (already carries Next-added `.next-verify/types` and `.next-verify/dev/types` entries), `.gitignore` (`.next/`, `.next-verify/`), `eslint.config.mjs:57-61` (ignores both distDirs)

- [x] **Best Practices Review** — the one responsibility is the build-output location, owned by `next.config.ts`. Extend its existing env-gated conditional rather than adding a new mechanism. `playwright.config.ts` should only pass the flag. No duplication beyond one more parallel conditional; merging into a generic `NEXT_DIST_DIR` would be speculative.

- [x] **Archive skim** — CORE-002: same root cause (shared default `distDir`) and same fix shape. Its load-bearing note: Next auto-patches `tsconfig.json` `include` when it sees a new distDir and expands the arrays onto multiple lines; CORE-002 kept the semantic entry and restored the compact style, and this task does the same. BI-058.2: e2e dying on the dev lock was recorded and left unchanged, and the `-H 127.0.0.1` bind stays. TEST-007.2: port split 3003/3009 and `reuseExistingServer: false` are deliberate and stay.

- [x] **Drift check** — the PLAN line matches current code (webServer is `next dev`, same dir, no distDir override). The command already carries BI-058.2's `-H 127.0.0.1`; that's not drift, just newer. No SPEC contract applies to build tooling.

- [x] No clarifications needed. Assumptions: env var `NEXT_E2E_BUILD`, parallel to `NEXT_VERIFY_BUILD`; dir `.next-e2e/`; Playwright's `webServer.env` merges over `process.env`; CI behavior is otherwise unchanged (CI has no competing dev server).

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

Root cause: Next 16 takes a per-`distDir` dev lock (`.next/dev/…`). Two `next dev` processes in one project directory with the default `distDir` collide regardless of port. A distinct `distDir` gives the e2e server its own lock. Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Pattern survey: this extends CORE-002's env-gated `distDir` conditional in `next.config.ts` with a sibling line: `NEXT_E2E_BUILD` → `.next-e2e`. `playwright.config.ts` only passes `env: { NEXT_E2E_BUILD: "1" }` on `webServer`, and Playwright merges that over `process.env`. The header comment's claim that e2e can run while `just dev` is up is replaced with the actual mechanism. `.next-e2e/` is added to `.gitignore` and the eslint ignores, and each existing comment now lists all three dirs. A generic `NEXT_DIST_DIR` was skipped as speculative. No refactor. No unit test: this is process configuration, and the e2e run beside a live dev server is the test.

Next's first run rewrote `tsconfig.json`: it added the `.next-e2e/types` and `.next-e2e/dev/types` include entries and expanded every array onto multiple lines. As in CORE-002, I kept the two entries and restored the compact style. A second e2e run left the file untouched.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] N/A (no frontend change — config only) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- `npm run e2e` with `npm run dev` live on :3003 (PID 40571) → exit 0, 10 passed (27.3s). The :3003 listener was the same PID afterwards. Before the change the same command exited 1 ("You can access the existing server at http://localhost:3003").
- Second `npm run e2e` after compacting `tsconfig.json` → exit 0, 10 passed; `git diff --stat tsconfig.json` showed only the one intended line.
- `ls -d .next-e2e` → present; `grep` shows `next.config.ts` only sets `distDir` under `NEXT_VERIFY_BUILD` / `NEXT_E2E_BUILD`, so plain `dev` and `build` are unchanged.
- `npm run lint` → 0; `npm run typecheck` → 0; `npm test` → 611/611.
- `git status --porcelain` after the runs → only the intended edits; `.next-e2e/` is ignored.
- Structural: no duplication beyond the one parallel conditional, no dead code, no public-surface growth; code-facing comments updated (playwright header, eslint ignore comment).
- External review (`/code-review medium`, forked context, working-tree diff): no findings. One note: `tsconfig` now includes `.next-e2e/` generated types, so a stale dir from an older checkout could fail type-check until the next e2e run. Disposition: note, not filed — `.next-verify` has the same pre-existing risk, and neither has bitten.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

The Playwright server now builds into its own `.next-e2e/` folder, so `npm run e2e` / `just e2e` runs while `just dev` is up. Before this, Next 16's one-dev-server-per-`distDir` lock refused it. Changes: `next.config.ts` +3, `playwright.config.ts` +5/−2, `eslint.config.mjs` +5/−3, `.gitignore` +1, `tsconfig.json` 1 line (two Next-added include entries), `CLAUDE.md` and `.flowtron/tasknote/README.md` 1 line each. Verified with e2e 10/10 beside a live dev server, lint 0, typecheck 0, 611/611 unit tests; external review clean. Scope: `git diff --name-only` matches the declared `touches:` exactly (the two doc files were added to `touches:` during Phase 4). Maintainability: the documented "e2e alongside dev" invariant is now true, not just claimed.

Doc-drift sweep: `README.md` no change (its claim that `just dev` can stay up is now accurate). `AGENTS.md` no change. `CLAUDE.md` Dev-port line now names the `.next-e2e/` distDir as the reason. `.flowtron/PLAN.md` this row flipped to stub, nested under DEPLOY-EPIC-008. `VISION.md` no change. `docs/ADOPT.md` no change (adopters don't run e2e). `.flowtron/tasknote/README.md` quick-commands E2E line updated.

Learnings: N/A — the CLAUDE.md line now carries the one-dev-server-per-`distDir` fact.

**Archived:** 2026-09-24
