---
title: setup-node-align
status: blocked
tags: []
created: 2026-10-08
due:
related-tasks:
  - DEPLOY-EPIC-010
touches:
  - .github/workflows/ci.yml
park-reason: drift — De-scope. ci.yml lines 32 and 141 both already pin actions/setup-node@v7, so the v6 pin the plan names is gone. Operator confirms closing the row.
---

# DEPLOY-010.3 | setup-node-align

[← PLAN.md](../PLAN.md) · ⏸ Blocked · 🔗 [[DEPLOY-EPIC-010]]

## 🎯 Goal

Align the Playwright e2e job's `actions/setup-node` pin with the main job's `@v7`.

## ✅ Acceptance

- [ ] Both `uses: actions/setup-node@` lines in `.github/workflows/ci.yml` are `@v7` — `grep -n 'actions/setup-node@' .github/workflows/ci.yml` shows only `@v7`
- [ ] No other setup-node major remains — `! grep -q 'actions/setup-node@v6' .github/workflows/ci.yml`

## 🧩 Subtasks

- [ ] Confirm the two pins (main job ~line 32, e2e job ~line 141)
- [ ] Bump the e2e pin from `@v6` to `@v7` if it still differs
- [ ] Leave node-version, cache, and cache-dependency-path as they are

## 🔗 Related

- [[DEPLOY-EPIC-010]] — parent epic (gates-green)
- [[DEPLOY-009.3]] — related-decision: merged Dependabot PR that moved setup-node 6→7

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** De-scope
  **Rationale:** The cited drift is already gone. Both jobs pin `actions/setup-node@v7`. There is nothing left to change.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  N/A — no edit. The two steps already share the same action pin, node 22, npm cache, and lockfile path.

- [x] **Archive skim** — skim `.flaitron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed (--fast). Assumption: "align to v7" means the `uses:` major only. Node 22 and the npm cache inputs stay. A De-scope does not rewrite PLAN.md under `--unattended`.

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

`archive/deployment/` is the README row for `DEPLOY-*`. Grep of that folder for `setup-node` hits DEPLOY-009.3, which merged the Dependabot PR that moved `actions/setup-node` 6→7. No `## 🌳 Fan-out` sibling `.1` exists (PLAN says discovery was supplied by audit-repo), so no `blocked-by` / `parallel-safe-with` echo.

Current `.github/workflows/ci.yml`:

- line 32, job `ci`: `uses: actions/setup-node@v7`
- line 141, job `e2e`: `uses: actions/setup-node@v7`

The PLAN line still says the e2e job pins `@v6` at line 141. The line number is right; the pin is not. Zero `setup-node@v6` remains. De-scope, not a second bump.

## 🛠️ Phase 2: Execution

- [ ] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [ ] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [ ] Implemented the minimal solution

- [ ] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Not started. Parked at the Phase 1→2 drift carve-out.

## 🧪 Phase 3: Testing & Linting

- [ ] Ran targeted test suite for changed code

- [ ] Ran lint/type-check on changed code

- [ ] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [ ] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [ ] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

## 🚀 Phase 4: Closure

- [ ] **Doc-drift sweep** — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [ ] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [ ] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [ ] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

**Archived:** YYYY-MM-DD
