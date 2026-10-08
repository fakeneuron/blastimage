---
title: readme-doctrine-pointer
status: completed
tags: []
created: 2026-10-08
due:
related-tasks:
  - DEPLOY-EPIC-010
touches:
  - README.md
---

# DEPLOY-010.4 | readme-doctrine-pointer

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-010]]

## 🎯 Goal

Point the README Docs list at `AGENTS.md` for coding standards and AI workflow, keeping `CLAUDE.md` as the Claude-only addendum.

## ✅ Acceptance

- [x] README Docs list links `AGENTS.md` for coding standards and AI workflow — `grep -qE '^- \[`AGENTS.md`\]\(AGENTS.md\) — coding standards and AI workflow' README.md`
- [x] `CLAUDE.md` is still listed, described as the Claude-only addendum — `grep -E '^- .*CLAUDE.md' README.md | grep -qi 'claude'`
- [x] No other README line changed — `git diff --numstat README.md` shows 1 added / 1 removed

## 🧩 Subtasks

- [x] Edit README.md:76 (replace the `CLAUDE.md` Docs bullet with an `AGENTS.md` bullet; add a `CLAUDE.md` addendum bullet)
- [x] Run Acceptance verify commands

## 🔗 Related

- [[DEPLOY-EPIC-010]] — parent epic

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `README.md:76` still lists `CLAUDE.md` as "coding standards and AI workflow"; `AGENTS.md` exists and is the SSOT (its header says `CLAUDE.md` is a thin Claude-only addendum). One-line doc fix.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flaitron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

- Read: README.md §Docs (line 76 matches the PLAN line), AGENTS.md header, `.flaitron/tasknote/README.md` §AI-referenced docs (already lists `AGENTS.md` and `CLAUDE.md` correctly — no change there).
- Best Practices: doc-only edit, `N/A`.
- Archive skim: `archive/deployment/` checked; no prior tasknote declares `touches: README.md`. No prior tasknotes in scope.
- Drift: none; PLAN line and README agree.
- No clarifications needed (assumes `AGENTS.md` replaces the `CLAUDE.md` bullet and `CLAUDE.md` stays as its own bullet labelled Claude-only addendum).
- Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

README.md:76 → `AGENTS.md` bullet ("coding standards and AI workflow") with an inline pointer naming `CLAUDE.md` as the Claude-only addendum. Pattern survey / refactor gate: single doc line, `N/A`. Tests: `N/A` (doc-only).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) N/A — Markdown-only change, no UI

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- Targeted tests / lint / type-check: `N/A` — Markdown-only change.
- `grep -qE '^- \[`AGENTS.md`\]\(AGENTS.md\) — coding standards and AI workflow' README.md` → 0
- `grep -E '^- .*CLAUDE.md' README.md | grep -qi 'claude'` → 0
- `git diff --numstat README.md` → `1	1	README.md`; `git diff --name-only` → README.md only.
- Structural assertions: no code touched; N/A.
- External review (`/code-review medium`, scoped to this diff): no finding against this task's diff or Acceptance → no blockers. Notes, all out of scope and left for the operator: (a) PLAN row DEPLOY-010.3 is still open/`[unattended]` while its tasknote is parked on a drift De-scope — needs the operator's close; (b) DEPLOY-010.N carries `[unattended]` while 010.3/010.5 need an operator; (c) other findings concern the DEPLOY-010.2 advisory bump (`eslint-config-next` skew, lockfile-only floors) — not this task. The README-vs-PLAN-flip finding is resolved by the atomic closure commit.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

- Doc-drift sweep: `README.md` updated (Docs list now points at `AGENTS.md`); `AGENTS.md`, `CLAUDE.md`, `.flaitron/PLAN.md`, `VISION.md`, `docs/*` — no change.
- Recap: 1 file, 1 line changed (`README.md:76`); verification: the three Acceptance commands → exit 0; `touches:` scope reconciliation: `git diff --name-only` = README.md, matches declared. Effect: README no longer misdirects readers to `CLAUDE.md` for doctrine.
- Learnings: N/A.

**Archived:** 2026-10-08
