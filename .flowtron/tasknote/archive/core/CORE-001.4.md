---
title: config-docs-strays
status: in-progress
tags: []
created: 2026-06-10
due:
related-tasks: [CORE-EPIC-001, CORE-001.1, CORE-001.2, CORE-001.3]
---

# CORE-001.4 | config-docs-strays

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[CORE-EPIC-001]] [[CORE-001.1]] [[CORE-001.2]] [[CORE-001.3]]

## 🎯 Goal

Cross-cutting cleanup of root configs and docs: remove the superseded PLAN.legacy.md, verify .gitignore covers `*.tsbuildinfo`, align the npm test script's watch-vs-run intent with docs, and verify README/AGENTS claims against the post-.2/.3 code.

## ✅ Acceptance

- [x] `PLAN.legacy.md` removed from the repo (`git rm`) — user confirmed deletion per-file
- [x] `.gitignore` verified to cover `*.tsbuildinfo` and `tsconfig.tsbuildinfo` confirmed untracked (verify-only; no edit expected)
- [x] `package.json`: `test` = `vitest run` (one-shot), `test:watch` = `vitest`, redundant `test:run` removed — user-confirmed shape
- [x] `.flowtron/tasknote/README.md` quick commands gains `Test: npm test`
- [x] README/AGENTS claims verified against post-`.2`/`.3` code; any drift fixed or "no drift" logged
- [x] Suite + `npx tsc --noEmit` + `npm run lint` green at closure (constitution §6)

## 🧩 Subtasks

- [x] `git rm PLAN.legacy.md`
- [x] Edit `package.json` scripts: `test` → `vitest run`, add `test:watch` → `vitest`, drop `test:run`; grep repo for `test:run` consumers first
- [x] Add `Test: npm test` to `.flowtron/tasknote/README.md` §"Project quick commands"
- [x] Record README/AGENTS verification verdict (done in Discovery: no drift)
- [x] Run `npm test` + tsc + lint to verify the script change

## 🔗 Related

- [[CORE-EPIC-001]] — parent epic: code-quality sweep
- [[CORE-001.1]] — discovery that filed this task's findings
- [[CORE-001.2]] — lib-quality fixes (landed)
- [[CORE-001.3]] — component-quality fixes (landed)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Final implementation child of the active CORE-EPIC-001 sweep; `.2`/`.3` landed 2026-06-10, so the "verify docs after .2/.3" precondition is met. All four cleanup items remain real against HEAD.

- [x] Read relevant source files

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code; flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

- **Archive skim:** `.1` Discovery findings 8–9 define this task's scope verbatim (PLAN.legacy deletion pre-authorized with per-file confirm at fix time; `tsconfig.tsbuildinfo`/`SCRATCHPAD.md` confirmed *untracked* there, narrowing item 2 to verify-only). `.2`/`.3` recaps confirm behavior-preserving fixes — no doc claims invalidated by them.
- **Drift check:** `git ls-files` — `PLAN.legacy.md` still tracked, no `*.tsbuildinfo` tracked. `.gitignore:34` already has `*.tsbuildinfo` → item 2 passes with zero edits. `package.json` still has `test` = `vitest` (watch) + `test:run` = `vitest run`. No doc anywhere (`README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/`) mentions a test command — the "align with docs" item resolves as a script + quick-commands fix, not a doc fix.
- **README/AGENTS verification (post-`.2`/`.3`):** README claims checked against HEAD — 3-ref cap (`MAX_ACTIVE_REFS = 3`, `lib/workspace.ts:32`) ✓ · port 3003 (`package.json` dev script) ✓ · Iterate → (`ReviewGrid.tsx:170`) ✓ · Export JSON (`GalleryPanel.tsx:57`) ✓ · star ratings / feedback / use-as-reference ✓ · localStorage-only ✓ · `docs/GROK-AGENT.md` exists ✓. AGENTS.md is flowtron-workflow prose, no code claims. **Verdict: no drift.**
- **Clarifications (AskUserQuestion, 2026-06-10):** (1) delete `PLAN.legacy.md` — confirmed; (2) test-script shape — confirmed `test` = `vitest run`, `test:watch` = `vitest`, drop `test:run`, add `Test: npm test` to quick commands.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — looked at neighboring code for an existing pattern to extend; justified the new shape if none fits (script naming follows the vitest-community `test` / `test:watch` convention; quick-commands line matches the existing terse `- Label: \`cmd\`` shape)

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior (N/A — config/docs only, no executable logic changed)

**Implementation Notes:**

- `git rm PLAN.legacy.md` — user-confirmed; content superseded by `.flowtron/PLAN.md` + archived tasknotes.
- `package.json` scripts: `test` → `vitest run`, `test:run` replaced by `test:watch` → `vitest`. Pre-edit grep confirmed the only `test:run` references live in write-once archived tasknotes (BI-002/003/004) — historical records, untouched per SPEC write-once policy. No CI configs in repo.
- `.flowtron/tasknote/README.md` quick commands: added `Test: npm test` line with watch-mode pointer.
- `.gitignore`: zero edits needed — `*.tsbuildinfo` already covered (line 34), `tsconfig.tsbuildinfo` untracked.
- README/AGENTS: zero edits needed — all claims verified against HEAD in Discovery (no drift).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npm test` exercises the changed script directly: one-shot exit, 56/56 pass (4 files)

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` clean · `npm run lint` clean

- [x] (frontend) Asked the user for visual confirmation (N/A — no frontend surface touched)

**Testing Notes:**

`npm test` now terminates after one run (the watch-mode trap is gone), 56/56 green. tsc + lint clean. Constitution §6 gate satisfied.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update
  - `README.md` — no change (no test-command mention; user-facing claims verified no-drift in Discovery)
  - `AGENTS.md` — no change (flowtron-workflow prose, no code claims)
  - `CLAUDE.md` — no change (no script references)
  - `.flowtron/PLAN.md` — updated by this closure (line flipped to stub form)

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-06-10.` and tasknote moved to `.flowtron/tasknote/archive/core/`

- [x] Recap drafted (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

Closed the cross-cutting cleanup child of [[CORE-EPIC-001]] with both user confirmations in hand. Deleted the superseded git-tracked `PLAN.legacy.md`; verified `.gitignore` already covers `*.tsbuildinfo` with `tsconfig.tsbuildinfo` untracked (zero edits); realigned the test scripts to the one-shot-default convention (`test` = `vitest run`, `test:watch` = `vitest`, redundant `test:run` dropped — only archived write-once tasknotes referenced it); added `Test: npm test` to the assistant quick-commands list. README/AGENTS claims verified against post-`.2`/`.3` HEAD: no drift, zero doc edits needed. Suite 56/56, tsc + lint clean.

**Archived:** 2026-06-10
