---
title: just-e2e-inert-verb
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: []
# Optional planning keys — omit when absent (SPEC.md §Tasknote frontmatter).
# Omitted means undeclared, not "touches nothing" / "safe with everyone".
# touches:
#   - path/or/glob
# blocked-by:
#   - TASK-ID
# parallel-safe-with:
#   - TASK-ID
# supersedes:
#   - TASK-ID
---

# CORE-004 | just-e2e-inert-verb

[← PLAN.md](../PLAN.md) · 🟢 In progress

## 🎯 Goal

Make `just e2e` either state plainly that no Playwright config exists, or wire up a real e2e harness, instead of silently doing nothing.

## ✅ Acceptance

- [x] `just e2e` in blastimage (no Playwright config anywhere) prints a clear "no e2e config" message and exits 0, instead of invoking `npx playwright test` against a nonexistent config. Verified: `no Playwright config found — e2e not wired up for this repo`, exit 0.
- [x] The recipe's existing behavior (running `npx playwright test` from `frontend/` or repo root) is preserved for any fleet repo that *does* carry a Playwright config — both branches still run `npx playwright test` unchanged, now gated by an added `ls playwright.config.* >/dev/null 2>&1` presence check rather than removed or altered.

## 🧩 Subtasks

- [ ] Update the `e2e` recipe in `justfile` (lines 70-75) to check for a Playwright config file before invoking `npx playwright test`, falling through to the existing "no e2e tests" message otherwise.
- [ ] Run `just e2e` in blastimage to confirm it now reports the absence cleanly.

## 🔗 Related

None.

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Confirmed against current code — `justfile:70-75`'s `e2e` recipe still unconditionally runs `npx playwright test` (either `cd frontend &&` or at repo root) with no Playwright config anywhere in the tree. Task is still accurate and still open.

- [x] Read relevant source files — read `justfile` in full; confirmed no `frontend/` subdir (blastimage is root-level Next.js); grepped `package.json` for `playwright` (no hit); `find` for any `playwright*` config file anywhere in the repo (no hit).

- [x] **Best Practices Review** — the touched surface is a `justfile` recipe, not application code. Every other recipe (`setup`, `dev`, `test`, `lint`, `typecheck`, `build`) already follows the same shape: guard on `[ -d ... ]` / `[ -f ... ]`, then either run the tool or print a "nothing to do" message and fall through with exit 0 (see `test`'s `else echo "no tests"; fi` and `e2e`'s own existing `else echo "no e2e tests"; fi`). The fix extends that exact established pattern — add a config-presence guard to the two branches that currently skip straight to `npx playwright test` — rather than inventing a new shape. No refactor beyond the two guarded conditions; no duplication introduced.

- [x] **Archive skim** — `ls .flowtron/tasknote/archive/core/`: CORE-001.1 through .5, CORE-002, CORE-003. `grep -l justfile` → no hits. `grep -il "e2e\|playwright"` → CORE-001.1 and CORE-001.3, but both mentions are about the app's user-facing "e2e flow" (visual-confirmation language for a component-quality sweep), unrelated to the Playwright test-runner recipe. No prior tasknote touched this file or this concern.

- [x] **Drift check** — `justfile:70-75` line numbers and the "no Playwright config anywhere" claim both verified live against current code (see Read step above); nothing has moved. Cross-referenced `SPEC/scope-boundaries.md` §"Cross-repo edit remit": the `justfile` is a fleet-wide natabula deposit (per the user's global CLAUDE.md port registry / `natabula-layer-drift` skill description, `justfile` is one of the "base-stable" deposits diffed across repos), but this tasknote's deliverable lands in the repo whose session opened it (blastimage) — consistent with the scope-boundaries doctrine of filing cross-repo work in its own repo's cycle rather than editing another repo from here. No SPEC contract is contradicted; the PLAN.md line matches the plan being formed.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Explicit assumptions: (1) scope is the "state the absence" branch of the PLAN.md line's either/or, not depositing a full natabula Tier-2 Playwright harness — the latter is a multi-file, multi-decision effort out of proportion with the task's `[light]` tag; (2) the fix is scoped to blastimage's local copy of `justfile` only, per the cross-repo edit remit above — propagating the same fix to natabula's canonical copy (so future `natabula-layer-refresh` runs don't reintroduce the bug) is left as a follow-up for the operator to file in that repo, not done from this session.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:** See inline notes above. No blockers, no drift, no re-scope.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the existing guard-then-run-or-echo shape shared by every other recipe (`test`, `lint`, `build`, etc.) rather than introducing new structure. No duplication; no coupling introduced.

