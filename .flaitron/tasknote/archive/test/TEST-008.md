---
title: iterate-feedback-modal-e2e
status: completed
tags: []
created: 2026-09-10
due:
related-tasks: [TEST-007.4, TEST-007.N, TEST-EPIC-007]
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

# TEST-008 | iterate-feedback-modal-e2e

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-007.4]] [[TEST-007.N]] [[TEST-EPIC-007]]

## 🎯 Goal

Add real-browser Playwright coverage for the Iterate and Feedback modal paths and their focus traps, extracting the shared link-a-fixture-root flow into `e2e/helpers.ts`.

## ✅ Acceptance

- [x] `e2e/helpers.ts` exists and owns the shared link flow (temp-copy the fixture, link it via the typed-path fallback, assert the round loaded); `e2e/review-keyboard.spec.ts` uses it in place of its local `linkCopiedFixture`
- [x] New `e2e/iterate-feedback-modal.spec.ts` covers the Feedback modal path in a real browser: typed notes persist (card label flips to `💬 Edit feedback`), `Save & Keep` flips the card to Kept and reveals `Iterate →`
- [x] Covers the Iterate modal path end to end: prompt prefilled as base + `Refine: <feedback>`, edited, submitted → `rounds/r1/selection.json` under the linked temp root carries `decision: "iterate"`, the keeper filename, and the edited prompt
- [x] Covers both modals' `focusTarget: 'first'` traps in a real browser (the gap happy-dom cannot assert): open focuses the textarea, Tab / Shift+Tab cycle only the dialog's own controls, Escape dismisses and restores the opener
- [x] Dismiss paths write nothing — Cancel / Escape on the Iterate modal leave no `selection.json` on disk
- [x] `git status --porcelain` is clean of fixture dirt immediately after `npm run e2e`
- [x] `npm run e2e` green (all specs), `npm test` green, `npx tsc --noEmit` and `npm run lint` exit 0

## 🧩 Subtasks

- [ ] Extract `e2e/helpers.ts` from `e2e/review-keyboard.spec.ts` (`SOURCE_FIXTURE`, temp-copy create/remove, `linkImagegenRoot`), with a header comment recording why `imagegen-link-load.spec.ts` stays inline
- [ ] Rewire `e2e/review-keyboard.spec.ts` onto the helper; re-run it to prove the extraction is behavior-preserving
- [ ] Write `e2e/iterate-feedback-modal.spec.ts` — Feedback save/flip + Save & Keep path
- [ ] Add the Iterate path: prefill composed from saved feedback, edit, submit, assert `rounds/r1/selection.json` on disk
- [ ] Add both focus-trap tests (open focus, Tab cycle, Escape + opener restore) and the dismiss-writes-nothing test
- [ ] Phase 3: `npm run e2e`, `npm test`, `tsc --noEmit`, `npm run lint`, plus a post-run `git status --porcelain` fixture-dirt check

## 🔗 Related

- [[TEST-007.4]] — predecessor: `e2e/review-keyboard.spec.ts`; deferred the modal-path coverage this task adds
- [[TEST-007.N]] — epic audit; finding 3 named a third spec as the trigger for extracting `e2e/helpers.ts`
- [[TEST-EPIC-007]] — parent epic: the Playwright e2e harness this spec joins

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The gap is real and unchanged at HEAD — `e2e/` holds three specs, none of which opens either modal, and `TEST-007.4` explicitly deferred "Iterate / Feedback / form-modal `focusTarget: 'first'` trap". The `e2e/helpers.ts` trigger `TEST-007.N` finding 3 named ("a third spec needing the link flow") is exactly what this task creates.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Read set (HEAD).** `e2e/{smoke,imagegen-link-load,review-keyboard}.spec.ts`, `playwright.config.ts`, `components/{IterateModal,FeedbackModal,ReviewGrid,Workspace}.tsx`, `lib/useFocusTrap.ts`, `lib/useWorkspace.ts` (`submitFeedback` 928-945, `requestNextRound` 947-968), `lib/roundSelection.ts` (`buildIterateSelectionTask`), `lib/imagegenServerFs.ts` (selection path), `test-fixtures/imagegen/rounds/r1/batch.json`, and the existing unit suites `components/{IterateModal,FeedbackModal}.test.tsx`.

