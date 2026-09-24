---
title: upkeep-drift audit
status: completed
tags: []
created: 2026-09-24
due:
related-tasks: [DEPLOY-EPIC-009, DEPLOY-009.2, DEPLOY-009.3]
---

# DEPLOY-009.N | upkeep-drift audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-EPIC-009]]

## 🎯 Goal

Verify the completed `DEPLOY-EPIC-009` (`upkeep-drift`) cohort sits coherently in the codebase: cumulative doc-drift sweep across `.flowtron/tasknote/README.md` §"AI-referenced docs", naming/style consistency across the cohort's deliverables, and follow-up filings for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces
- [x] Audit findings recorded in Implementation Notes; misses cited as candidates for `/ft-file-followup <NEW-ID>` filing (filed AFTER audit closure to preserve `/ft-file-followup`'s filing-discipline gate) — no misses found
- [x] Single `feat: DEPLOY-009.N — audit DEPLOY-EPIC-009` (or `chore: ...` if no code edits land) commit lands — no code edits landed by this audit; will commit as `chore:`
- [x] PLAN.md line for `DEPLOY-009.N` flipped to stub form `Completed YYYY-MM-DD.`
- [x] Tasknote moved to `.flowtron/tasknote/archive/deployment/DEPLOY-009.N.md`
- [x] Parent-flip prompt surfaced after audit closure (skill Step 8) — all cohort children closed; eligible, prompt bundled into the 📦 gate

## 🧩 Subtasks

- [ ] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [ ] Walk `.flowtron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [ ] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [ ] Surface audit findings in Implementation Notes; cite each miss as a `/ft-file-followup <NEW-ID>` candidate
- [ ] Phase 4: flip `DEPLOY-009.N` PLAN line to stub form + archive tasknote
- [ ] Parent-flip: skill Step 8 prompts user; on confirm, atomic flip parent line + move cohort to `## Completed`

## 🔗 Related

- [[DEPLOY-EPIC-009]] — parent epic (upkeep-drift)
- [[DEPLOY-009.2]] — cohort child: useworkspace-size-fossil
- [[DEPLOY-009.3]] — cohort child: dependabot-backlog-triage

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Both implementation children (`DEPLOY-009.2`, `DEPLOY-009.3`) are closed and archived; no open siblings. This is the epic's terminal `.N` audit child.

- [x] Read relevant source files — read both archived cohort tasknotes in full (`archive/deployment/DEPLOY-009.2.md`, `archive/deployment/DEPLOY-009.3.md`)

- [x] **Best Practices Review** — N/A: audit subtask, no module-boundary work of its own; cohort children's deliverables (a doc-prose edit, a YAML config block) are each single-file, no dependency-boundary questions.

- [x] **Archive skim** — `archive/deployment/` cohort siblings `DEPLOY-009.2.md` (CLAUDE.md size-fossil fix) and `DEPLOY-009.3.md` (dependabot backlog triage + `@types/node` ignore block) read in full above; no other archive notes own this epic's scope.

- [x] **Drift check** — re-verified both deliverables against HEAD: `CLAUDE.md` no longer contains `1223 L` (grep count 0), still carries "it stays whole" and "not on line count"; `.github/dependabot.yml`'s `@types/node` ignore block is present with its comment now pointing at `.flowtron/tasknote/archive/deployment/DEPLOY-009.3.md`, which exists (self-resolved as the sibling tasknote anticipated). No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed. No open siblings, no ambiguity in cohort scope.

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable) — no file deliverable expected beyond PLAN.md/tasknote closure writes; `touches:` omitted.

**Discovery Notes:**

