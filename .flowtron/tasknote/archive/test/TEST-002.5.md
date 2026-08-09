---
title: gallery-bulk-tests
status: completed
tags: [testing, vitest, component, epic-child]
created: 2026-08-09
due:
related-tasks: [TEST-EPIC-002, TEST-002.2, TEST-002.4]
---

# TEST-002.5 | gallery-bulk-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-002]] [[TEST-002.2]] [[TEST-002.4]]

## 🎯 Goal

Put executable coverage on `GalleryPanel`'s export callbacks and `BulkReviewPane`'s per-task generating/failed states.

## ✅ Acceptance

- [ ] `components/GalleryPanel.test.tsx` covers the header export group: **Folder** /
      **Sheet** / **JSON** each call their respective prop callback
      (`onExportToFolder` / `onExportReviewSheet` / `onExportAll`) on click
- [ ] The export group (and the count badge) is absent when `approved.length === 0`
      and present once `approved.length > 0`
- [ ] The empty-state placeholder copy renders when `approved` is empty
- [ ] `components/BulkReviewPane.test.tsx` covers the three per-task states:
      **generating** (a full `DEFAULT_BATCH_SIZE` skeleton grid, no `ReviewGrid`),
      **failed** (no iteration landed and not generating → the "No batch — generation
      failed for this task." copy, no `ReviewGrid`), and **landed** (`ReviewGrid`
      renders for the task's latest iteration)
- [ ] Landed-state `ReviewGrid` callbacks (`onSetImageDecision` / `onSetImageRating` /
      `onFeedback` / `onIterate`) are proven forwarded with the *owning task's* id
      attached
- [ ] A mixed multi-task render (one generating, one failed, one landed) resolves each
      task to its own state independently
- [ ] `npm test`, `npm run lint`, `npm run typecheck` stay green
- [ ] No production code changed and no new dependency added (test-only task)

## 🧩 Subtasks

- [ ] Add `components/GalleryPanel.test.tsx` following the `ReviewGrid.test.tsx` /
      `TaskDetail.test.tsx` idiom: local `makeApproved(overrides)` fixture,
      `renderGallery(overrides)` helper mounting the real `ImagegenProvider`,
      `await act(async () => {})` drain, explicit vitest imports + hand-wired
      `afterEach(cleanup)`
- [ ] Export-group tests: Folder / Sheet / JSON click → respective callback fires with
      no arguments; group (incl. count badge) absent at `approved.length === 0`
- [ ] Empty-state test: placeholder copy renders when `approved` is `[]`
- [ ] Add `components/BulkReviewPane.test.tsx`: local `makeTask` / `makeIteration` /
      `makeImage` fixtures (mirroring `TaskDetail.test.tsx`), `renderPane(overrides)`
      helper
- [ ] Generating-state test: task id present in `generatingTaskIds` →
      `container.querySelectorAll('.animate-pulse')` has length `DEFAULT_BATCH_SIZE`,
      no `ReviewGrid` rendered
- [ ] Failed-state test: task not generating, no iterations → failure copy renders, no
      `ReviewGrid`
- [ ] Landed-state test: task has a latest iteration → `ReviewGrid` renders; clicking a
      decision/rating/feedback/iterate control reports through with the task's id
      attached (mirrors `TaskDetail.test.tsx`'s task-id-forwarding case)
- [ ] Multi-task test: one task per state (generating / failed / landed) in a single
      render, each resolves independently
- [ ] Verify: `npm test`, lint, typecheck

## 🔗 Related

- [[TEST-EPIC-002]] — parent epic; component-test coverage, Discovery from audit-repo
- [[TEST-002.2]] — sibling; established the local-fixture + real-provider-mount idiom this task extends
- [[TEST-002.4]] — immediate predecessor; most recent sibling applying the same idiom

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Both files have zero test coverage. `components/GalleryPanel.tsx`
  (157 lines) — its three export callbacks (`onExportAll` / `onExportToFolder` /
  `onExportReviewSheet`) are prop-driven UI wiring with no test pinning that Folder /
  Sheet / JSON actually fire the right one. `components/BulkReviewPane.tsx` (85 lines)
  — its per-task conditional (generating skeleton / failed copy / landed `ReviewGrid`)
  is exactly the shape `TaskDetail.test.tsx` already proved worth pinning for the
  single-task case (TEST-002.3's skeleton-count assertion), but nothing exercises it
  here where it runs once per task in a loop.

- [x] Read relevant source files — `components/GalleryPanel.tsx` (whole file: the
  export button group at `:71-95` gated on `approved.length > 0`, the count badge at
  `:65-69`, the empty state at `:99-104`, `downloadImage` + the per-item ↓ button at
  `:37-46`/`:127-139`), `components/BulkReviewPane.tsx` (whole file: the per-task
  branch at `:59-79` — generating skeleton / `ReviewGrid` / failure copy), `lib/types.ts`
  (`ApprovedImage`, `PromptTask`, `Iteration`, `ReviewDecision`, `StarRating`, `ID`),
  `lib/useWorkspace.ts` (`DEFAULT_BATCH_SIZE`), `lib/ImagegenContext.tsx` +
  `lib/imageBlob.ts` (provider requirement + `resolveBlob` shape),
  `components/ReviewGrid.test.tsx` + `components/TaskDetail.test.tsx` (the idioms to
  extend — local fixtures, real-provider mount, `.animate-pulse` skeleton-count
  assertion, task-id-forwarding case).

- [x] **Best Practices Review** — two new test files; no runtime code moves, so no
  dependency direction or abstraction boundary changes. Extends the established
  local-fixture + real-`ImagegenProvider`-mount idiom (`ReviewGrid.test.tsx` →
  `TaskDetail.test.tsx` → `Lightbox.test.tsx`) rather than inventing a new harness
  shape. Fixtures stay file-local per that same precedent (`ApprovedImage` and
  `PromptTask` are both small, task-specific shapes — sharing a fixture module would
  cost more than it saves). No refactor required in scope.

- [x] **Archive skim** — `grep -lE "GalleryPanel|BulkReviewPane" .flowtron/tasknote/archive/*/*.md`
  → 24 hits total; narrowed by mention-count to the load-bearing ones. Findings
  recorded below.

- [x] **Drift check** — the PLAN line names two behaviours: "`GalleryPanel` export
  callbacks" and "`BulkReviewPane` per-task generating/failed states." Both verified
  current: `GalleryPanel`'s Folder/Sheet/JSON group (`:73-93`) is gated on
  `approved.length > 0` and wired one-to-one to the three callback props exactly as
  BI-021.4 left it; `BulkReviewPane`'s per-task ternary (`:59-79`) still branches on
  `generating` → skeleton, `latest` → `ReviewGrid`, else → the failure line, unchanged
  since BI-015. No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit
  assumptions

  **No clarifications needed.** Explicit assumptions, in the spirit of the epic's
  existing siblings (test-only, minimal-necessary-surface):

  1. **Test-only task.** No production code changes, no new dependency (3-dep tree
     holds) — every sibling in `TEST-EPIC-002` has held this line.
  2. **Real `ImagegenProvider` wrapper for both files.** `GalleryPanel` renders
     `ResolvedImage` (thumbnails) and conditionally `Lightbox`; `BulkReviewPane`
     renders `ReviewGrid`, which itself renders `ResolvedImage`. All three throw
     outside a provider. Mounting the real one is the established precedent
     (TEST-002.2/.3/.4) — happy-dom exposes no `indexedDB`, so the handle-restore
     effect resolves to `null`, and `https:` fixture URLs pass through
     `resolveDisplayUrl` untouched.
  3. **`GalleryPanel`'s per-item ↓ download button is out of scope.** The PLAN line
     names "export callbacks" — the three header buttons. The per-item download
     (`downloadImage` → `resolveBlob` → `downloadBlob`) is a different, already
     byte-resolution-hardened path (BI-029.2 owns `resolveImageBlob` + its own unit
     tests in `lib/imageBlob.test.ts`); pinning it here would be new scope, not the
     named gap, and would need a `resolveBlob` mock/stub the other GalleryPanel tests
     don't otherwise require.
  4. **`GalleryPanel`'s thumbnail → `Lightbox` wiring is out of scope.** Structurally
     identical to `ReviewGrid`'s lightbox wiring, which TEST-002.2 already pinned, and
     the overlay itself is TEST-002.4's file. Re-asserting the same open/close wiring
     a third time is redundant coverage, not new risk.
  5. **`BulkReviewPane`'s landed-state test asserts *forwarding*, not `ReviewGrid`'s
     own decision/rating/feedback/iterate behaviour** — that behaviour is already
     pinned by `ReviewGrid.test.tsx`. This task's job is proving the per-task closure
     (`(taskId, imageId, decision) => onSetImageDecision(task.id, imageId, decision)`,
     etc.) attaches the right task id, mirroring `TaskDetail.test.tsx`'s existing
     "forwards the review-grid callbacks with the task id attached" case.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive finds:**

- **BI-008** — `GalleryPanel`'s origin. Established the right-side-panel /
  Sidebar-mirroring layout, the fetch-to-blob download strategy (later hardened by
  BI-029.2), and that bulk export starts as JSON-manifest-only. Confirms the export
  affordance has been callback-driven (`onExportAll`) since day one.
- **BI-015** — `BulkReviewPane`'s origin. Explicit design intent: "presentational
  only — the fired-task set and exit behavior live in Workspace." The skeleton grid
  reuses `TaskDetail`'s in-flight idiom (predates `TaskDetail.test.tsx`, which pinned
  it later in TEST-002.3); the "generation failed" line is the else-branch for a
  fired task whose batch never landed.
- **BI-021.4** — grew the export group from two buttons (Folder/JSON) to three
  (Folder/Sheet/JSON), confirming the header group is a stable, growing callback
  surface — exactly what this task's Acceptance pins so a fourth addition doesn't
  silently mis-wire.
- **BI-029.2** — routed `GalleryPanel.downloadImage` through the new `resolveBlob`
  seam and narrowed its `window.open` CORS fallback away from `imagegen:` URLs. Owns
  its own unit coverage (`lib/imageBlob.test.ts`) — the reason assumption 3 above
  keeps the per-item download out of this task's scope.
- **BI-031.2 / BI-031.N** — confirmed (Discovery-time assumption, re-verified at
  audit) that `BulkReviewPane` grows no generate affordance; it only reviews an
  already-fired round. Nothing here changes that — this task adds no interaction
  surface, only coverage of the existing one.
- **TEST-002.3** (`TaskDetail.test.tsx`) — the direct precedent for both the
  `.animate-pulse` skeleton-count assertion (`DEFAULT_BATCH_SIZE`) and the
  task-id-forwarding pattern this task's landed-state test mirrors.

Discovery surfaced no significant scope deviation — both PLAN-named behaviours
verified current, no re-scope/de-scope, only explicit narrowing assumptions (out of
scope: per-item download, lightbox wiring, `ReviewGrid`'s own decision logic — all
already covered elsewhere) → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the sibling idiom rather than inventing one: local
  fixture factories (`makeApproved` / `makeTask` + `makeIteration` + `makeImage`, in
  the shape of `ReviewGrid.test.tsx` / `TaskDetail.test.tsx`), a `render<X>(overrides)`
  helper returning `vi.fn()` handlers, the real-provider mount + `await act(async () =>
  {})` drain carried over verbatim, and explicit vitest imports with hand-wired
  `afterEach(cleanup)` (no `globals: true`). Two new test files, no new harness shape.

- [x] **Minimal refactor gate** — no refactor; no production code touched at all. Both
  components already carry every query handle the tests use (labelled buttons,
  `role="radio"` stars from `ReviewGrid`, the `.animate-pulse` skeleton class,
  plain-text failure/task-name copy), so nothing test-only was added.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`components/GalleryPanel.test.tsx` (new, 165 lines) — 7 tests in three describes:
empty state (placeholder copy, no export group, no count badge), export group (badge +
all three buttons appear once populated; Folder/Sheet/JSON each report exactly their
own callback and no others), item rendering (task name labels each entry).

`components/BulkReviewPane.test.tsx` (new, 195 lines) — 6 tests in four describes:
generating (full `DEFAULT_BATCH_SIZE` skeleton grid, no `ReviewGrid`, no failure copy;
the "· generating…" label), failed (the fixed failure line, no grid, no skeletons),
landed (round label + `ReviewGrid` renders; decision/feedback callbacks report with the
task id attached), and a mixed multi-task render proving one generating + one failed +
one landed task resolve independently in the same pane, including a rating click on
the landed task's card reporting the right task id.

**Finding — `getByText` needs a substring matcher across two of these copy strings.**
Both `GalleryPanel`'s empty-state paragraph (`Approved images appear here.<br
/>Mark…`) and `BulkReviewPane`'s task label (`{task.name}{' · generating…'}`) split
their visible copy into sibling text nodes under one element rather than a single text
node, so RTL's exact-string `getByText` doesn't match either — caught by running the
tests, not by inspection. Both use a regex matcher instead; not a component defect,
just how JSX text interpolation renders.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — no avoidable duplication: fixtures stay file-local per
  the sibling-established precedent (`ApprovedImage`/`PromptTask` are small,
  task-specific shapes; sharing would cost more than it saves). No dead code: every
  spy/fixture is consumed by at least one test. No unexplained complexity: the one
  non-obvious construct (`await act(async () => {})` provider drain) is documented in
  both file headers, matching the existing convention. No public-surface growth:
  nothing exported, no production file changed. No stale docs: neither component's
  header comment claims test coverage state, so nothing to update.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** Test-only task; no
  rendered app surface changed and no production file was touched (`git diff --stat
  components/GalleryPanel.tsx components/BulkReviewPane.tsx` is empty after the
  mutation pass below).

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
| `npm test` | 262 passed / 17 files | **305 passed / 19 files** |
| `npm run lint` | clean | clean |
| `npm run typecheck` | clean | clean |

**Mutation check — the criterion that matters here.** Four targeted mutations against
`GalleryPanel.tsx` / `BulkReviewPane.tsx`, each restored from a pristine copy
afterward:

| Mutation | Failing test(s) |
|---|---|
| `GalleryPanel`: Folder button's `onClick` swapped to `onExportAll` | reports Folder export |
| `GalleryPanel`: the `approved.length > 0` gate hard-coded `false` | count badge + all three button-visibility/click tests (4) |
| `BulkReviewPane`: `generating` hard-coded `false` | the generating-skeleton test, plus the mixed multi-task test (skeleton count + no-failure-copy expectations) |
| `BulkReviewPane`: `onSetDecision` forwarded a hard-coded task id instead of `task.id` | forwards the review-grid callbacks with the owning task id attached |

Every mutation failed on exactly the test(s) written for it. `git diff --stat
components/GalleryPanel.tsx components/BulkReviewPane.tsx` confirmed both files clean
after each restore.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface (gallery export buttons, bulk review); this task adds coverage, not surface. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only. |
  | `CLAUDE.md` | **No change.** Its Testing bullet already states the glob, the no-`globals` consequence, and the real-seam-over-`vi.mock` default — all three still accurate; this task is another instance of the stated rule, not a change to it. |
  | `.flowtron/PLAN.md` | **Updated.** TEST-002.5 flipped to stub form and kept 2-space nested beneath the active `TEST-EPIC-002` parent. |

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.`, kept 2-space
  nested beneath the active `TEST-EPIC-002` parent in `## Medium` per SPEC/epic.md
  §"Child placement invariant", then tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Put executable coverage on `components/GalleryPanel.tsx`'s three export callbacks and
`components/BulkReviewPane.tsx`'s per-task generating/failed/landed states — both
shipped (BI-008, BI-015) and grew (BI-021.4, BI-029.2) with no test file, under the
same then-standing "presentational components go untested" convention TEST-EPIC-002
exists to retire.

**Changed:** `components/GalleryPanel.test.tsx` (new, 165 lines, 7 tests) and
`components/BulkReviewPane.test.tsx` (new, 195 lines, 6 tests). No production code
touched; no dependency added (3-dep tree holds).

**Verification:** `npm test` 262→**305 passed**, 17→**19 files**; lint and typecheck
green. The load-bearing check is the mutation pass: four targeted breaks (a mis-wired
export button, a hard-coded-`false` visibility gate, a disabled generating branch, and
a hard-coded task id in the forwarding closure) each failed on exactly the test written
for it. `git diff --stat` on both production files confirmed clean after every
mutation.

**Scope decisions:** the per-item ↓ download button and the thumbnail→`Lightbox`
wiring on `GalleryPanel` were deliberately left uncovered here — the first is
BI-029.2's `resolveImageBlob` seam (already unit-tested at `lib/imageBlob.test.ts`),
the second is structurally identical to `ReviewGrid`'s lightbox wiring already pinned
by TEST-002.2/.4. Both are the named "export callbacks" gap's neighbors, not the gap
itself, and adding them would have been redundant coverage rather than new risk. All
logged as explicit Discovery assumptions rather than silently narrowed.

**Refactors:** none made or deferred — both components already exposed every query
handle the tests needed (labelled buttons, the `.animate-pulse` skeleton class, plain
task-name/failure-copy text).

**Docs:** all four AI-referenced docs swept — three verified unchanged with reasons,
`PLAN.md` updated with this task's stub form.

**Maintainability:** the export header's three callbacks (Folder/Sheet/JSON) are a
button group that has grown once already (BI-021.4) and will likely grow again; a
future fourth button now has three passing tests to break if it mis-wires. The bulk
pane's per-task branch — the one place `BulkReviewPane` differs from `TaskDetail`'s
single-task analogue — is now pinned for all three states plus the task-id-forwarding
closure that is this component's only real logic, in a single multi-task render that
would have caught the kind of task-id mix-up a copy-paste refactor risks most.

**Archived:** 2026-08-09
