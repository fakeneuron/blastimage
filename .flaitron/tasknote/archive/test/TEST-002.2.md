---
title: review-grid-tests
status: completed
tags: [testing, vitest, component, epic-child]
created: 2026-08-09
due:
related-tasks: [TEST-EPIC-002, TEST-001.2, TEST-001.3, BI-005, BI-006, BI-009, BI-027]
---

# TEST-002.2 | review-grid-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-002]] [[TEST-001.3]] [[BI-005]]

## 🎯 Goal

Put executable coverage on `components/ReviewGrid.tsx` — the review loop's primary
interaction surface, which shipped across BI-005 / BI-006 / BI-009 / BI-027 with
zero component tests under the then-standing "presentational components go
untested" convention.

## ✅ Acceptance

- [ ] `components/ReviewGrid.test.tsx` pins the four behaviours the PLAN line names:
      decision set, decision clear (clicking the active decision → `undecided`),
      star rating set + clear, and the `onFeedback` / `onIterate` callbacks
- [ ] Both directions of the `Iterate →` gate are asserted — rendered for `kept`,
      absent for `approved` / `discarded` / `undecided` (BI-009: approved is final)
- [ ] The decision state is asserted as the user sees it (`aria-pressed` + the
      corner badge), not just as a callback argument
- [ ] The feedback button's two states are pinned (`Feedback` vs `💬 Edit feedback`
      + the saved-text tooltip, BI-006)
- [ ] Assertions are **live** — verified by mutation (breaking a branch in
      `ReviewGrid.tsx` makes the suite fail, and fails the test written for it)
- [ ] `npm test`, `npm run lint`, `npm run typecheck` stay green
- [ ] No production code changed and no new dependency added (test-only task)

## 🧩 Subtasks

- [ ] Add `components/ReviewGrid.test.tsx` with a local `makeImage` / `makeIteration`
      fixture pair + a `renderGrid(overrides)` helper, following the
      `Sidebar.test.tsx` / `DeleteTaskModal.test.tsx` idiom
- [ ] Wrap the render in the real `ImagegenProvider` (`ReviewGrid` → `ResolvedImage`
      → `useImagegen` throws outside one); same precedent as `Workspace.test.tsx`
- [ ] Decision tests: each of Keep / Discard / Approve reports its value; clicking
      the active one reports `undecided`; the active button is `aria-pressed` and
      the matching badge renders
- [ ] Rating tests: clicking star N reports N; clicking the current value reports 0
- [ ] Feedback tests: `onFeedback(imageId)` fires; the button label + `title`
      tooltip flip once feedback exists (incl. the "use as reference" suffix)
