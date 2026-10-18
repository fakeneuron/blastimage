---
title: doc-comment-drift
status: completed
tags: []
created: 2026-10-18
due:
related-tasks: [DEPLOY-EPIC-014, DEPLOY-014.3, DEPLOY-002]
touches:
  - README.md
  - vitest.config.mts
---

# DEPLOY-014.4 | doc-comment-drift

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-014]]

## 🎯 Goal

Make two stale doc claims true again: README's Export/Import glyphs match `components/ProjectMenu.tsx`, and the `vitest.config.mts` comment matches tsconfig's `jsx` setting.

## ✅ Acceptance

- [x] README no longer says `↓ Export` — `! grep -q '↓ Export' README.md`
- [x] README names the glyphs ProjectMenu renders — `grep -q '⤓ Export' README.md && grep -q '⤒ Import' README.md && grep -q '⤓ Export' components/ProjectMenu.tsx && grep -q '⤒ Import' components/ProjectMenu.tsx`
- [x] The vitest comment no longer claims `preserve` — `! grep -q 'preserve' vitest.config.mts`
- [x] The rewritten comment makes only claims that hold: suite is green with the override removed (Discovery Notes) and with the shipped config — `just test`
- [x] Full validation set stays green — `just lint`, `just typecheck`

## 🧩 Subtasks

- [x] Fix README glyphs (`↓`/`↑` → `⤓`/`⤒`)
- [x] Re-verify the `oxc.jsx` override against tsconfig and correct the comment
- [x] Run the full validation set and record the receipt

## 🔗 Related

- [[DEPLOY-EPIC-014]] — parent epic (upkeep-honesty)
- [[DEPLOY-002]] — Next 16 upgrade; last touched the vitest config's JSX setup

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Both drifts are still present in HEAD (README `↓ Export` / `↑ Import`; vitest comment says `preserve`, tsconfig says `react-jsx`).

- [x] Read relevant source files — README.md, components/ProjectMenu.tsx, vitest.config.mts, tsconfig.json

- [x] **Best Practices Review** — N/A: comment and doc text only, no module-boundary change

- [x] **Archive skim** — `archive/deployment/` has no tasknote touching the README export glyphs; DEPLOY-014.3 edited README.md's dependency prose only. No prior conflicts.

- [x] **Drift check** — PLAN cites `README.md:65` for the glyphs; they are at `README.md:67` (line 65 is the Export step). Task substance unchanged. ProjectMenu glyphs at `:158,167` are `⤓ Export` / `⤒ Import` (lines 158/167 are the buttons' text region; confirmed). README line 61 `⇪ Import` (tasks.json import) already matches ProjectMenu:185.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed (--unattended). Assumption: keep the `oxc.jsx` override rather than delete it, since the PLAN row says correct the comment; deletion is a behavior change outside that scope.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:**

- Override re-verification: temporarily removed `oxc: { jsx: { runtime: "automatic" } }`; `npx vitest run` → 35 files / 759 tests passed. So Vite's oxc transform follows tsconfig's `react-jsx` and the override is redundant today. Config restored before editing the comment.
- Exit gate: Discovery surfaced no significant deviation → skip 🛠️.

✅ Phase 1 Discovery complete; entering Phase 2 Execution.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — N/A: two in-place text edits, no new shape

- [x] **Minimal refactor gate** — no refactor

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A: doc/comment text only

**Implementation Notes:**

- `README.md:67` — `**↓ Export** / **↑ Import**` → `**⤓ Export** / **⤒ Import**`.
- `vitest.config.mts` comment rewritten: tsconfig is `react-jsx`, Vite's oxc follows it, override redundant but kept as a pin. Override code untouched.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — see Testing Notes

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) Asked the user for visual confirmation — N/A: no rendered surface changed (README text and a config comment)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- `! grep -q '↓ Export' README.md` → 0
- `grep -q '⤓ Export' README.md && grep -q '⤒ Import' README.md && grep -q '⤓ Export' components/ProjectMenu.tsx && grep -q '⤒ Import' components/ProjectMenu.tsx` → 0
- `! grep -q 'preserve' vitest.config.mts` → 0
- `just test` → 0 (35 files, 759 tests)
- `just lint` → 0 (astro check 0 errors / 0 warnings / 0 hints)
- `just typecheck` → 0
- Re-run after the comment rewrite below: `! grep -q preserve vitest.config.mts` → 0; `npx vitest run` → 0 (759 tests); `just lint` → 0; `just typecheck` → 0

**External review** (`/code-review medium`, working-tree diff) — 0 blockers, 5 notes:

1. *Comment says "currently redundant", point-in-time claim that will itself go stale* — **fixed**: comment rewritten evergreen ("Pins the automatic JSX runtime … regardless of how Vite reads tsconfig's `jsx`, currently `react-jsx`"). The redundancy finding stays in Discovery Notes.
2. *Redundancy verified only by a manual removal run* — **no change**: the rewritten comment no longer asserts it, so there is nothing left unguarded in the file.
3. *README glyphs hand-copied from ProjectMenu with no test tying them* — **no change**: a copy-guard test is speculative new machinery, outside this row's scope.
4. *Other README UI labels not swept* — **no change**: out of scope for this row; the epic's `DEPLOY-014.N` upkeep-honesty audit is the place for a broader sweep.
5. *Acceptance boxes unticked / PLAN row stale at review time* — **no change needed**: expected mid-task; closed in Phase 4.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: README.md → updated (the task's own fix; `grep` finds no remaining `↓ Export` / `↑ Import` outside the PLAN row being flipped); AGENTS.md, CLAUDE.md, PLAN.md, VISION.md, docs/ADOPT.md, docs/WORKFLOW.md, docs/REVIEW-LOOP.md, docs/GROK-AGENT.md → no change

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — anything the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

Changed files: `README.md` (line 67: `↓ Export` / `↑ Import` → `⤓ Export` / `⤒ Import`, matching `components/ProjectMenu.tsx`), `vitest.config.mts` (comment only; the `oxc.jsx` override is unchanged). Verification: Acceptance greps → 0; `just test` (35 files / 759 tests), `just lint`, `just typecheck` all → 0. Re-verification of the override: with it removed, the full suite still passes, so Vite's oxc transform follows tsconfig's `react-jsx` and the override is redundant today; it was kept as a pin and the comment now says so without asserting the redundancy. No refactors. `touches:` reconciliation: `git diff --name-only` = `README.md`, `vitest.config.mts` — matches declared. Maintainability: two stale claims removed; no new machinery. Drift noted: PLAN cited `README.md:65`, actual line was 67. Learnings: N/A. Nothing deferred, so nothing filed.

**Archived:** 2026-10-18
