---
title: review-keyboard-e2e
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: [TEST-EPIC-007, TEST-007.2, TEST-007.3, TEST-007.N, TEST-005]
touches:
  - e2e/review-keyboard.spec.ts
# No TEST-007.1 Fan-out to echo — epic was filed from audit-repo with children starting at .2.
---

# TEST-007.4 | review-keyboard-e2e

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-007]] [[TEST-007.2]] [[TEST-007.3]] [[TEST-007.N]] [[TEST-005]]

## 🎯 Goal

Cover lightbox, keep/approve/discard, and focus-trap paths in a real browser, because happy-dom cannot see actual focus.

## ✅ Acceptance

- [x] `e2e/review-keyboard.spec.ts` exercises keep / discard / approve on the loaded r1 cards in a real browser (badge + Iterate-on-keeper)
- [x] Lightbox opens from a review thumbnail; ArrowLeft/ArrowRight step with clamp; Escape closes
- [x] Lightbox focus trap is asserted against real `document.activeElement`: open focuses the dialog, Tab cycles Close ↔ Next (Previous disabled at index 0), Escape restores the opener, Tab does not reach the page behind
- [x] Approve does not dirty the committed `test-fixtures/imagegen/` tree (spec copies the fixture to a temp dir before linking)
- [x] `e2e/smoke.spec.ts` and `e2e/imagegen-link-load.spec.ts` still pass; vitest still discovers only `{lib,components}/**/*.test.{ts,tsx}`

## 🧩 Subtasks

- [x] Add `e2e/review-keyboard.spec.ts` extending the TEST-007.3 Playwright shape (typed-path link, no helpers module)
- [x] Copy `test-fixtures/imagegen/` to a temp dir per test so Approve's `selection.json` / `approved/` writes cannot dirty the repo
- [x] Cover keep / discard / approve, lightbox arrows + Escape, and the focus trap
- [x] Run `just e2e` (or `npm run e2e`) and confirm all three specs pass
- [x] Confirm `npm test` still ignores `e2e/`

## 🔗 Related

- [[TEST-EPIC-007]] — parent epic: real-browser harness for folder picker, round load, and review keyboard paths
- [[TEST-007.2]] — depends-on: Playwright harness, dedicated port, CI e2e job, smoke spec
- [[TEST-007.3]] — depends-on: Link imagegen + Load round against `test-fixtures/imagegen/`
- [[TEST-007.N]] — epic audit (not started)
- [[TEST-005]] — related-decision: happy-dom focus-trap tests; this child is the real-browser counterpart

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** TEST-007.2 landed the Playwright harness; TEST-007.3 landed Link + Load against the fixture. Keep / approve / discard / lightbox / focus-trap still have no real-browser spec. The PLAN line's "happy-dom cannot see actual focus" claim still holds: unit tests drive a *managed* Tab handler via `fireEvent.keyDown` + programmatic `focus()`, which is not Chromium sequential navigation.

- [x] Read relevant source files — `e2e/smoke.spec.ts`, `e2e/imagegen-link-load.spec.ts`, `playwright.config.ts`, `components/ReviewGrid.tsx` (Keep/Discard/Approve + View full size → Lightbox), `components/Lightbox.tsx` (arrows local, Esc/Tab in `useFocusTrap`, `focusTarget: 'dialog'`), `lib/useFocusTrap.ts`, `lib/useWorkspace.ts` `setImageDecision` (approve writes `approved/` + `selection.json`; keep/discard are session-only), `components/Lightbox.test.tsx` (managed-Tab comment), `test-fixtures/imagegen/rounds/r1/batch.json`

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  Extend TEST-007.3's Playwright shape (`@playwright/test`, role queries, one file per child, no helpers module). Specs stay in `e2e/*.spec.ts` so vitest never discovers them. Typed-path fallback is the CI-stable link path. Copy the fixture to a temp dir before linking — Approve calls `handleImagegenApprove` which writes `rounds/r1/selection.json` and `approved/` under the linked root; linking the committed fixture would dirty git. No app-code change. Iterate / Feedback / gallery-export stay out of scope.

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Explicit assumptions:
  1. **Typed path, copied fixture.** Same BI-046 typed-path as TEST-007.3, but against a `fs.cpSync` of `test-fixtures/imagegen/` in `os.tmpdir()` so Approve cannot write the committed tree.
  2. **Buttons, not letter-keys.** ReviewGrid has no k/a/d shortcuts; keep/discard/approve are the labelled buttons. "Review keyboard" in the PLAN shortname means lightbox arrows + the focus trap, plus those decision buttons in a real browser.
  3. **Lightbox is the trap under test.** `focusTarget: 'dialog'` is unique to Lightbox; form modals (`'first'`) stay in unit tests. At index 0 Previous is disabled, so the cycle is Close ↔ Next.
  4. **No app-code change.** The e2e is the deliverable. Unit coverage of the same branches stays (TEST-002.2 / TEST-002.4 / TEST-005).
  5. **No helpers module.** Local `linkAndLoad` in the spec file; TEST-007.2 / .3 refused a shared `e2e/helpers.ts`.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Current state:**