**What the e2e layer adds over the unit suites.** Both modals are already densely unit-tested (24 + 22 cases: chrome, prefill, submit payloads, focus management) — but with spied callbacks and under happy-dom, which `TEST-007.4` recorded as unable to observe real focus. The browser layer therefore targets the two things those tests structurally cannot reach: *actual* focus/Tab behavior, and the round trip through `useWorkspace` → `/api/imagegen/*` → disk and back into the rendered card.

**Modal entry points + labels (verified in source).** Feedback button label is `Feedback`, flipping to `💬 Edit feedback` once `feedback.text` is set (`ReviewGrid.tsx:177-190`); `Iterate →` renders only when `image.decision === 'kept'` (`ReviewGrid.tsx:194-201`). Dialog accessible names are `Iterate from keeper` and `Image feedback`. Both close on submit — `Workspace.tsx:216-236` clears `feedbackFor` / `iterateFor` in the `onSubmit` handler.

**Focus-trap shape (`focusTarget: 'first'`, the form-modal default).** `useFocusTrap` focuses the first `FOCUSABLE` descendant on mount, so DOM order gives: Iterate → `#iterate-prompt` textarea, `Cancel`, `Save selection request` (excluded while disabled); Feedback → `#feedback-text` textarea, the reference checkbox, `Cancel`, `Save`, `Save & Keep`, `Approve`. This differs from the Lightbox's `focusTarget: 'dialog'` that `TEST-007.4` covered — the untested half of the BI-039 contract.

**Both paths write, so the spec must link a temp copy.** Iterate submit → `requestNextRound` → `imagegen.writeSelection(round, [entry])` → `rounds/r1/selection.json` under the linked root; Feedback `Approve` → `handleImagegenApprove` → `approved/`. Per `CLAUDE.md:15` (the contract `TEST-007.N` finding 2 added) this spec is squarely on the copy-then-link side, like `review-keyboard.spec.ts`.

**Archive skim.** Path greps over `.flowtron/tasknote/archive/` for `e2e/`, `IterateModal`, `FeedbackModal`, `useFocusTrap`, `playwright`. Load-bearing hits: **TEST-007.N** — finding 3 is this task's mandate (extract on the third spec) and finding 2 added the `CLAUDE.md` fixture contract; **TEST-007.4** — deferred exactly this scope, established the copy-then-link idiom and the house style (task-ID header block with an explicit not-covered line, role-based locators, assertions citing the originating BI task); **TEST-007.3** — typed-path fallback is the CI-stable link route because the browse tree starts at `$HOME`; **BI-039** — introduced `useFocusTrap` and the `'first'` vs `'dialog'` split; **BI-051** — fixed `FOCUSABLE` to honour `tabindex="-1"` on `button`/`[href]`; **BI-009 / BI-006** — the modals' own specs (`composePrompt` = base + `\n\nRefine: <note>`; three submit actions). No prior note contradicts this plan.

**Drift check.** PLAN.md line matches HEAD. `e2e/helpers.ts` does not exist. All cited labels, dialog names, and line ranges verified in current source. `TEST-007.N` finding 3's premise still holds — the link flow is duplicated between `.3` (inline) and `.4` (local `linkCopiedFixture`) at HEAD, unchanged. No SPEC contradiction; ordinary standalone implementation task.

**No clarifications needed.** Explicit assumptions:

1. **`imagegen-link-load.spec.ts` stays inline.** It is the spec whose *subject* is the link flow — it asserts intermediate states (`imagegen linked: test-fixtures/imagegen`, auto-load field values, `Load round r1` idempotence) that a shared helper would hide. Extraction serves the two specs that merely need a linked root as a precondition. The exclusion and its reason are recorded in `e2e/helpers.ts` so a future reader does not "finish" the extraction by folding `.3` in.
2. **The helper carries the temp-copy**, not just the link — both of its callers write to disk, so copy-then-link is the flow, and a read-in-place variant would have no caller.
3. **One new spec file**, `e2e/iterate-feedback-modal.spec.ts`, following the one-file-per-task cohort convention.
4. **No app-code change** is expected; both modals and the focus trap are already shipped and unit-covered.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