- [ ] Iterate tests: button present only for `kept`; `onIterate(imageId)` fires
- [ ] Lightbox wiring: clicking a thumbnail opens the lightbox on *that* card's
      image (ReviewGrid-owned state; the overlay's own behaviour is [[TEST-002.4]])
- [ ] Verify: `npm test`, lint, typecheck, plus a mutation pass proving the
      assertions are live

## 🔗 Related

- [[TEST-EPIC-002]] — parent epic; component-test coverage, Discovery supplied by audit-repo
- [[TEST-001.2]] — widened the vitest glob so `.tsx` tests execute at all
- [[TEST-001.3]] — the coverage precedent (fixtures, real-provider mount, mutation check)
- [[BI-005]] — origin of the grid; its Acceptance is effectively this task's spec
- [[BI-006]] — the feedback button's two states
- [[BI-009]] — the keeper-only `Iterate →` button
- [[BI-027]] — the click-to-enlarge lightbox wiring

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `ReviewGrid` is the app's central review surface and still has no
  test file. Its origin tasknotes are explicit that this was a convention, not a
  judgement about risk: BI-009 records *"no component unit test added, consistent
  with `FeedbackModal`/`ReviewGrid` (untested components; pure logic in `lib/` is
  where tests live)"*, and BI-027 notes the vitest include glob was `lib/**/*.test.ts`
  at the time — so a component test literally could not run. TEST-001.2 removed the
  config blocker and TEST-001.3 established the pattern; this task spends it on the
  component carrying the most user-facing branching in the repo.

- [x] Read relevant source files — `components/ReviewGrid.tsx` (the whole file, 206
  lines: `STATE_RING` / `STATE_BADGE` / `DECISIONS` tables, the grid's `lightboxIndex`
  state, and `ReviewCard`'s five interactive controls), `lib/types.ts`
  (`GeneratedImage` / `Iteration` / `ReviewDecision` / `StarRating` / `FeedbackState`),
  `components/ResolvedImage.tsx` + `lib/ImagegenContext.tsx` (the provider requirement),
  `components/Lightbox.tsx` consumers, `components/Sidebar.test.tsx` +
  `components/DeleteTaskModal.test.tsx` + `components/Workspace.test.tsx` (the three
  established test idioms), `vitest.config.ts` + `vitest.setup.ts` (harness).

- [x] **Best Practices Review** — the touched surface is one new test file; no runtime
  code moves, so no dependency direction or abstraction boundary changes. Existing
  abstraction extended: the local-fixture idiom (`makeTask` / `makeSession` /
  `makeProps(overrides)` in `Sidebar.test.tsx`, `renderModal(overrides)` in
  `DeleteTaskModal.test.tsx`) becomes `makeImage` / `makeIteration` /
  `renderGrid(overrides)` here. Fixtures stay file-local: they are ~10 lines and a
  third near-copy is still cheaper than a shared fixtures module across four test
  files (SPEC's DRY-is-contextual framing; TEST-001.3 made the same call). No refactor
  required in scope; none deferred.

- [x] **Archive skim** — `grep -l ReviewGrid .flowtron/tasknote/archive/*/*.md` → nine
  hits (BI-005, BI-006, BI-009, BI-013, BI-015, BI-024.1, BI-027, CORE-001.4,
  TEST-001.2). Load-bearing finds recorded below.

- [x] **Drift check** — the PLAN line cites four behaviours; all four are present and
  unchanged in `components/ReviewGrid.tsx`: decision toggle/clear at `:143`
  (`onSetDecision(image.id, active ? 'undecided' : d.value)`), rating toggle/clear at
  `:165` (`image.rating === n ? 0 : n`), `onFeedback(image.id)` at `:179`, and the
  keeper-gated `onIterate(image.id)` at `:194-201`. The TEST-001.3 harness is intact
  (`include: ["{lib,components}/**/*.test.{ts,tsx}"]`, `@/` alias, automatic JSX
  runtime, no `globals: true`). One prior drift is now *resolved*, not outstanding:
  TEST-001.3 flagged `.flowtron/tasknote/README.md` §"Archive layout" mapping `TEST-*`
  to `archive/testing/`; the table now reads `archive/test/`, matching the three
  tasknotes already archived there. No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit
  assumptions.

  **No clarifications needed.** The scope is a well-bounded test file over behaviour
  that four archived tasknotes already specify. Explicit assumptions:

  1. **Test-only task.** No production code changes, no new dependency (the 3-dep
     tree holds, per BI-021.2). `ReviewGrid` already takes every dependency as a
     prop, so it needs no injection seam and therefore no `vi.mock` — the repo's
     default real-seam approach applies.
  2. **Real `ImagegenProvider` wrapper.** `ReviewGrid` renders `ResolvedImage`, which
     calls `useImagegen()` and *throws* outside a provider. Mounting the real one is
     the TEST-001.3 precedent and is safe here: happy-dom exposes no `indexedDB`, so
     `restoreLinkedImagegenFolder` short-circuits to `null`, and the fixtures use
     `data:`/`https:` URLs, which `resolveDisplayUrl` passes through untouched.
  3. **Lightbox scope split.** The overlay's own behaviour (arrow stepping, Escape,
     focus) is [[TEST-002.4]]. What belongs *here* is `ReviewGrid`'s own state — that
     clicking card *i*'s thumbnail opens the lightbox on image *i*. Covering it here
     is the difference between the wiring being tested by this task and by neither
     task; it costs one test.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive finds:**

- **BI-005** — the grid's origin tasknote. Its Acceptance reads as a pre-written spec
  for this task: *"clicking the active decision clears it back to `undecided`"*,
  *"0–5 star rating control that reads/writes `GeneratedImage.rating`"*, *"Feedback
  button wired to a callback prop"*, *"distinct visual states for kept / discarded /
  approved / undecided"*. Those map 1:1 onto the test cases below.
- **BI-009** — added the `Iterate →` button and states the rule the negative tests
  pin: keepers only, because *"approved = final"*. Also the source of the explicit
  "components go untested" convention this task reverses.
- **BI-006** — the feedback button's two-state behaviour and *why* the saved text is
  a `title` tooltip rather than an inline caption (card compactness, user preference).
  Worth pinning so a future "improve the feedback affordance" change is a conscious
  one.
- **BI-027** — added the thumbnail→lightbox wiring and notes that `BulkReviewPane` is
  covered for free because it renders `ReviewGrid`. That makes this file indirectly
  load-bearing for TEST-002.5's bulk-pane work too.
- **TEST-001.3** — the coverage precedent: local fixtures, real provider mount,
  explicit vitest imports + hand-wired `afterEach(cleanup)` (no `globals: true`), and
  a mutation pass as the proof the assertions are live. Followed here; the one thing
  *not* carried over is `vi.mock`, which TEST-001.3 explicitly scoped to units with
  no injection point.

**Query handles (why the tests can assert on real user-visible state).** The component
is already well-instrumented for accessible queries: decision buttons carry
`aria-pressed`, the star row is a `role="radiogroup"` of `role="radio"` buttons with
`aria-checked` and `N star(s)` labels, and the thumbnail button is labelled
`View full size`. No test-only attributes need to be added to production code.

Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the established component-test idiom rather than
  inventing one: local fixture factories (`makeImage` / `makeIteration`) in the shape
  of `Sidebar.test.tsx`'s `makeTask` / `makeSession`, a single `renderGrid(images)`
  helper returning the `vi.fn()` handlers in the shape of `DeleteTaskModal.test.tsx`'s
  `renderModal(overrides)`, and the real-provider mount + `await act(async () => {})`
  flush from `Workspace.test.tsx`. Explicit vitest imports and hand-wired
  `afterEach(cleanup)` throughout (no `globals: true`). Two small shapes are new:
  `it.each` for the three symmetric decision cases (three near-identical bodies would
  have been the alternative) and `within(dialog)` to disambiguate the alt text the
  card and the lightbox both render. **No `vi.mock`** — `ReviewGrid` takes every
  dependency as a prop, so the repo's default real-seam approach applies and
  TEST-001.3's mock precedent stays scoped to units with no injection point.

- [x] **Minimal refactor gate** — no refactor, and no production code touched at all.
  None was needed: the component already exposes accessible query handles
  (`aria-pressed` on decisions, `role="radio"` + `aria-checked` on stars, labelled
  `View full size` / `Close` buttons), so nothing test-only had to be added to
  `ReviewGrid.tsx`.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`components/ReviewGrid.test.tsx` (new, 246 lines) — 26 tests in five describes,
mapped to the tasknote that shipped each behaviour:

| Describe | Tests | Pins |
|---|---|---|
| decisions (BI-005) | 9 | one card per image; each of Keep/Discard/Approve reports its value; each clears to `undecided` when already active; only the active button is `aria-pressed`; the right badge renders per decision, and none while undecided |
| rating (BI-005) | 4 | star N reports N; the current value clears to `0`; a *different* star re-rates instead of clearing; only the matching star is `aria-checked` |
| feedback (BI-006) | 3 | `onFeedback` carries the clicked card's id (asserted on the second of two cards, so a hardcoded first-image bug cannot pass); the label flips to `💬 Edit feedback`; the tooltip carries the saved text and the `(use as reference)` suffix |
| iterate (BI-009) | 4 | `Iterate →` present and reporting on a keeper; absent for `undecided` / `discarded` / `approved` |
| lightbox wiring (BI-027) | 3 | closed until a thumbnail is clicked; opens on the *clicked* card's image; closes again |

The one non-obvious harness detail: `renderGrid` is async and awaits
`act(async () => {})` after render, draining both `ImagegenProvider`'s mount-time
handle restore and `ResolvedImage`'s resolve effect so no state settles outside
`act`. The two lightbox tests wrap their click the same way, because opening the
overlay mounts a second `ResolvedImage`.

Deliberately *not* covered: the overlay's arrow/Escape/focus behaviour (TEST-002.4),
`BulkReviewPane`'s use of the grid (TEST-002.5), and the CSS ring/dim classes — the
badge is asserted because it is text the reviewer reads; the ring colour is styling.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — no avoidable duplication: the three symmetric decision
  cases collapse into `it.each`, and the ~15 lines of fixture shared in *shape* with
  `Sidebar.test.tsx` stay file-local (a shared fixtures module across four test files
  is still the premature abstraction TEST-001.3 judged it to be; the payloads differ —
  images, not sessions). No dead code: every fixture field is required by
  `GeneratedImage` / `Iteration` and read by the component. No public-surface growth —
  nothing exported, no production file changed. The file's header states why the real
  provider is mounted and where the scope boundary with TEST-002.4 falls, so the next
  reader does not have to re-derive either.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** Test-only task; no
  rendered app surface changed and no production file was touched
  (`git diff --stat components/ReviewGrid.tsx` is empty after the mutation pass).

**Testing Notes:**

| Gate | Before | After |
|---|---|---|
| `npm test` | 213 passed / 15 files | **239 passed / 16 files** |
| `npm run lint` | clean | clean |
| `npm run typecheck` | clean | clean |

**Mutation check — the criterion that matters here.** A test that renders without
asserting the branch is worthless, so seven branches in `ReviewGrid.tsx` were broken
in turn and the suite re-run. Every mutation failed, each on exactly the tests written
for it:

| Mutation to `ReviewGrid.tsx` | Failing test(s) |
|---|---|
| `active ? 'undecided' : d.value` → `d.value` | clears back to undecided … (×3) |
| `image.rating === n ? 0 : n` → `n` | clears to unrated when the current value is clicked again |
| `decision === 'kept'` → `decision !== 'undecided'` | withholds Iterate on a discarded / approved card |
| `setLightboxIndex(i)` → `setLightboxIndex(0)` | opens the lightbox on the image whose thumbnail was clicked |
| feedback label → always `'Feedback'` | flips the label … / notes the reference promotion … |
| `aria-pressed={active}` → `aria-pressed={true}` | marks only the active decision pressed |
| `STATE_BADGE[image.decision]` → `undefined` | badges a kept / discarded / approved card |

The file was restored from a pristine copy after every mutation; `git diff --stat
components/ReviewGrid.tsx` confirmed clean at the end.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface and carries no testing section (`grep -i test README.md` → no hits); a test file is not part of it. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only; its two `test`-matching lines are skill descriptions, untouched. |
  | `CLAUDE.md` | **No change.** Its Testing bullet (added by TEST-001.3) already states the glob, the no-`globals` consequence, and the real-seam-over-`vi.mock` default — all three still accurate, and this task's no-mock choice is an instance of the stated rule rather than a change to it. |
  | `.flowtron/PLAN.md` | **Updated.** TEST-002.2 flipped to stub form, kept 2-space nested beneath the active `TEST-EPIC-002` parent in `## Medium`. |

  Also re-checked §"Project quick commands" and §"Archive layout" (outside the sweep
  list): both accurate — `TEST-*` → `archive/test/` matches where this note lands, and
  the four commands all ran green this session.

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.`, kept 2-space
  nested beneath the active `TEST-EPIC-002` parent in `## Medium` per SPEC/epic.md
  §"Child placement invariant", then tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Put executable coverage on `components/ReviewGrid.tsx` — the review loop's primary
interaction surface, which shipped across four tasks (BI-005/006/009/027) with no
tests, first because the vitest glob could not discover a `.tsx` file at all and then
by convention after TEST-001.2 removed that blocker.

**Changed:** `components/ReviewGrid.test.tsx` (new, 246 lines). No production code
touched; no dependency added (the 3-dep tree holds).

**Verification:** `npm test` 213→**239 passed**, 15→**16 files**; lint and typecheck
green. 26 tests cover all four behaviours the PLAN line names plus both directions of
the keeper-only `Iterate →` gate. The load-bearing check is the mutation pass: seven
branches in `ReviewGrid.tsx` were broken in turn and every one produced a failure on
exactly the test written for it, so a future break names its own cause. `git diff
--stat components/ReviewGrid.tsx` confirmed the file restored after each.

**Refactors:** none made, none deferred. None were needed — the component already
carries the accessible handles the tests query (`aria-pressed`, `role="radio"` +
`aria-checked`, labelled `View full size` / `Close`), so nothing test-only was added
to production code. No `vi.mock`: `ReviewGrid` takes every dependency as a prop, so
the repo's real-seam default applies and TEST-001.3's mock precedent stays narrow.

**Docs:** all four AI-referenced docs swept — three verified unchanged with reasons,
`PLAN.md` updated. TEST-001.3's flagged `archive/testing/` vs `archive/test/` drift is
confirmed resolved in `.flowtron/tasknote/README.md`.

**Maintainability:** every control on a review card is a *toggle* — clicking the active
decision or the current star clears it — which is precisely the kind of branch a
well-meaning refactor flattens without anyone noticing until a reviewer loses a
verdict mid-triage. Those branches now fail loudly. Because `BulkReviewPane` renders
`ReviewGrid`, this file also underwrites TEST-002.5's surface for free.

**Archived:** 2026-08-09
