---
title: import-reference-tests
status: completed
tags: [testing, vitest, component, epic-child]
created: 2026-08-09
due:
related-tasks: [TEST-EPIC-002, TEST-002.3]
---

# TEST-002.6 | import-reference-tests

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[TEST-EPIC-002]] [[TEST-002.3]]

## 🎯 Goal

Put executable coverage on `ImportBuilder`'s paste/upload/edit/download wiring and `ReferenceLibrary`'s upload/validate/select/remove wiring.

## ✅ Acceptance

- [x] `components/ImportBuilder.test.tsx` — "Add from paste" with non-empty text calls
      `parsePastedPrompts`, appends one row per block, and clears the textarea
- [x] Paste guard: empty/whitespace-only paste shows "Nothing to add…" and adds no rows
- [x] `.txt` upload: one or more files each becomes a row (filename sans `.txt` → name,
      file contents → prompt)
- [x] Row edit: editing a row's name/prompt input updates only that row
- [x] Row remove: clicking ✕ drops the row from the list
- [x] Download guards: the download button is `disabled` at zero rows (the component
      gates the click, not a post-click notice — corrected from the Discovery-time
      assumption once the code made this concrete, see Implementation Notes); a
      blank-name row leaves the button enabled but clicking shows "Every task needs a
      name…" and triggers no download
- [x] Download success: valid rows trigger a `tasks.json` browser download (verified via
      the `URL.createObjectURL`/anchor-click stub idiom from `lib/storage.test.ts`) whose
      emitted JSON carries the trimmed names/prompts
- [x] `components/ReferenceLibrary.test.tsx` — an image under the 2MB cap ingests: calls
      `onAddRefImage` with a ref built from the decoded dataURL + dimensions
- [x] Rejection: a non-image file and an oversized image are each skipped with a per-file
      warning message; `onAddRefImage` not called for either
- [x] Mixed `FileList` (valid + rejected together): valid entries ingest while rejected
      ones are reported in one combined warning
- [x] Selection wiring: clicking a thumbnail calls `onToggleRef(task.id, ref.id)`;
      clicking its ✕ calls `onRemoveRefImage(ref.id)`
- [x] Cap enforcement: at `MAX_ACTIVE_REFS` selected, unselected thumbnails render
      `disabled`; already-selected ones stay clickable (can still deselect)
- [x] Empty library renders the "No reference images yet." placeholder; a non-empty
      library renders one thumbnail per entry
- [x] `npm test`, `npm run lint`, `npx tsc --noEmit` stay green
- [x] No production code changed and no new dependency added (test-only task)

## 🧩 Subtasks

- [x] Add `components/ImportBuilder.test.tsx`: local `renderBuilder()` helper (no provider
      needed — neither component resolves images), explicit vitest imports +
      `afterEach(cleanup)`
- [x] Paste tests: non-empty paste appends rows + clears textarea; empty/whitespace paste
      shows the "Nothing to add" notice
- [x] `.txt` upload test: single + multi-file `FileList` via the hidden input's `onChange`,
      relying on the existing `File.text()` precedent (`lib/imagegenFs.test.ts`) — no
      `FileReader` stub needed here
- [x] Row edit/remove tests: change a row's inputs, confirm isolation from other rows;
      remove a row and confirm it's gone
- [x] Download tests: zero-rows guard, blank-name guard, and a success case reusing the
      `vi.stubGlobal('URL', {...})` + `HTMLAnchorElement.prototype.click` spy idiom from
      `lib/storage.test.ts` (`captureDownloads`-style helper), parsing the captured blob
      JSON to assert trimmed names/prompts
- [x] Add `components/ReferenceLibrary.test.tsx`: stub `FileReader` (`readAsDataURL` →
      synchronous `onload`) and `Image` (`src` setter → synchronous `onload` with fixed
      `naturalWidth`/`naturalHeight`) globals for deterministic `ingest()` resolution,
      since happy-dom's real implementations don't reliably fire decode callbacks