**Pattern survey.** Extended the cohort's house style rather than inventing one: task-ID header block naming what the spec deliberately does *not* cover, role-based locators throughout (`getByRole` / `getByLabel`, never CSS or test-id), assertions citing the originating BI task (BI-006 label flip, BI-009 `composePrompt`, BI-039 `focusTarget: 'first'`), single quotes matching the sibling specs, one spec file for the task. `expect.poll` is the one new idiom — the selection write is an async POST to `/api/imagegen/selection`, so the disk assertion has to retry rather than read once.

**Minimal refactor gate.** One refactor, and it is the task's own Acceptance: `e2e/helpers.ts` now owns the copy-then-link flow (`copyFixture` / `removeFixture` / `linkImagegenRoot`), and `review-keyboard.spec.ts` drops its local `linkCopiedFixture` plus its three `node:` imports for the three helper calls. `imagegen-link-load.spec.ts` untouched — its inline flow is deliberate, and the reason is recorded in the helper's header so a later reader does not "finish" the extraction. No app-code change; nothing adjacent cleaned up.

**Deliverables.**

- `e2e/helpers.ts` (new, 57 L) — `SOURCE_FIXTURE` + `copyFixture()` (mkdtemp + `cpSync`) + `removeFixture()` + `linkImagegenRoot(page, root)` (goto → Link imagegen → typed path → assert r1 auto-loaded).
- `e2e/iterate-feedback-modal.spec.ts` (new, 4 tests) — feedback persistence + `Save & Keep` promotion; the iterate prefill/edit/submit round trip asserted against `rounds/r1/selection.json` on disk; the Iterate trap (`prompt → Cancel → Save → wrap`, Escape restores the opener, and no `selection.json` written on dismiss); the Feedback trap (`notes → checkbox → Cancel → Save → Save & Keep → Approve → wrap`, Shift+Tab wrap-back, Escape discards typed notes).
- `e2e/review-keyboard.spec.ts` (edited) — rewired onto the helper; its three tests are byte-identical.
- `CLAUDE.md` (edited, 1 clause) — doc drift *this* change caused: the Testing bullet cited `review-keyboard.spec.ts` as where the copy-then-link dance lives, which is no longer true. It now names `e2e/helpers.ts` as the flow, both calling specs, and the deliberate `imagegen-link-load.spec.ts` exception.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] (frontend) Asked the user for visual confirmation — **N/A.** No app code changed; the deliverables are test files plus one doc clause, and the UI they drive is unchanged. The real browser *is* the verification here.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:** `npm run e2e` → **9 passed (6.8s)**, 4 workers — the 4 new tests plus all 5 pre-existing specs, so the helper extraction is proven behaviour-preserving rather than assumed. `npm test` → 32 files / 575 tests passed (4.47s), unchanged. `npx tsc --noEmit` exit 0 (`tsconfig.json` includes `**/*.ts`, so `e2e/` is type-checked). `npm run lint` exit 0. `git status --porcelain` immediately after the e2e run listed only this task's own files (`M e2e/review-keyboard.spec.ts`, `?? e2e/helpers.ts`, `?? e2e/iterate-feedback-modal.spec.ts`, `?? .flowtron/tasknote/TEST-008.md`) — no fixture dirt under `test-fixtures/`, confirming the temp-copy path holds for the new writing spec.

