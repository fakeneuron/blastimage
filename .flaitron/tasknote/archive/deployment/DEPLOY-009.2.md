---
title: useworkspace-size-fossil
status: completed
tags: []
created: 2026-09-24
due:
related-tasks: [DEPLOY-EPIC-009, BI-049]
touches:
  - CLAUDE.md
---

# DEPLOY-009.2 | useworkspace-size-fossil

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-EPIC-009]]

## 🎯 Goal

Stop CLAUDE.md from stating a live line count for `lib/useWorkspace.ts`, while keeping the BI-049 decision that the hook stays whole.

## ✅ Acceptance

- [x] `CLAUDE.md` no longer states a live line count for `lib/useWorkspace.ts` — `! grep -q '1223 L' CLAUDE.md`
- [x] The BI-049 "stays whole" decision and the reopen-on-shape rule remain — `grep -q 'it stays whole' CLAUDE.md` and `grep -q 'not on line count' CLAUDE.md`

## 🧩 Subtasks

- [x] Measure `lib/useWorkspace.ts` and `lib/storage.ts` against the CLAUDE.md figures
- [x] Restate the module-layout bullet without present-tense size counts
- [x] Confirm no other live doc repeats `1223 L`

## 🔗 Related

- [[DEPLOY-EPIC-009]] — parent epic (upkeep-drift)
- [[BI-049]] — related-decision: surveyed the split and kept the hook whole

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `CLAUDE.md` still gives `useWorkspace.ts` as 1223 L. `wc -l` is 1253. `lib/storage.ts` is still 694 L, so the stated 1.76x ratio is also stale. The decision text is still the right guidance.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

README archive table maps `DEPLOY-*` to `archive/deployment/`. That folder holds prior DEPLOY notes; none of them own this paragraph. `BI-049` (archive/bi) is the decision source: keep `useWorkspace` whole. `BI-053.N` later rewrote the same sentence from 1167 L to 1223 L and left the hub survey unremeasured. Those archived sentences are historical measurements, not a second live claim.

`1223 L` appears only in `CLAUDE.md` among live docs. Present-tense companions in the same sentence (1.76x, 694 L, 26 of 33, 17 callers, ~80 of 820, 42-member) would rot the same way if only 1223 were refreshed — `storage.ts` is still 694, so 1253/694 is about 1.81x, not 1.76x. PLAN.md allows restating the decision without the hard count. That is the path taken.

Best practices: N/A — documentation sentence, no module boundary.

No clarifications needed (--fast). Assumption: drop every present-tense size figure in that sentence, keep the audit's disproven "2.7x" / "40-member" claims as history, and keep the hub, single-consumer, and reopen-on-shape rules.

Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Pattern: prior size refreshes (BI-053.N) edited the same CLAUDE.md sentence in place. This pass removes the live counts instead of writing 1253, so the next growth does not mint the same fossil.

No code refactor. Tests N/A — prose only.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Full validation set (unattended), all exit 0:

```text
just lint       → 0
just typecheck  → 0
just test       → 0
    Test Files  32 passed (32)
    Tests  611 passed (611)
```

Acceptance:

```text
! grep -q '1223 L' CLAUDE.md          → 0
grep -q 'it stays whole' CLAUDE.md    → 0
grep -q 'not on line count' CLAUDE.md → 0
```

Structural quality: one sentence in `CLAUDE.md`; no duplication, dead code, or new public surface. The stale live counts are the thing removed.

External review: N/A — a few sentences in one markdown file, no behavior to grade.

Frontend visual confirmation: N/A — no rendered surface.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

`CLAUDE.md`'s module-layout bullet no longer quotes a live line count for `lib/useWorkspace.ts`. BI-049's decision stays: the hook stays whole, and the split question reopens on a second consumer or a fragmented hub, not on line count. `wc -l` at close was 1253 for the hook and 694 for `lib/storage.ts`. Verified with `just lint`, `just typecheck`, and `just test` (611/611), plus the three Acceptance greps. No refactor. Doc-drift: `CLAUDE.md` updated; `README.md`, `AGENTS.md`, `VISION.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, and `docs/GROK-AGENT.md` unchanged; `.flowtron/PLAN.md` stubbed. Scope: `CLAUDE.md` matches declared `touches:` (PLAN.md and this tasknote are the closure writes). Maintainability: the next growth of the hook does not falsify the cold-start doc.

Learnings: N/A.

unattended-candidates: none

**Archived:** 2026-09-24