Cohort: `DEPLOY-EPIC-009` (upkeep-drift), filed directly by `ft-audit-repo` 2026-09-24 (no `.1` Discovery subtask — Discovery was supplied by the audit-repo pass itself, per the epic line's description). Two implementation children:

- `DEPLOY-009.2` (useworkspace-size-fossil) — removed the live `1223 L` line-count fossil from `CLAUDE.md`'s module-layout bullet for `lib/useWorkspace.ts`, keeping the BI-049 "stays whole" decision and reopen-on-shape rule intact. `touches: CLAUDE.md`.
- `DEPLOY-009.3` (dependabot-backlog-triage) — merged PRs #1, #2, #13; closed #7 (`@types/node` major bump, incompatible with pinned `engines.node`); added an `@types/node` major-ignore block to `.github/dependabot.yml` matching the existing eslint/typescript shape. `touches: .github/dependabot.yml`.

Both are single-file, unrelated surfaces (doc prose vs. CI config) — no naming/style overlap to reconcile, no contradictory cross-refs between them.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — N/A: verification-only pass, no new code surface.

- [x] **Minimal refactor gate** — N/A: no fixes required.

- [x] Implemented the minimal solution — cohort coherence inventory walked (see notes); no inline fixes needed.

- [x] Updated/added tests for non-trivial behavior — N/A: no code changed.

**Implementation Notes:**

Cohort children inventoried:

- `DEPLOY-009.2` — `CLAUDE.md` module-layout bullet restated without live line counts; BI-049 decision text intact. Verified at HEAD: no `1223 L`, "stays whole" and "not on line count" both present.
- `DEPLOY-009.3` — Dependabot backlog cleared (3 PRs merged, 1 closed); `.github/dependabot.yml` carries a new `@types/node` major-ignore block, same shape as the existing `eslint`/`typescript` blocks. Verified at HEAD: block present, its archive-path comment now resolves (the referenced tasknote exists post-archival).

Coherence findings: no inconsistencies surfaced. The two deliverables touch unrelated files (a prose doc, a CI config block) with no naming or style overlap to reconcile, and neither introduces a cross-reference to the other. No regressions surfaced in either earlier-shipped surface. No inline fixes applied. No misses to log for `/ft-file-followup`.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A: no code changed, verification-only audit.

- [x] Ran lint/type-check on changed code — N/A: no code changed.

- [x] **Verification receipt** — recorded below (grep/verify commands only; no code changed to grade for duplication/dead code/complexity).

- [x] **External review** — N/A: no diff produced by this audit to grade; the audit itself is the review pass over the cohort's already-reviewed deliverables.

- [x] (frontend) Asked the user for visual confirmation — N/A: no rendered surface.

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Verification receipt:

```text
grep -c '1223 L' CLAUDE.md                          → 0  exit 0
grep -q 'it stays whole' CLAUDE.md                   → exit 0
grep -q 'not on line count' CLAUDE.md                → exit 0
grep -A15 '@types/node' .github/dependabot.yml       → exit 0 (block present, archive-path comment resolves)
grep -rn '1223|1.76x|2.7x|40-member' README.md AGENTS.md VISION.md docs/*.md → exit 1 (no matches — clean)
git status --porcelain                               → empty (clean tree)
```

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  - `README.md` — no change
  - `AGENTS.md` — no change
  - `CLAUDE.md` — no change (already updated by `DEPLOY-009.2`; verified still current at HEAD)
  - `.flowtron/PLAN.md` — updated (this task's line stubbed at closure)
  - `VISION.md` — no change
  - `docs/ADOPT.md` — no change
  - `docs/WORKFLOW.md` — no change
  - `docs/REVIEW-LOOP.md` — no change
  - `docs/GROK-AGENT.md` — no change

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated, YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form, tasknote to be moved to `.flowtron/tasknote/archive/deployment/`

- [x] **Evidence-based recap** drafted — see Final Summary below

- [x] **Learnings** — N/A: routine cohort audit, no new pattern for the always-loaded layer to carry.

**Final Summary:**

Audited `DEPLOY-EPIC-009` (upkeep-drift): both implementation children — `DEPLOY-009.2` (removed the `1223 L` line-count fossil from `CLAUDE.md`'s `useWorkspace.ts` bullet, kept the BI-049 "stays whole" decision) and `DEPLOY-009.3` (cleared the Dependabot PR backlog; added an `@types/node` major-ignore block to `.github/dependabot.yml`) — verified still intact and drift-free at HEAD. No inconsistencies between the two deliverables (unrelated files, no naming/style overlap). The `@types/node` ignore block's archive-path comment, which pointed at a not-yet-archived tasknote when `DEPLOY-009.3` closed, now resolves correctly. Doc-drift sweep: no live doc besides `CLAUDE.md` (already current) and `.flowtron/PLAN.md` (this closure) needs an update. No misses found; no `/ft-file-followup` filings needed. No code changed by this audit — verification-only pass, receipts above.

Learnings: N/A.

Parent-flip: operator confirmed Yes (all three cohort children closed). `DEPLOY-EPIC-009` flipped to stub form and moved with its nested children (`DEPLOY-009.2`, `.3`, `.N`) to the top of `## Completed`.

unattended-candidates: none

**Archived:** 2026-09-24