**Quality assertions.** The extraction *removes* duplication (one link flow, two callers) rather than adding surface; the helper exports four symbols, all used. `helpers.ts` is not matched by Playwright's default `testMatch` (`**/*.@(spec|test).*`), so it adds no collected test file. No dead code — `review-keyboard.spec.ts`'s now-unneeded `node:fs` / `node:os` / `node:path` and `type Page` imports were dropped with the local helper. The Feedback trap test loops the six controls instead of six copy-pasted press/assert pairs; the Iterate trap stays explicit at three, where a loop would obscure the wrap. One doc clause updated to match the new layout.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  - `README.md` — **no change.** The install block (`npm run e2e` on :3009) and the CI paragraph carry no spec count or spec list, so a fourth spec does not stale them.
  - `AGENTS.md` — no change (no testing section; the e2e surface is documented in `CLAUDE.md`).
  - `CLAUDE.md` — **updated** (`CLAUDE.md:15`). The Testing bullet cited `e2e/review-keyboard.spec.ts` as where a writing spec's copy-then-link dance lives; that flow moved to `e2e/helpers.ts` in this task. The bullet now names the helper as the flow to call, cites both calling specs, and records the deliberate `imagegen-link-load.spec.ts` exception. Spec-glob, port, and fixture-root clauses re-verified, otherwise unchanged.
  - `.flowtron/PLAN.md` — this task's stub flip (standalone → top of `## Completed`).
  - `VISION.md` — no change (product vision + generation-mode table; test surface out of scope).
  - `docs/ADOPT.md` — no change (adopters do not run the e2e harness).
  - `docs/WORKFLOW.md` — no change.
  - `docs/REVIEW-LOOP.md` — no change. The iterate half of the loop it documents is now covered in a real browser down to the `selection.json` it specifies, but the doc describes the operator loop, not its tests.
  - `docs/GROK-AGENT.md` — no change.

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed per SPEC/tasknote-selection.md §"`## Completed` archive convention" (standalone → top of `## Completed`; epic child → kept nested beneath its active parent), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:** Closed the modal gap `TEST-007.4` deferred: `e2e/iterate-feedback-modal.spec.ts` drives the Feedback and Iterate modals in a real browser, and the shared link flow the epic audit flagged is now `e2e/helpers.ts`.

Four tests, aimed at what the 46 existing happy-dom unit cases structurally cannot reach. **Real focus:** both modals' `focusTarget: 'first'` traps — the untested half of BI-039 (`review-keyboard.spec.ts` covers the Lightbox's `'dialog'` half) — asserting open-focuses-the-textarea, the full forward Tab cycle and its wrap, Shift+Tab wrap-back, no leak to the Project combobox or the card behind, and opener restore on Escape. **Real round trip:** feedback typed in the browser persists through `useWorkspace` and flips the card's button label to `💬 Edit feedback`; reopening prefills from it; `Save & Keep` promotes the card to Kept and reveals `Iterate →`; the Iterate modal's prompt arrives composed as `<base>\n\nRefine: <note>`, and submitting an edit writes `rounds/r1/selection.json` on disk with `decision: "iterate"`, the keeper filename, `promptMode: "append"`, and the edited prompt. Dismissal is asserted negatively on both sides — Escape on Iterate leaves no `selection.json`, Escape on Feedback discards typed notes.

`e2e/helpers.ts` (57 L) discharges `TEST-007.N` finding 3, whose stated trigger was exactly this third spec: `copyFixture` / `removeFixture` / `linkImagegenRoot`, with `review-keyboard.spec.ts` rewired onto it (its three tests unchanged) and `imagegen-link-load.spec.ts` deliberately left inline — the link flow is that spec's subject and it asserts intermediate states the helper hides. That exclusion is written into the helper's header so a later reader does not "finish" the extraction.

No app-code change. Docs: one clause in `CLAUDE.md:15`, fixing drift this change caused — the Testing bullet pointed at `review-keyboard.spec.ts` for the copy-then-link contract that now lives in the helper.

Verified: `npm run e2e` **9 passed in 6.8s** (4 new + 5 pre-existing, so the extraction is proven behaviour-preserving, not assumed), `npm test` 575/575 across 32 files, `npx tsc --noEmit` exit 0, `npm run lint` exit 0, and `git status --porcelain` right after the e2e run clean of fixture dirt — the new writing spec honours the temp-copy contract.

**Archived:** 2026-09-10
