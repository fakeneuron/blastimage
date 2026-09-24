---
title: verification-gate-reach audit
status: completed
tags: []
created: 2026-09-24
due:
related-tasks: [DEPLOY-EPIC-008, DEPLOY-008.2, DEPLOY-008.3]
---

# DEPLOY-008.N | verification-gate-reach audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-EPIC-008]]

## 🎯 Goal

Verify the completed `DEPLOY-EPIC-008` (`verification-gate-reach`) cohort sits coherently in the codebase: cumulative doc-drift sweep across `.flowtron/tasknote/README.md` §"AI-referenced docs", naming/style consistency across the cohort's deliverables, and follow-up filings for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces
- [x] Audit findings recorded in Implementation Notes; misses cited as candidates for `/ft-file-followup <NEW-ID>` filing (filed AFTER audit closure to preserve `/ft-file-followup`'s filing-discipline gate) — no follow-up candidates; Finding 1 is discharged by a push, not a filing
- [x] Single `feat: DEPLOY-008.N — audit DEPLOY-EPIC-008` (or `chore: ...` if no code edits land) commit lands — `chore:`, no code edits
- [x] PLAN.md line for `DEPLOY-008.N` flipped to stub form `Completed 2026-09-24.`
- [x] Tasknote moved to `.flowtron/tasknote/archive/deployment/DEPLOY-008.N.md`
- [x] Parent-flip prompt surfaced after audit closure (skill Step 8) — user confirms or declines flipping `DEPLOY-EPIC-008` to `Completed` and moving the cohort to `## Completed`

## 🧩 Subtasks

- [x] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [x] Walk `.flowtron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [x] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [x] Surface audit findings in Implementation Notes; cite each miss as a `/ft-file-followup <NEW-ID>` candidate
- [x] Phase 4: flip `DEPLOY-008.N` PLAN line to stub form + archive tasknote
- [x] Parent-flip: skill Step 8 prompts user; on confirm, atomic flip parent line + move cohort to `## Completed`

## 🔗 Related

- [[DEPLOY-EPIC-008]] — parent epic (verification-gate-reach)
- [[DEPLOY-008.2]] — cohort child: push-backlog-ci-verify
- [[DEPLOY-008.3]] — cohort child: e2e-dev-coexistence
- [[DEPLOY-007.N]] — prior audit of the same shape; its Finding 1 (unpushed tip) recurs here

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The operator invoked `/ft-close-epic DEPLOY-008.N`; pre-flight passed (tree clean, `.N` is the canonical audit child, both implementation children `.2` and `.3` are `[x]`, both closed 2026-09-24). Full cohort, no early-audit decision.

- [x] Read relevant source files — both cohort tasknotes in full (`archive/deployment/DEPLOY-008.2.md`, `DEPLOY-008.3.md`), plus `next.config.ts`, `playwright.config.ts`, `tsconfig.json`, `.gitignore`, `eslint.config.mjs`, `.github/workflows/ci.yml` (e2e job), `README.md`, `CLAUDE.md`, and the tasknote README quick-commands.

- [x] **Best Practices Review** — `N/A` — an epic audit verifies shipped deliverables; it touches no module boundary or abstraction.

- [x] **Archive skim** — self-referential for the cohort; widened to [[DEPLOY-007.N]], the audit of the previous verification epic, whose Finding 1 (tip of `main` not CI-verified) is the same failure found here.

- [x] **Drift check** — every path `.3` cited matches HEAD: `next.config.ts:13` (`NEXT_E2E_BUILD` → `.next-e2e`), `playwright.config.ts:36` (`env: { NEXT_E2E_BUILD: "1" }`), `tsconfig.json:27` (compact include with both `.next-e2e` entries), `.gitignore:11`, `eslint.config.mjs:63`. One live drift, recorded as Finding 1: `git rev-list --count origin/main..main` → **6**; `origin/main` is still `4db271f`, the tip `.2` verified.

- [x] No clarifications needed. Assumption, carried from DEPLOY-007.N: the epic's goal "CI … actually run against current main" means the tip of `origin/main` carries a green run, not that a push happened once.

- [x] Subtasks above populated with concrete, ordered steps (no file deliverable; `touches:` omitted)

**Discovery Notes:**

| Child | Shortname | Deliverable |
|---|---|---|
| [[DEPLOY-008.2]] | `push-backlog-ci-verify` | Operator pushed `24f912e..4db271f` (51 commits). CI run `36035333798` green on all three jobs (ci, gitleaks, e2e 10/10); changed-line coverage 86%. No source changed. |
| [[DEPLOY-008.3]] | `e2e-dev-coexistence` | Env-gated `distDir: ".next-e2e"` in `next.config.ts`, set by Playwright's `webServer.env`, so e2e runs beside `just dev`. Plus ignores (`.gitignore`, eslint), two `tsconfig` include entries, and doc lines in `CLAUDE.md` and the tasknote README. |

Unpushed at audit time (6): `f36c122` (008.2 closure), `9307f36` (**008.3 — config change**), `8b69db1`, `ec3b9f1`, `51844f8`, `14bda3b` (BI-059 filing, BI-058.3, DEPLOY-009.2, BI-058.N — docs/PLAN only).

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — `N/A` for the audit itself. Followed [[DEPLOY-007.N]]: re-run the cohort's gates on HEAD rather than trusting the children's records.

- [x] **Minimal refactor gate** — no refactor; nothing in the tree was edited.

- [x] Implemented the minimal solution — verification only. The one finding's remedy is `git push`, which is outward-facing, so it is escalated to the 📦 gate rather than run inline.

- [x] Updated/added tests for non-trivial behavior — `N/A`; no behavior changed.

**Implementation Notes:**

### Finding 1 — CI has never run DEPLOY-008.3 (discharged at the 📦 gate by a push)

`main` is 6 ahead of `origin`. Unlike DEPLOY-007.N's one-commit gap (PLAN plus a tasknote), this gap has real config in it. `9307f36` changes how the CI `e2e` job builds: Playwright's `webServer` now sets `NEXT_E2E_BUILD=1`, so CI's Next server writes `.next-e2e/` instead of `.next/`. `.3` verified this locally only (10/10 beside a live dev server). Its Discovery assumed "CI behavior is otherwise unchanged", which is plausible (CI has no competing server, and `ci.yml` caches nothing under `.next*`) but unverified. The epic's name is *verification-gate-reach*, so leaving its last code change outside CI would defeat it.

This is the second audit in a row with this finding (after DEPLOY-007.N). The pattern: the closing child verifies CI, then the closure commits pile up behind it. The remedy is the same too: this audit's own closure commit needs to be pushed anyway, and that push carries all 6 commits with it. Not filed as a child; it's a `git push` plus watching one CI run.

### Cohort coherence — no inconsistencies

1. **No `.1` Discovery child.** Correct: the parent line carries "Discovery supplied by audit-repo 2026-09-24", as `/ft-audit-repo` prescribes. Same as DEPLOY-EPIC-007.
2. **Nav chips.** `.2` and `.3` read `✅ Completed`, while DEPLOY-007's cohort kept `🟢 In progress`. Both are harmless: the chip is derived from YAML `status:` (CORE-042.4), and both children have `status: completed`. This note follows the template.
3. **`.2` has no Acceptance / phase checklist; `.3` has the full 4-phase shape.** `.2` was a no-deliverable push task and used a compact note. It's a style difference, not a contradiction; nothing to fix.
4. **Cross-refs agree.** `.2`'s recap hands off "local e2e alongside `just dev` is still broken (DEPLOY-008.3)"; `.3` fixes exactly that, and README/CLAUDE.md/tasknote README/`playwright.config.ts` header all now state the same invariant (`.next-e2e/`, port 3009, dev can stay up). `ci.yml:129-131`'s comment ("`just dev` on 3003 is unrelated") is still accurate and doesn't need to mention the distDir.

No follow-up candidates.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — no code changed; ran the full suite and e2e as the regression check.

- [x] Ran lint/type-check on changed code — whole tree.

- [x] **Verification receipt** — `N/A` for quality assertions (markdown-only diff); gate results below.

- [x] **External review** — `N/A` — the audit's diff is a tasknote plus PLAN.md lines, with no code to grade.

- [x] `N/A` (no frontend change) Asked the user for visual confirmation

**Testing Notes:**

Run on audit HEAD `14bda3b`:

- `npm run typecheck` → 0
- `npm run lint` → 0
- `npm test` → 32 files, 611/611 passed (matches `.3`'s 611)
- `npm run e2e` with the operator's `npm run dev` live on :3003 (PID 40571) → 10/10 passed (25.3s); `.3`'s fix still holds
- `git status --porcelain` after the runs → clean

`npm run build` was not re-run: the unit, e2e, and typecheck runs cover `.3`'s config surface, and CI's `ci` job will build it once Finding 1's push lands.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  | Doc | Verdict |
  |---|---|
  | `README.md` | no change — `:12` "Playwright on :3009 (`just dev` on :3003 can stay up)" is now true; `:30-31` e2e-job description still accurate |
  | `AGENTS.md` | no change — no e2e/CI/distDir claim |
  | `CLAUDE.md` | no change — `:13` Dev-port line already names `.next-e2e/` (updated by `.3`) |
  | `.flowtron/PLAN.md` | updated — `DEPLOY-008.N` stubbed; parent flip + cohort move per the 📦 decision |
  | `VISION.md` | no change |
  | `docs/ADOPT.md` | no change — adopters don't run blastimage's e2e |
  | `docs/WORKFLOW.md` | no change |
  | `docs/REVIEW-LOOP.md` | no change |
  | `docs/GROK-AGENT.md` | no change |

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form nested under its parent, tasknote moved to `.flowtron/tasknote/archive/deployment/`

- [x] **Evidence-based recap** drafted — surfaces at the 📦 ready-to-commit gate

- [x] **Learnings** — `N/A` — Finding 1 is a repeat of DEPLOY-007.N, and its fix is procedural (push at the audit's gate), not something the always-loaded layer should carry.

**Final Summary:**

The `verification-gate-reach` cohort is coherent, and both children's work still holds on HEAD. The one catch: CI has never run `.3`'s Playwright/Next config change, because `main` sits 6 commits ahead of `origin`. Pushing at this audit's commit gate sends all of it through CI in one run.

Cohort: [[DEPLOY-008.2]] pushed 51 commits and verified CI green on `4db271f`. [[DEPLOY-008.3]] gave the e2e server its own `.next-e2e/` distDir so e2e runs beside `just dev`.

Verification: typecheck 0, lint 0, 611/611 unit tests, e2e 10/10 beside a live dev server. No AI-referenced doc drifted. No follow-ups to file.

**Parent-flip decision:** **Yes** (operator-confirmed at the 📦 gate, 2026-09-24). `DEPLOY-EPIC-008` flipped to stub form, and the full cohort (`.2`, `.3`, `.N`) moved together from `## High` to the top of `## Completed`. `## High` was left empty, so its `(none)` placeholder was restored. The operator also approved the Finding 1 push: this closure commit and the 6 earlier unpushed commits go to `origin` together, and CI verifies the resulting tip.

**Archived:** 2026-09-24