- [x] Local `makeTask(overrides)` / `makeRef(overrides)` fixtures + a `renderLibrary(overrides)`
      helper (mirrors `GalleryPanel.test.tsx`'s local-fixture idiom)
- [x] Ingest tests: valid image → `onAddRefImage` called with the decoded shape; non-image
      → rejected with the "(not an image)" warning; oversized → rejected with the size
      warning; a mixed FileList exercises both paths in one ingest call
- [x] Selection tests: thumbnail click → `onToggleRef`; ✕ click → `onRemoveRefImage`; at
      `MAX_ACTIVE_REFS` selected, assert `disabled` on an unselected thumbnail and enabled
      on a selected one
- [x] Empty/non-empty library render tests
- [x] Verify: `npm test`, lint, typecheck

## 🔗 Related

- [[TEST-EPIC-002]] — parent epic; component-test coverage, Discovery from audit-repo
- [[TEST-002.3]] — `TaskDetail.test.tsx`'s header explicitly defers `ReferenceLibrary`'s
  own upload/remove path to this task ("belongs to TEST-002.6")

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Both files have zero test coverage. `components/ImportBuilder.tsx`
  (236 lines) — its paste-parse, `.txt`-upload, row-edit/remove, and download-validation
  wiring is entirely untested; the pure functions it calls (`parsePastedPrompts`,
  `serializeTaskImport`) are unit-tested in `lib/storage.test.ts`, but nothing exercises
  the component gluing them to the UI. `components/ReferenceLibrary.tsx` (172 lines) —
  its `ingest()` validation (type/size rejection), `FileReader`/`Image()` decode, and
  selection/removal wiring is untested; the pure `Session` mutations it calls
  (`newRefImage`, `addRefImage`, `removeRefImage`, `toggleTaskRefImage`) are unit-tested
  in `lib/workspace.test.ts`. `TaskDetail.test.tsx` (TEST-002.3) explicitly flagged this
  gap: "the pure reducer cap is already covered at `lib/workspace.test.ts`, and
  `ReferenceLibrary`'s own upload/remove path belongs to TEST-002.6."

- [x] Read relevant source files — `components/ImportBuilder.tsx` (whole file: paste
  parse at `:53-62`, `.txt` upload at `:64-72`, row edit/remove at `:74-80`, download
  validation at `:82-93`, Esc-close at `:38-44`), `components/ReferenceLibrary.tsx`
  (whole file: `readDataUrl`/`readDimensions` at `:30-47`, `ingest()` validation at
  `:63-79`, selection/removal thumbnail grid at `:132-168`), `lib/storage.ts:495-526`
  (`parsePastedPrompts`, `serializeTaskImport`, `downloadTaskImport` — pure, already
  unit-tested), `lib/workspace.ts:35,89-97` (`MAX_ACTIVE_REFS = 3`, `newRefImage`),
  `lib/types.ts:57-67` (`RefImage`), `lib/storage.test.ts:446-565` (the
  `URL.createObjectURL`/`HTMLAnchorElement.prototype.click` download-stub idiom to
  reuse for the `tasks.json` download test), `lib/imagegenFs.test.ts` (confirms
  `File.text()` works under happy-dom — no stub needed for the `.txt` upload path),
  `components/GalleryPanel.test.tsx` (local-fixture + real-render idiom for a
  provider-free component), `components/TaskDetail.tsx:132-139` (how `ReferenceLibrary`
  is wired — `task`/`library`/three callback props, no provider dependency).

- [x] **Best Practices Review** — two new test files; no runtime code moves, so no
  dependency direction or abstraction boundary changes. Extends the established
  local-fixture idiom (`GalleryPanel.test.tsx`) for the provider-free case, and the
  `vi.stubGlobal`/spy download-stub idiom already proven in `lib/storage.test.ts` rather
  than inventing a new harness shape. No refactor required in scope.

- [x] **Archive skim** — `grep -l "ImportBuilder\|ReferenceLibrary"
  .flowtron/tasknote/archive/*/*.md` → 11 hits; narrowed by mention-count to the
  load-bearing ones (`BI-004`, `BI-021.3`, `TEST-002.3`). Findings recorded below.

- [x] **Drift check** — the PLAN line names `ImportBuilder` parse/compose paths and
  `ReferenceLibrary` add/remove. Both verified current against the code just read: no
  line-number or behavior drift since BI-021.3 (`ImportBuilder`'s origin, 2026-06-14)
  and BI-004 (`ReferenceLibrary`'s origin, 2026-06-06). No intervening task touched
  either file's DOM-facing logic (confirmed by the archive skim below).

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit
  assumptions

  **No clarifications needed.** Explicit assumptions, in the spirit of the epic's
  existing siblings (test-only, minimal-necessary-surface):

  1. **Test-only task.** No production code changes, no new dependency (3-dep tree
     holds) — every sibling in `TEST-EPIC-002` has held this line.
  2. **No provider wrapper needed.** Unlike `ReviewGrid`/`TaskDetail`/`BulkReviewPane`/
     `GalleryPanel`, neither component renders `ResolvedImage` or otherwise resolves an
     `imagegen:`-scheme URL — `ReferenceLibrary` renders raw `<img src={ref.dataUrl}>`
     from an already-decoded data URL, and `ImportBuilder` renders no images at all. No
     `ImagegenProvider` mount required (a first for this epic's test files).
  3. **`FileReader`/`Image` stubbed for `ReferenceLibrary`, not relied on natively.**
     happy-dom's `FileReader`/`Image` decode timing is not a dependable browser-parity
     guarantee; stubbing both (synchronous `onload`) keeps the ingest tests deterministic
     — same rationale as the existing `URL`/`HTMLAnchorElement.click` stubs in
     `lib/storage.test.ts`. `.txt` upload in `ImportBuilder` needs no such stub —
     `File.text()` already works under happy-dom per `lib/imagegenFs.test.ts`.
  4. **Modal chrome (Esc-close, backdrop-click-close) is out of scope for
     `ImportBuilder`.** The PLAN line names "parse/compose paths" specifically; Esc/
     backdrop-close is generic dialog chrome shared with `FeedbackModal`/`IterateModal`,
     not this task's named risk. (Unlike TEST-002.5's exclusions, this one isn't already
     pinned elsewhere — flagged here as a real, consciously deferred gap, not a
     redundant-coverage one.)
  5. **`ReferenceLibrary`'s drag-and-drop path is exercised via `fireEvent.drop`'s
     `dataTransfer.files`, not the separate `dragOver`/`dragLeave` `dragging` visual
     state** — the drop handler calls the same `ingest()` as the file-input `onChange`,
     so one ingestion path covers both entry points; the `dragging` boolean is
     presentational-only and not asserted.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive finds:**

- **BI-004** — `ReferenceLibrary`'s origin. Established the pure/hook/component split
  (DOM concerns — drag-drop, `FileReader`, `Image()` decode, size/type validation — live
  in the component; `Session` mutations are pure and unit-tested in `lib/workspace.ts`)
  and that references stay fully optional. Confirms `ingest()`'s validation order (type
  check → size check → decode) hasn't changed since.
- **BI-021.3** — `ImportBuilder`'s origin. Explicit design intent: the modal "calls the
  lib helpers directly (no session mutation, ReferenceLibrary precedent)" — confirms
  this task's read that `ImportBuilder` is provider-free and mutates no session state,
  only local component state. Also the source of the download-only / fixed-filename /
  validate-before-download assumptions still true in the code read above.
- **TEST-002.3** — direct pointer: `TaskDetail.test.tsx`'s header explicitly defers
  `ReferenceLibrary`'s own upload/remove path to this task, and confirms the reference
  cap is already asserted there only as a UI affordance (disabled thumbnail, counter) —
  this task owns the underlying `ingest()`/selection wiring, not a re-assertion of the
  cap's existence.

Discovery surfaced no significant scope deviation — both PLAN-named behaviours verified
current, no re-scope/de-scope, only explicit narrowing assumptions (out of scope: modal
chrome, drag-visual-state) and one new-to-this-epic technique (stubbing `FileReader`/
`Image` for determinism) → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended established idioms rather than inventing new ones:
  `GalleryPanel.test.tsx`'s local-fixture + `render<X>(overrides)` helper shape (no
  provider needed here — a first for this epic, since neither component resolves
  images); `lib/storage.test.ts`'s `URL.createObjectURL` / `HTMLAnchorElement.prototype
  .click` download-stub idiom, reused verbatim for the `tasks.json` download test;
  `TaskDetail.test.tsx`'s `getByRole('button', { name: '<id>.png' })` thumbnail query
  (accessible name via the descendant `<img alt>`) and `MAX_ACTIVE_REFS`-cap assertion
  shape. One new technique: stubbing `FileReader`/`Image` as classes assigned via
  `vi.stubGlobal`, following the same `vi.unstubAllGlobals()`-in-`afterEach` convention
  the download stub already established — no new harness family, just a new pair of
  globals under the existing stubbing idiom.

- [x] **Minimal refactor gate** — no refactor; no production code touched. Both
  components already exposed every query handle the tests needed (labelled inputs,
  role-derived buttons, `title` attributes, plain-text notice/warning copy).

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`components/ImportBuilder.test.tsx` (new, 197 lines) — 8 tests in four describes: paste
(row-per-block + textarea clear; empty-paste notice), `.txt` upload (filename→name,
contents→prompt for a multi-file `FileList`), row edit/remove (per-row isolation;
removal), and download gates (disabled at zero rows; blank-name click-through notice;
a success case that captures the emitted blob and asserts its parsed JSON).

`components/ReferenceLibrary.test.tsx` (new, 258 lines) — 10 tests in three describes:
ingest (valid image → `onAddRefImage` with the decoded shape; non-image rejection;
oversized rejection; a mixed `FileList` exercising both paths in one `ingest()` call),
selection wiring (toggle, remove, cap-disables-unselected, cap-leaves-selected-clickable),
and library rendering (empty placeholder, one thumbnail per entry).

**Correction against the Discovery-time plan.** The zero-rows download guard
(`handleDownload`'s `rows.length === 0` branch) turned out to be unreachable via real UI
interaction — the Download button is *also* `disabled` at `rows.length === 0`
(`ImportBuilder.tsx:227`), so a user can never trigger that notice through a click. Read
the button's `disabled` DOM property instead of simulating a click-then-notice, which is
what the component actually guarantees. The blank-name guard has no such disabling
condition, so that one keeps the original click-then-notice assertion. Small
implementation-detail correction surfaced while writing the test, not a scope change —
handled inline per Phase 2 rather than re-opening Discovery.

**`FileReader`/`Image` stub design.** Both fakes resolve via `queueMicrotask` (not
synchronously) to mirror the real APIs' async callback timing without depending on
happy-dom's actual decode support; a small `flush()` helper (two macrotask ticks, wrapped
in `act`) drains `ingest()`'s two sequential `await`s (`readDataUrl` then
`readDimensions`) before assertions run.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — no avoidable duplication: the `FileReader`/`Image` stub
  classes and the `URL`/anchor-click download stub each earn their file-local placement
  (only `ReferenceLibrary.test.tsx` needs the decoder stubs; only the download tests need
  the anchor stub), matching how `lib/storage.test.ts` scopes its own `captureDownloads`
  helper. No dead code: every fixture/spy is consumed by at least one test. No
  unexplained complexity: the one non-obvious construct (`flush()`'s double-macrotask +
  `act` wrap) is documented at its definition. No public-surface growth: nothing
  exported, no production file changed. No stale docs: neither component's header
  comment claims test coverage state, so nothing to update.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** Test-only task; no
  rendered app surface changed and no production file was touched (confirmed by
  `git diff --stat` on both components after the mutation-check restores below).

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

| Gate | Before | After |
|---|---|---|
| `npm test` | 305 passed / 19 files | **323 passed / 21 files** |
| `npm run lint` | clean | clean |
| `npx tsc --noEmit` | clean | clean |

**Mutation check — the criterion that matters here.** Three targeted mutations, each
restored from a pristine copy afterward:

| Mutation | Failing test(s) |
|---|---|
| `ImportBuilder`: the blank-name download guard hard-coded `false` | blocks download and shows a notice when any row has a blank name |
| `ReferenceLibrary`: `onToggleRef(task.id, ...)` hard-coded a wrong task id | clicking a thumbnail calls onToggleRef… (2 — both the toggle test and the cap-clickable test exercise this line) |
| `ReferenceLibrary`: the size-cap rejection branch hard-coded `false` | rejects an oversized image with a per-file warning |

Every mutation failed on exactly the test(s) written for it. `git diff --stat
components/ImportBuilder.tsx components/ReferenceLibrary.tsx` confirmed both files
clean after each restore.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface; this task adds coverage, not surface. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only. |
  | `CLAUDE.md` | **No change.** Its Testing bullet already states the glob, the no-`globals` consequence, and the real-seam-over-`vi.mock` default — all three still accurate; this task is another instance of the stated rule. |
  | `.flowtron/PLAN.md` | **Updated.** TEST-002.6 flipped to stub form and kept 2-space nested beneath the active `TEST-EPIC-002` parent. |

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.`, kept 2-space
  nested beneath the active `TEST-EPIC-002` parent in `## Medium` per SPEC/epic.md
  §"Child placement invariant", then tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Put executable coverage on `components/ImportBuilder.tsx`'s paste/upload/edit/download
wiring and `components/ReferenceLibrary.tsx`'s upload/validate/select/remove wiring —
both shipped (BI-021.3, BI-004) with their pure-function dependencies already
unit-tested (`lib/storage.test.ts`, `lib/workspace.test.ts`) but zero coverage on the
DOM-facing component gluing them together. `TaskDetail.test.tsx` (TEST-002.3) had
explicitly named `ReferenceLibrary`'s upload/remove path as this task's gap.

**Changed:** `components/ImportBuilder.test.tsx` (new, 197 lines, 8 tests) and
`components/ReferenceLibrary.test.tsx` (new, 258 lines, 10 tests). No production code
touched; no dependency added (3-dep tree holds).

**Verification:** `npm test` 305→**323 passed**, 19→**21 files**; lint and typecheck
green. The load-bearing check is the mutation pass: three targeted breaks (a disabled
blank-name guard, a wrong-task-id forwarding bug, and a disabled size-cap rejection)
each failed on exactly the test(s) written for them. `git diff --stat` on both
production files confirmed clean after every mutation restore.

**Scope decisions:** `ImportBuilder`'s Esc-close/backdrop-click-close were deliberately
left uncovered — generic dialog chrome shared with `FeedbackModal`/`IterateModal`, not
the PLAN line's named "parse/compose paths" risk, and not already pinned elsewhere (a
real, consciously deferred gap rather than redundant coverage, unlike this epic's usual
exclusions). `ReferenceLibrary`'s drag-over/drag-leave visual `dragging` state was
likewise left unasserted — presentational only, and the drop handler funnels through
the same `ingest()` the file-input tests already exercise.

**Refactors:** none made or deferred — both components already exposed every query
handle the tests needed.

**Docs:** all four AI-referenced docs swept — three verified unchanged with reasons,
`PLAN.md` updated with this task's stub form.

**Maintainability:** `ImportBuilder`'s download path (the emitted `tasks.json` — the
actual adopter-facing deliverable) now has a test parsing the real blob JSON, not just
asserting a callback fired; a future change to `parsePastedPrompts`'s auto-naming or
`serializeTaskImport`'s shape that broke the round-trip would now fail here first.
`ReferenceLibrary`'s `ingest()` — the one place file-type/size validation and
`FileReader`/`Image` decode timing meet — is now pinned end-to-end via the new
deterministic-stub pattern this task introduces, which the next component needing
`FileReader`/`Image` (none currently in the epic) can copy directly.

**Archived:** 2026-08-09