- Harness + ingest: TEST-007.2 (port 3009) and TEST-007.3 (typed-path link → auto-load r1, two `<img alt="Warm hero shot for the homepage">`). Fixture has one task, two JPEGs.
- ReviewGrid (`components/ReviewGrid.tsx`): Keep / Discard / Approve toggles (`aria-pressed`; clicking the active decision clears to undecided); Kept badge + `Iterate →` only when `kept`; `View full size` opens Lightbox at that index.
- Lightbox: window ArrowLeft/Right via `stepIndex` (clamp, no wrap — BI-027). Esc + Tab in `useFocusTrap` with `focusTarget: 'dialog'`. DOM order Close → Previous → Next; Previous disabled at 0 so FOCUSABLE is Close + Next.
- Approve disk: `useWorkspace.setImageDecision` → `handleImagegenApprove` writes `approved/` and `selection.json` when linked. Keep/discard do not. Spec must not link the committed fixture if it clicks Approve.
- Happy-dom gap: `Lightbox.test.tsx` documents that Tab is *managed* (`preventDefault` + programmatic `focus()`), which is why those assertions run at all — happy-dom has no sequential focus navigation. E2e is the first check that Tab cannot leak to Project / Keep behind the overlay, and that restore lands on the real opener.

**Archive skim (`archive/test/` + related):**
- **TEST-007.2 / TEST-007.3** — predecessors. `.3` explicitly deferred keep/approve/discard/lightbox/focus-trap here. No TEST-007.1 Fan-out (audit-repo filing; children start at `.2`).
- **TEST-002.2** — ReviewGrid unit: decision toggles, badges, Iterate-on-keeper. Spies on callbacks; does not go through `useWorkspace`.
- **TEST-002.4** — Lightbox unit: arrows, clamps, Esc, managed-Tab. Controlled component (asserts `onIndexChange` spies). Focus block added later by BI-035.5.
- **TEST-005** — direct `useFocusTrap` tests. Closed the hook-isolation gap; still happy-dom.
- **BI-027 / BI-035.5 / BI-039 / BI-051** — lightbox, focus-on-dialog, generalized trap, FOCUSABLE `:not([tabindex="-1"])` on every clause. No e2e.

**Drift check:** PLAN.md line matches HEAD. TEST-007.2 and .3 completed and nested. ReviewGrid labels (`Keep` / `Discard` / `Approve` / `View full size` / `Iterate →`) and Lightbox dialog name (`Image viewer`) match current code. No SPEC contradiction — ordinary implementation child of TEST-EPIC-007. The "happy-dom cannot see actual focus" rationale is still accurate (managed-Tab unit tests are not a substitute).

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

  Extended `e2e/imagegen-link-load.spec.ts`: `@playwright/test`, role queries, one file per child, no helpers module. Typed-path fallback is the existing BI-046 control. Fixture copy-to-temp is local to this spec because Approve writes disk; TEST-007.3 could link the committed tree because it was read-only.

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

  No app-code change. No shared `e2e/helpers.ts` (TEST-007.2 / .3 refused it). Deferred: Iterate / Feedback / gallery-export e2e; form-modal `focusTarget: 'first'` trap.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

  `e2e/review-keyboard.spec.ts` — three tests: keep/discard/approve, lightbox arrows + Escape + clamp, focus trap (open → Tab cycle Close ↔ Next → restore opener).

**Implementation Notes:** `beforeEach` copies `test-fixtures/imagegen/` to `os.tmpdir()/blastimage-e2e-*` and links that path; `afterEach` `rmSync`s it. Linked-button accessible name is not asserted (temp dir basename differs from `test-fixtures/imagegen`).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

  One new spec file, local `linkCopiedFixture` rather than a helpers module. No app public-surface growth. Docs already describe `e2e/*.spec.ts` from TEST-007.2.

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

  N/A — test-only; no UI surface changed.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:** `npx eslint e2e/review-keyboard.spec.ts` + `npx tsc --noEmit` clean. `npm run e2e` 5 passed in 4.9s (smoke + link-load + 3 new). `npm test` 575 passed / 32 files — e2e still outside the vitest glob. `git status --porcelain` after e2e showed only the spec + tasknote (no fixture dirt).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  - `README.md` — no change (e2e install/run already documented by TEST-007.2)
  - `AGENTS.md` — no change
  - `CLAUDE.md` — no change (`e2e/*.spec.ts` glob already named)
  - `.flowtron/PLAN.md` — this child's stub-form flip only
  - `VISION.md` — no change
  - `docs/ADOPT.md` — no change
  - `docs/WORKFLOW.md` — no change
  - `docs/REVIEW-LOOP.md` — no change
  - `docs/GROK-AGENT.md` — no change

- [x] Closed — every `## ✅ Acceptance` criterion ticked. YAML `status:` flipped to `completed`. PLAN.md line to stub form, kept nested beneath TEST-EPIC-007. Tasknote moved to `.flowtron/tasknote/archive/test/TEST-007.4.md`. No superseded-claim pointer.

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:** Real-browser coverage for review keep/discard/approve, lightbox arrows, and the Lightbox focus trap. New `e2e/review-keyboard.spec.ts` copies `test-fixtures/imagegen/` to a temp dir before linking so Approve cannot write `selection.json` / `approved/` into the committed fixture. Three tests: decision badges + Iterate-on-keeper; ArrowLeft/Right clamp + Escape; open-focuses-dialog / Tab Close↔Next / restore opener / no leak to Project or Keep. No app-code change. Verified: `tsc` / eslint on the spec / `npm test` 575 / `npm run e2e` 5 passed in 4.9s. Docs: no change (TEST-007.2 already named the e2e surface). Deferred: Iterate / Feedback / form-modal traps.

**Archived:** 2026-09-09