- [x] **Minimal refactor gate** — no refactor beyond the two changed `if`/`elif` conditions; nothing else in the file touched.

- [x] Implemented the minimal solution — `justfile`'s `e2e` recipe now guards both branches on the presence of a `playwright.config.*` file (via `ls ... >/dev/null 2>&1`, matching the shell-only style already used throughout the file) before invoking `npx playwright test`; falls through to a clearer "no Playwright config found" message otherwise. Recipe comment updated to match.

- [x] Updated/added tests for non-trivial behavior — N/A, this is a `justfile` shell recipe with no test harness in this repo; verified manually instead (see Testing Notes).

**Implementation Notes:** Changed `justfile:70-75` (`e2e` recipe) — 3 lines touched, 1 comment line touched. No other files changed.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A, no test harness covers `justfile` recipes in this repo. Verified manually instead: `just --version` (1.58.0, parses cleanly), `just --list` (shows the updated `e2e` recipe description), and `just e2e` (prints `no Playwright config found — e2e not wired up for this repo`, exits 0 — confirmed via `echo "exit: $?"`).

- [x] Ran lint/type-check on changed code — N/A, `justfile` is outside the eslint/tsc surface (`npm run lint` / `npm run typecheck` don't touch it).

- [x] **Quality assertions** — no duplication introduced (the guard pattern is copy-consistent with the file's existing recipes, not a new abstraction); no dead code; no added complexity beyond the one presence check per branch; no public-surface growth (same recipe name, same verb contract); documentation (the recipe's inline comment) updated to match the new behavior.

- [x] (frontend) Asked the user for visual confirmation — N/A, this change touches only a shell recipe in `justfile`; there is no rendered UI surface to confirm.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:** `just e2e` → `no Playwright config found — e2e not wired up for this repo`, exit 0. `just --list` shows the updated recipe description. Confirms the fix without touching application code.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: no change (doesn't document `just e2e`). `AGENTS.md`: no change. `CLAUDE.md`: no change. `.flowtron/PLAN.md`: flipped below (this task's own line).

- [x] Closed — both Acceptance criteria ticked and verified above. YAML `status:` flipped to `completed`. PLAN.md line to be flipped to `Completed 2026-09-09.` stub form, placed at the top of `## Completed` (standalone task). Tasknote to be moved to `.flowtron/tasknote/archive/core/CORE-004.md`.

- [x] **Evidence-based recap** drafted — see below.

**Final Summary:** `just e2e` silently ran `npx playwright test` with no Playwright config anywhere in blastimage, so the standardized verb did nothing useful and gave no signal why. Fixed by adding a `playwright.config.*` presence guard to both branches of the `justfile:70-75` `e2e` recipe (3 lines + 1 comment changed), following the same guard-then-run-or-echo pattern already used by every other recipe in the file. Verified manually: `just e2e` now prints `no Playwright config found — e2e not wired up for this repo` and exits 0; `just --list` and `just --version` confirm the file still parses cleanly. No test suite covers `justfile` in this repo, so no automated tests were added — the fix was verified by direct invocation. No app code, docs, or other files changed. Note for the operator: `justfile` is a natabula fleet-wide deposit (per the port-registry / `natabula-layer-drift` convention); this fix is scoped to blastimage's local copy only per flowtron's cross-repo edit remit — propagating the same fix to natabula's canonical `justfile` (so `natabula-layer-refresh` doesn't reintroduce the bug elsewhere) is left as a follow-up for the operator to file in that repo.

**Archived:** 2026-09-09
