---
title: playwright-exact-pin
status: completed
tags: []
created: 2026-09-24
due:
related-tasks: []
touches:
  - package.json
  - package-lock.json
---

# TEST-009 | playwright-exact-pin

[← PLAN.md](../../PLAN.md) · ✅ Done

## 🎯 Goal

Pin `@playwright/test` to an exact version so `npm install` cannot move the browser revision the e2e suite runs against.

## ✅ Acceptance

- [x] `package.json` `devDependencies["@playwright/test"]` is an exact `x.y.z` with no range operator — `node -e "const v=require('./package.json').devDependencies['@playwright/test']; if(!/^[0-9]+\\.[0-9]+\\.[0-9]+$/.test(v)) process.exit(1)"`
- [x] That exact version equals the lockfile's resolved `node_modules/@playwright/test` version (`1.63.0`) — `node -e "const fs=require('fs'); const v=require('./package.json').devDependencies['@playwright/test']; const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')); const resolved=lock.packages['node_modules/@playwright/test'].version; const spec=lock.packages[''].devDependencies['@playwright/test']; if(v!=='1.63.0'||resolved!==v||spec!==v) process.exit(1)"`

## 🧩 Subtasks

- [x] Set `package.json` `@playwright/test` to `1.63.0`
- [x] Set the lockfile root `devDependencies["@playwright/test"]` spec to the same exact version, leaving the already-resolved 1.63.0 tarball in place
- [x] Run the two Acceptance commands and the repo validation set

## 🔗 Related

- [[TEST-007.2]] — introduced `@playwright/test` `^1.63.0` with the Playwright harness (archive/test)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The caret is still on the direct devDependency and the lock root spec. The resolved tarball is already `1.63.0`. Pinning that exact version is the PLAN line's "deliberate, reviewed bump"; moving the tree to the fleet's `1.62.1` would change the browser the suite runs against, which is the failure this task exists to stop.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

README archive table maps `TEST-*` → `archive/test/` (21 notes present). Path grep for `playwright` / `1.63` hits TEST-007.2 (deposited `@playwright/test` `^1.63.0`, port 3009, chromium-only), TEST-007.3/.4, TEST-007.N, TEST-008. No note requires a downgrade. The caret the PLAN line cites is still at `package.json` devDependencies and `package-lock.json` `packages[""].devDependencies`; `node_modules/@playwright/test` resolves to `test-1.63.0.tgz`. Vitest's transitive `@playwright/test: ^1.51.1` is not the direct dep and stays.

Best practices: `N/A` — version-spec edit, no module boundary.

No clarifications needed (--fast). Assumption: pin `1.63.0` (installed and locked), not `1.62.1`. Do not edit the vitest transitive range, `playwright.config.ts`, or CI. `npm install` is unnecessary because the tarball is already the pinned version; the lock root spec is edited in place so `npm ci` stays consistent.

Drift: PLAN line matches current files. Priority Low. `[light]` on this model is over-tier; proceed. `## Completed` holds 76 rows (>60); rotation is an operator motion, not this task.

Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`react` and `react-dom` are already exact pins in `package.json`; `@playwright/test` now matches that shape. The lockfile root spec was updated to `1.63.0` and the resolved tarball URL was left as `test-1.63.0.tgz`. Vitest's transitive `^1.51.1` range was not touched. No refactor. No new test — the pin is a version string, checked by the Acceptance node commands.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

`--unattended` full validation set (justfile recipes):

- `just test` → 0 (32 files, 611 tests)
- `just lint` → 0
- `just typecheck` → 0

Acceptance:

- exact-spec node check → 0 (`spec 1.63.0`)
- lock-resolved equality node check → 0 (`v`, `resolved`, and root spec all `1.63.0`)

Quality: two version-string edits. No new duplication, dead code, or public surface. Docs that name Playwright (`README.md`, `CLAUDE.md`) name the install command, not the caret, so they stay accurate.

External review: `N/A` — the diff is the caret removed from one dependency in two files; nothing behavioral to grade.

Frontend visual confirmation: `N/A` — no rendered surface.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

`@playwright/test` is pinned to `1.63.0` in `package.json` and in the lockfile root spec. The resolved tarball was already that version, so the browser revision does not move. `just test` 611 passed, `just lint` and `just typecheck` exit 0. No refactor. Doc-drift: `README.md`, `AGENTS.md`, `CLAUDE.md`, `VISION.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md`, and `.flowtron/PLAN.md` (stub only) — no change except the PLAN stub. `touches:` is `package.json` and `package-lock.json`; the tasknote and PLAN.md are closure files. Learnings: `N/A`. No deferred operator step, so no follow-up filing. `unattended-candidates: none`.

**Archived:** 2026-09-24
