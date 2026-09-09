---
title: focus-trap-direct-tests
status: completed
tags: [a11y, testing]
created: 2026-09-09
due:
related-tasks: [BI-039, BI-035.5]
touches:
  - lib/useFocusTrap.ts
  - lib/useFocusTrap.test.ts
---

# TEST-005 | focus-trap-direct-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[BI-039]] · [[BI-035.5]]

## 🎯 Goal

Give `lib/useFocusTrap.ts` a direct `lib/useFocusTrap.test.ts` so its open/restore, Tab-cycle, and Escape behavior is pinned in one place instead of only incidentally through five modal/Lightbox component test files.

## ✅ Acceptance

- [x] `lib/useFocusTrap.test.tsx` exists, directly renders the hook through a small harness component (not only reached via a modal component) — `.tsx` extension, not the PLAN line's literal `.test.ts`; see Implementation Notes
- [x] Mount: focus lands on the first enabled focusable by default (`focusTarget: 'first'`), and on the dialog container itself for `focusTarget: 'dialog'`
- [x] Mount with no focusable children falls back to focusing the dialog container
- [x] Tab from the last focusable wraps to the first; Shift+Tab from the first wraps to the last; a `disabled` control and a `tabIndex={-1}` control are excluded from the cycle — the exclusion case uses an `<input tabIndex={-1}>` (ImportBuilder's real shape), not a button; see Implementation/Testing Notes for the `FOCUSABLE` gap this surfaced
- [x] Tab / Shift+Tab pressed while focus sits on the dialog container itself (`at === -1`) enters at the correct end for each direction
- [x] Escape invokes the current `onEscape` callback, including a callback swapped in after a rerender (re-read each keydown)
- [x] Unmount restores focus to whatever was focused when the trap mounted
- [x] `npm test`, `npx tsc --noEmit`, `npm run lint` all clean

## 🧩 Subtasks

- [x] Write `lib/useFocusTrap.test.tsx`: an `Opener` + conditionally-rendered `Dialog` harness (Dialog owns the hook; parent mounts/unmounts it), mirroring the real consumer pattern from the module's own docstring and `lib/useWorkspace.test.ts`'s `@testing-library/react` usage
- [x] Open/restore block: default `'first'` target, `'dialog'` target, empty-dialog fallback, unmount-restores-opener
- [x] Tab-cycle block: forward wrap, backward wrap, disabled/`tabIndex={-1}` exclusion, `at === -1` entry in both directions
- [x] Escape block: basic dismiss, and a reactive `onEscape` swapped in via rerender
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run lint`

## 🔗 Related

- [[BI-039]] — introduced `lib/useFocusTrap.ts`; its own Discovery deliberately chose component-test coverage over a direct hook test ("unit-test the hook where pure, or cover via component tests") — this task closes that deferred gap
- [[BI-035.5]] — established the Lightbox open/restore/managed-Tab contract BI-039 generalized into the hook

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `lib/useFocusTrap.ts` (96 L) still has no sibling test at HEAD — confirmed by `grep -rl useFocusTrap`, which returns only the hook itself and its five consumers' component tests (`DeleteTaskModal`, `FeedbackModal`, `IterateModal`, `ImagegenLinkModal`, `ImportBuilder`/`Lightbox`). Scope matches the filed line exactly; no other file has drifted into needing the same treatment.

- [x] Read relevant source files — `lib/useFocusTrap.ts` in full (open/restore effect, managed-Tab effect, `FOCUSABLE` selector, `FocusTarget` type); `lib/useWorkspace.test.ts` header + several `renderHook` call sites for the repo's `@testing-library/react` idiom; `components/DeleteTaskModal.tsx` and `FeedbackModal.tsx` for how consumers wire `dialogRef` + `tabIndex={-1}` + `useFocusTrap`. Read set was narrow and fully enumerable — no probe needed.

- [x] **Best Practices Review** — test-only addition; no production code change planned. No existing `lib/` test renders a plain hook through JSX with real focusable DOM nodes (the closest precedent, `useWorkspace.test.ts`, uses `renderHook` with no rendered markup, since that hook doesn't need one). This test introduces a small local harness component (`Opener` + `Dialog`) rendered via RTL's `render`/`rerender` — the minimal shape needed to give the hook a real `dialogRef` and focusable children, and it mirrors the mount/unmount-on-close pattern the hook's own docstring already documents for real consumers. Dependency direction untouched: the test imports only from `lib/useFocusTrap`.

- [x] **Archive skim** — `grep -rl` over `.flowtron/tasknote/archive/*/` for `useFocusTrap` / `FOCUSABLE` / `focus trap`: hits on `BI-039` (introduced the hook) and `BI-035.5` (established the Lightbox precedent it generalized), both named in `## 🔗 Related` above already so no further hits to open. Read `BI-039` in full: its own Subtasks line explicitly deferred the choice — "unit-test the hook where pure, or cover via component tests" — and it picked component tests (20 tests added across the four modal files), leaving the hook itself untested in isolation. `BI-035.5` established `focusTarget: 'dialog'` for screen-reader announcement (Lightbox) vs `'first'` for form modals — both branches this task must cover. No `⚠️ Superseded by` pointer on either note; nothing here falsifies a prior factual claim.

- [x] **Drift check** — the PLAN.md line's two claims verified at HEAD: `lib/useFocusTrap.ts` is 96 lines (confirmed by direct read) and has no sibling test file (confirmed absent from `lib/*.test.ts` listing). The `lib/persistence.ts` carve-out in the same PLAN line is out of scope for this task and untouched. No SPEC contract or PLAN.md line contradicts the plan formed here.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed.** Explicit assumptions:

  1. **Harness over `renderHook`.** `renderHook` alone can't give the hook a real DOM subtree with focusable children and a working `document.activeElement`, so the test renders a small `Dialog` component (owns the `ref` + hook call) mounted/unmounted by a parent, matching how every real consumer uses it.
  2. **No production code changes.** If the suite surfaces a real defect it is filed rather than fixed inline, per the same carve-out `TEST-004.4` used.
  3. **`window.addEventListener('keydown', ...)` is exercised via `fireEvent.keyDown(window, ...)`**, since the hook's Tab/Escape handler is bound to `window`, not the dialog element.
  4. **Coverage boundary.** This task pins the hook's own contract (open/restore, Tab cycle, Escape) in isolation. It does not re-assert any modal's business logic (Cancel/backdrop/dismiss wiring) — that stays with each modal's own test file.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**This closes a gap BI-039 named and deliberately deferred.** BI-039's own Subtasks line offered two options — "unit-test the hook where pure, or cover via component tests" — and BI-039 took the second, adding 20 focus-management tests across the four modal files it touched (`FeedbackModal`, `IterateModal`, `DeleteTaskModal`, `ImportBuilder`) plus the pre-existing Lightbox coverage. That leaves the hook's own contract provable only by inference from five call sites, each of which also asserts unrelated business logic — a regression in `useFocusTrap.ts` itself surfaces as a confusing failure in an unrelated modal's test, or not at all if a modal's test doesn't happen to exercise the affected branch (e.g. no current modal test drives the `at === -1` Tab-from-dialog-container case, since only Lightbox uses `focusTarget: 'dialog'` and its own test suite is scoped to Lightbox behavior, not this edge).

**Two initial-focus branches, both load-bearing.** BI-039 Discovery recorded the split explicitly: `focusTarget: 'first'` for form/action modals (avoids an `autoFocus`/restore race) and `focusTarget: 'dialog'` for Lightbox (screen-reader dialog-name announcement, BI-035.5's original choice). Both need direct coverage since they're genuinely different code paths (`if (focusTarget === 'first') ... else dialog.focus()`).

**The `at === -1` entry branch has no current test coverage from any angle.** It fires only when focus sits on the dialog container itself (i.e., `focusTarget: 'dialog'`) and Tab/Shift+Tab is pressed before ever tabbing into a child — Lightbox's own test file doesn't specifically drive this case at the time of this Discovery. This is the clearest instance of "exercised only incidentally... or not at all" from the PLAN line.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — reused `@testing-library/react`'s `render`/`rerender`/`fireEvent`/`cleanup` idiom already established across every `components/*.test.tsx` file and `lib/useWorkspace.test.ts`; no new test-fixture library. Because the harness needs real JSX markup (unlike `useWorkspace.test.ts`'s pure `renderHook`), it's filed as `lib/useFocusTrap.test.tsx` — matching `lib/ImagegenContext.test.tsx`'s precedent for a `lib/` test that renders components — rather than the `.test.ts` extension the PLAN.md line's prose named; `vitest.config.mts`'s include glob already covers `{lib,components}/**/*.test.{ts,tsx}` for exactly this reason.

- [x] **Minimal refactor gate** — test-only; no production code touched.

- [x] Implemented the minimal solution — `lib/useFocusTrap.test.tsx` (11 tests across open/restore, Tab cycling, and Escape).

- [x] Updated/added tests for non-trivial behavior — the suite *is* the deliverable.

**Implementation Notes:**

**Filename deviates from the PLAN.md line's literal `.test.ts`, extension only.** The hook needs a real DOM subtree with focusable children to test directly, so the harness renders JSX (`Opener`/`Dialog` components) rather than calling the hook standalone via `renderHook`. JSX requires a `.tsx` file under this repo's `tsconfig` (`jsx: "preserve"`); `lib/ImagegenContext.test.tsx` is the existing precedent for a `lib/`-scoped test file that renders markup. Everything else about the filed line — direct, sibling, hook-scoped coverage — is unchanged.

**A real gap surfaced in `FOCUSABLE` while writing the exclusion test.** `lib/useFocusTrap.ts`'s `FOCUSABLE` selector only guards `tabindex="-1"` on `input`/`select`/`textarea` and the catch-all `[tabindex]` clause — `button:not([disabled])` and `[href]` have no `:not([tabindex="-1"])` guard, so a `tabIndex={-1}` button or link is *not* excluded from the Tab cycle, contradicting the module's own doc comment ("Disabled controls and explicit `tabIndex={-1}` opt out"). No current consumer is affected (ImportBuilder's only such opt-out is on an `<input>`, which the selector does guard), so this is a latent doc/implementation mismatch, not a live regression. Per the Discovery assumption that this task makes no production-code changes, the exclusion test uses an `<input tabIndex={-1}>` (ImportBuilder's real shape) rather than a button, and this gap is left to file as a follow-up rather than fixed inline.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npx vitest run lib/useFocusTrap.test.tsx`: **11 passed**. Full suite `npm test`: 32 files, **574 passed** (baseline 31 files / 563 — this suite is the entire delta).

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` exit 0, no output; `npm run lint` exit 0, no output.

- [x] **Quality assertions** — no duplication: `Harness`/`Dialog` are one small pair, parameterized by props rather than copy-pasted per describe block, following the sibling `*.test.tsx` render/rerender idiom. No dead code — every export of the harness is used by at least one test. Public surface unchanged — nothing outside the new test file was edited. No stale code-facing documentation: the module header explains why a harness (not `renderHook`) is needed and why the file is `.tsx`; the `FOCUSABLE` gap is documented inline at its one exercised site.

- [x] (frontend) Asked the user for visual confirmation — **N/A**: no UI surface. The change is one test file; nothing renders differently and no production code path moved.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

**`FOCUSABLE` doc/implementation gap (see Implementation Notes).** `button:not([disabled])` and `[href]` don't guard against `tabindex="-1"`, unlike `input`/`select`/`textarea` and the catch-all `[tabindex]` clause. Not a live regression (no current consumer relies on excluding a `tabIndex={-1}` button or link), but the module's own comment claims a broader contract than the selector delivers. Worth a follow-up ticket; not fixed here per this task's test-only scope.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: no change (no user-facing surface moved; the change is a test file). `AGENTS.md`: no change (no workflow or command change). `CLAUDE.md`: no change — its Testing bullet's conventions (tests beside source, real seams) are exactly what this suite follows; no new mock/dependency. `.flowtron/PLAN.md`: updated at this closure (TEST-005 flipped to stub form, standalone → top of `## Completed`).

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form and placed at top of `## Completed`, tasknote moved to `.flowtron/tasknote/archive/test/`.

- [x] **Evidence-based recap** drafted

**Final Summary:**

`lib/useFocusTrap.ts` — previously exercised only incidentally through five modal/Lightbox component test files — now has a direct sibling suite pinning its own contract in isolation: open/restore, managed Tab cycling (including the `at === -1` dialog-container entry case no existing modal test drives), and reactive Escape.

**Changed:** `lib/useFocusTrap.test.tsx` (new, 11 tests). No production code, no config, no dependency changes.

**Verification:** `npx vitest run lib/useFocusTrap.test.tsx` 11/11; `npm test` 574 passed across 32 files (baseline 563/31, so this suite is the entire delta); `npx tsc --noEmit` exit 0; `npm run lint` exit 0.

**Filename note:** `lib/useFocusTrap.test.tsx`, not the PLAN line's literal `.test.ts` — JSX needs `.tsx`, matching `lib/ImagegenContext.test.tsx`'s existing precedent for a `lib/`-scoped test that renders components.

**Real gap surfaced, not fixed.** `FOCUSABLE`'s `button:not([disabled])` and `[href]` branches don't guard `tabindex="-1"` the way `input`/`select`/`textarea` do, contradicting the module's own doc comment. No live consumer is affected today. Left as a follow-up rather than fixed inline, per this task's test-only scope — offered to the operator at closure below.

**Refactors:** none. The minimal-refactor gate held completely — this task added one file and touched nothing else.

**Documentation:** doc-drift sweep clean across all four AI-referenced docs.

**Maintainability effect.** A future edit to `useFocusTrap.ts`'s open/restore effect, Tab-cycle math, or Escape handling now fails loudly in its own suite rather than surfacing as a confusing failure in an unrelated modal's test — or not surfacing at all, as was true of the `at === -1` branch before this task.

**Archived:** 2026-09-09
