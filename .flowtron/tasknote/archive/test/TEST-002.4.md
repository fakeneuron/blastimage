---
title: lightbox-tests
status: completed
tags: [testing, vitest, component, epic-child]
created: 2026-08-09
due:
related-tasks: [TEST-EPIC-002, TEST-002.2, TEST-001.3, BI-027, BI-035.3]
---

# TEST-002.4 | lightbox-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-002]] [[TEST-002.2]] [[BI-027]]

## 🎯 Goal

Put executable coverage on `components/Lightbox.tsx` — the overlay's own behaviour
(arrow/button stepping, Escape + backdrop close, the multi-image gating), the scope
TEST-002.2 explicitly deferred to this task.

## ✅ Acceptance

- [ ] `components/Lightbox.test.tsx` pins the three behaviours the PLAN line names,
      as far as they exist in the component (see the focus finding in Discovery)
- [ ] `←` / `→` stepping is asserted through the **window keydown listener**, in both
      directions, including both clamps (no wrap — BI-027's explicit design choice)
- [ ] `Escape` closes; backdrop click closes; a click on the figure does **not**
      close (the `stopPropagation` guard)
- [ ] Prev/Next buttons step and are `disabled` at their respective ends
- [ ] The `multiple` gate is pinned in both directions — nav buttons and the
      `n / total` counter render for a set >1 and are absent for a single image
- [ ] The keydown listener is proven **removed on unmount** (a stale listener firing
      `onIndexChange` after close is the failure mode this file exists to catch)
- [ ] Assertions are **live** — verified by mutation (breaking a branch in
      `Lightbox.tsx` fails the suite, on the test written for it)
- [ ] The focus-management gap is **filed**, not fixed — a new a11y child under
      `BI-EPIC-035` (operator's call; see Discovery)
- [ ] `npm test`, `npm run lint`, `npm run typecheck` stay green
- [ ] No production code changed and no new dependency added (test-only task)

## 🧩 Subtasks

- [ ] Add `components/Lightbox.test.tsx` following the `ReviewGrid.test.tsx` idiom:
      local `makeImages(n)` fixture, `renderLightbox(overrides)` helper returning
      `vi.fn()` handlers, real `ImagegenProvider` mount, `await act(async () => {})`
      drain, explicit vitest imports + hand-wired `afterEach(cleanup)`
- [ ] Keyboard tests: `ArrowRight` / `ArrowLeft` report the stepped index via
      `onIndexChange`; both ends clamp; `Escape` calls `onClose`
- [ ] Button tests: Previous / Next report the stepped index; `disabled` at start /
      end respectively; the click does not also trigger the backdrop close
- [ ] Close tests: backdrop click closes; figure click does not
- [ ] Single-image tests: no nav buttons, no counter, arrows are inert
- [ ] Counter test: reads `n / total` for the current index
- [ ] Empty/out-of-range test: renders nothing when `images[index]` is missing
- [ ] Unmount test: keydown after unmount reports nothing
- [ ] File the focus-management follow-up under `BI-EPIC-035` (before the terminal
      `BI-035.N`), citing the `aria-modal`-without-a-trap finding
- [ ] Verify: `npm test`, lint, typecheck, plus a mutation pass proving the
      assertions are live

## 🔗 Related

- [[TEST-EPIC-002]] — parent epic; component-test coverage, Discovery from audit-repo
- [[TEST-002.2]] — sibling; covered `ReviewGrid`'s lightbox *wiring* and deferred the
  overlay's own behaviour here. Its test file is the idiom this one extends.
- [[TEST-001.3]] — the coverage precedent (local fixtures, real-provider mount,
  mutation check as the proof assertions are live)
- [[BI-027]] — shipped `Lightbox.tsx` + `lib/lightbox.ts`; its Acceptance is this
  task's spec, and it records *why* stepping clamps rather than wraps
- [[BI-035.3]] — the sibling accessibility task (`aria-label`s on icon-only buttons);
  nearest home for the focus-management gap surfaced below

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `components/Lightbox.tsx` (117 lines) has no test file. Its pure index
  math is well covered (`lib/lightbox.test.ts`, 5 cases), but that is `stepIndex` in
  isolation — everything the *component* adds is untested: the window keydown listener
  and its cleanup, the `multiple` gate, the disabled-at-the-ends buttons, the backdrop
  vs. figure click split, and the null render. BI-027 shipped it that way deliberately
  (*"the overlay component follows the established untested-presentational pattern"*,
  and at the time the vitest glob was `lib/**/*.test.ts` so a component test could not
  run at all). TEST-001.2 removed the config blocker; TEST-002.2 covered the grid and
  named this file as the remaining gap.

- [x] Read relevant source files — `components/Lightbox.tsx` (whole file: the keydown
  `useEffect` at `:34-42`, the `if (!image) return null` guard at `:44`, the
  `multiple` / `atStart` / `atEnd` flags at `:46-48`, and the three interactive
  regions), `lib/lightbox.ts` + `lib/lightbox.test.ts` (the pure helper, already
  covered), both consumers — `components/ReviewGrid.tsx:59-86` and
  `components/GalleryPanel.tsx:57,148-152` (identical `number | null` state shape),
  `components/ResolvedImage.tsx` + `lib/ImagegenContext.tsx` (the provider
  requirement), `components/ReviewGrid.test.tsx` (the idiom to extend),
  `vitest.config.ts` + `vitest.setup.ts` (harness).

- [x] **Best Practices Review** — one new test file; no runtime code moves, so no
  dependency direction or abstraction boundary changes. The existing abstraction
  extended is the local-fixture idiom (`makeImage` / `renderGrid(overrides)` in
  `ReviewGrid.test.tsx`, itself modelled on `Sidebar.test.tsx`) → `makeImages(n)` /
  `renderLightbox(overrides)` here. Fixtures stay file-local: `LightboxImage` is a
  two-field interface, so the fixture is ~4 lines and sharing it would cost more than
  it saves (SPEC's DRY-is-contextual framing; TEST-001.3 and TEST-002.2 both made the
  same call). No refactor required in scope; one cleanup **deferred** — the focus
  finding below, which is production a11y work, not test work.

- [x] **Archive skim** — `grep -lE "Lightbox|lightbox" .flowtron/tasknote/archive/*/*.md`
  → three hits (BI-027, TEST-002.2, TEST-001.2). Load-bearing finds recorded below.

- [x] **Drift check** — two of the three behaviours the PLAN line names match current
  code exactly; the third does not exist. Detail in Discovery Notes → **Drift: "focus
  behavior"**. Everything else verified: `stepIndex(index, ±1, images.length)` is
  called from both the keydown handler (`:37-38`) and the two nav buttons (`:73`,
  `:107`); Escape closes at `:36`; the harness is intact
  (`include: ["{lib,components}/**/*.test.{ts,tsx}"]`, `@/` alias, automatic JSX
  runtime, no `globals: true`).

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit
  assumptions

  **One clarification asked** — the focus drift above, since the two readings are
  materially different work. **Operator chose: test-only + file an a11y follow-up.**
  So TEST-002.4 stays test-only like every sibling in the epic, the overlay's real
  behaviours get covered, and the focus gap is filed as a new child of `BI-EPIC-035`
  rather than fixed here. Remaining explicit assumptions:

  1. **Test-only task.** No production code changes, no new dependency (the 3-dep tree
     holds). `Lightbox` takes every dependency as a prop, so it needs no injection seam
     and therefore no `vi.mock` — the repo's real-seam default applies.
  2. **Real `ImagegenProvider` wrapper.** `Lightbox` renders `ResolvedImage`, which
     throws outside a provider. Mounting the real one is the TEST-001.3 / TEST-002.2
     precedent and is safe here: happy-dom exposes no `indexedDB`, so the handle restore
     resolves to `null`, and the fixtures use `https:` URLs, which `resolveDisplayUrl`
     passes through untouched. The provider renders no DOM wrapper of its own, so the
     render `container.firstChild` is the backdrop div the close test needs.
  3. **`stepIndex` itself is out of scope** — `lib/lightbox.test.ts` already covers the
     clamp math directly. What this file pins is that the component *calls* it with the
     right arguments from all four entry points (two keys, two buttons), which is the
     part `lib/lightbox.test.ts` cannot see.
  4. **PLAN edit is in scope.** Filing the a11y follow-up is a deliverable of this task
     per the operator's answer, so the closure commit carries it.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive finds:**

- **BI-027** — the origin tasknote for both `lib/lightbox.ts` and `Lightbox.tsx`. Its
  Acceptance is effectively this task's spec: *"Lightbox closes on backdrop click and
  on Esc; Left/Right arrows step through the set (clamped at the ends)"*. Discovery
  Notes record the *why* behind the clamp — the operator chose clamping over wrapping
  because it is *"predictable for a triage pass"* — which makes both clamp tests
  regression guards for a deliberate decision, not incidental assertions. Its Testing
  Notes also state the residual risk this task retires: *"Risk confined to the trigger
  wiring (one-line click handlers) and the overlay markup."* Notably, **focus is never
  mentioned** anywhere in BI-027 — not in Acceptance, subtasks, or notes.
- **TEST-002.2** — the immediate sibling. Drew the scope line explicitly: *"The
  overlay's own behaviour (arrow stepping, Escape) is TEST-002.4; what this file covers
  is `ReviewGrid`'s own state — which image it opens."* Its harness solution carries
  over wholesale, including the non-obvious part: `renderGrid` awaits
  `act(async () => {})` after render to drain `ImagegenProvider`'s mount-time handle
  restore *and* `ResolvedImage`'s resolve effect, so no state settles outside `act`.
  Its mutation-pass table is the model for this task's verification step.
- **TEST-001.2** — widened the vitest include glob to `{lib,components}/**/*.test.{ts,tsx}`.
  Without it this file could not be discovered; it is why "presentational components go
  untested" was a config artefact rather than a considered convention.

**Drift: "focus behavior" describes behaviour that does not exist.**

The PLAN line names three behaviours: *"← / → stepping, Escape close, focus behavior."*
The first two are implemented and testable. The third is not implemented at all —
`components/Lightbox.tsx` has no focus management of any kind:

- no autofocus / initial focus move when the overlay opens,
- no focus trap (Tab escapes to the page behind the backdrop),
- no focus restore to the triggering thumbnail on close,
- no `useRef`, no `tabIndex`, no `.focus()` call anywhere in the file.

The overlay declares `role="dialog" aria-modal="true"` on its `<figure>` — asserting a
modality it does not enforce. Keyboard nav works anyway because the handler is bound to
`window`, not to the dialog, so the arrows and Escape fire regardless of where focus
sits. That design is *why* the gap is invisible in use: the overlay is keyboard-operable
without ever taking focus, so nothing appears broken until a screen-reader or
keyboard-only user tabs into the page behind an "aria-modal" overlay.

Two readings of the PLAN line follow, and they are materially different work:

1. **Test-only (epic-consistent).** TEST-EPIC-002 is a *coverage* epic; every sibling
   (`.2`, `.3`, `.5`, `.6`) is test-only. Cover stepping + Escape + the rest of the
   overlay's real behaviour, and file the focus gap as an a11y follow-up — its natural
   home is `BI-EPIC-035`, which already carries `BI-035.3` (`aria-label`s on icon-only
   buttons) under the audit's *"Accessibility is modal-complete, chrome-incomplete"*
   theme.
2. **Implement-then-test.** Add focus management to `Lightbox.tsx` and test it here.
   This is production behaviour change inside a test task, and it would be the only
   child in the epic to touch runtime code.

Surfaced to the operator rather than silently resolved, per the SPEC drift-check rule
(*"don't silently 'correct' the plan by executing a different task"*).

**Query handles (why the tests can assert real user-visible state).** No test-only
attributes need to be added to production code: the overlay is `role="dialog"` +
`aria-label="Image viewer"`, the three buttons carry `aria-label`s (`Close`,
`Previous image`, `Next image`), the counter is plain text, and the image is queryable
by its `alt`. `ReviewGrid.test.tsx` already queries all of these successfully.

**Harness note.** Unlike `ReviewGrid`, `Lightbox` is a controlled component — `index`
is a prop, not internal state — so stepping tests assert on the `onIndexChange` spy
rather than on a re-render. A rerender-with-new-index case covers the counter.

Discovery surfaced a scope deviation — the PLAN line's third named behaviour does not
exist — → 🛠️ fired as the clarifying ask above, and the operator resolved it directly
by choosing test-only + follow-up (with the deliverable set previewed in the choice).
That answer is the Phase 1→2 approval; entering Phase 2.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the sibling idiom rather than inventing one: a
  local fixture factory (`makeImages(n)`, in the shape of `ReviewGrid.test.tsx`'s
  `makeImage`), a single async `renderLightbox(images, index)` helper returning the
  `vi.fn()` handlers plus `container` / `unmount`, the real-provider mount and
  `await act(async () => {})` drain carried over verbatim from TEST-002.2, and
  explicit vitest imports with hand-wired `afterEach(cleanup)` (no `globals: true`).
  Two small shape differences, both forced by the component: the helper returns
  `container` (the backdrop is the only unlabelled interactive surface, so the close
  test reaches it via `container.firstChild`) and `unmount` (the listener-cleanup
  test needs it). No `it.each` here — unlike the grid's three symmetric decisions,
  these cases differ in setup index *and* expectation, so table form would obscure
  more than it saved. **No `vi.mock`** — `Lightbox` takes every dependency as a
  prop, so the repo's real-seam default applies.

- [x] **Minimal refactor gate** — no refactor, and no production code touched at all.
  None was needed: the overlay already carries every query handle the tests use
  (`role="dialog"` + `aria-label="Image viewer"`, `aria-label`s on all three buttons,
  the counter as plain text, the image by `alt`), so nothing test-only was added to
  `Lightbox.tsx`. One cleanup **deferred, not made**: the missing `stopPropagation`
  on the Close button (see below) — a production change, out of scope for a test task.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`components/Lightbox.test.tsx` (new, 249 lines) — 23 tests in five describes:

| Describe | Tests | Pins |
|---|---|---|
| keyboard stepping | 6 | `ArrowRight` / `ArrowLeft` report the stepped index; both ends clamp rather than wrap; unhandled keys are inert; the `window` listener is removed on unmount |
| nav buttons | 5 | Next / Previous report the stepped index; each is `disabled` at its own end and enabled at the other; stepping never closes the overlay |
| closing | 5 | Escape, Close button, and backdrop click all close; a click on the figure does not |
| single-image sets | 3 | no nav buttons, no counter; Close still works; arrows report `0` (no movement) rather than being unwired |
| rendering | 4 | the image at the *current* index renders and others do not; the counter reads `n / total`; an empty set and an out-of-range index both render no dialog |

**Finding — the Close button fires `onClose` twice.** The first run failed two tests
expecting a single call. It is not a test bug: unlike the two nav buttons, the Close
button does not `stopPropagation`, so its click also reaches the backdrop's
`onClick={onClose}`. Harmless today — both consumers implement `onClose` as
`setLightboxIndex(null)`, which is idempotent — but a real inconsistency inside the
component. Handled as a **documented quirk, not a contract**: a dedicated test asserts
the count of 2 with a docstring explaining why, so adding the missing
`stopPropagation` later surfaces here as a deliberate change instead of passing
silently. The two behavioural tests assert `toHaveBeenCalled()` (that Close closes),
which is the contract that actually matters and is independent of the quirk.

Deliberately *not* covered: `stepIndex`'s clamp math itself (already unit-tested in
`lib/lightbox.test.ts` — this file pins that the component *calls* it correctly from
all four entry points), focus behaviour (does not exist; filed as `BI-035.5`), and the
CSS/positioning classes.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — no avoidable duplication: the ~5-line `makeImages`
  fixture stays file-local rather than being hoisted into a shared module across five
  test files (SPEC's DRY-is-contextual framing; TEST-001.3 and TEST-002.2 both made the
  same call, and `LightboxImage` is a two-field interface — sharing would cost more
  than it saves). No dead code: `renderLightbox` returns four values and every one is
  consumed by at least one test. No unexplained complexity — the single non-obvious
  construct, the `await act(async () => {})` drain, is documented in the file header
  along with *why* the real provider is mounted. No public-surface growth: nothing
  exported, no production file changed. The one deliberately odd assertion
  (`toHaveBeenCalledTimes(2)`) carries a docstring stating it documents a quirk rather
  than a contract, so the next reader does not "fix" the test.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** Test-only task; no
  rendered app surface changed and no production file was touched
  (`git diff --stat components/Lightbox.tsx` is empty after the mutation pass).

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
| `npm test` | 239 passed / 16 files | **262 passed / 17 files** |
| `npm run lint` | clean | clean |
| `npm run typecheck` | clean | clean |

**Mutation check — the criterion that matters here.** Eleven branches in
`Lightbox.tsx` were broken in turn and the suite re-run. Every mutation failed, each
on exactly the test(s) written for it:

| Mutation to `Lightbox.tsx` | Failing test(s) |
|---|---|
| `e.key === 'Escape'` never matches | closes on Escape |
| `ArrowLeft` steps `+1` instead of `-1` | steps backward on ArrowLeft; clamps at the first image |
| `return () => window.removeEventListener(...)` → `return undefined` | stops listening once unmounted |
| `if (!image) return null` → never returns | renders nothing for an empty set; renders nothing when the index is out of range |
| `images.length > 1` → `true` | hides the nav buttons and the counter |
| `atEnd = index >= images.length - 1` → `false` | disables Next on the last image |
| `atStart = index <= 0` → `false` | disables Previous on the first image |
| Next button drops `e.stopPropagation()` | does not close the overlay when stepping |
| figure drops `e.stopPropagation()` | stays open when the image itself is clicked |
| `images[index]` → `images[0]` | shows the image at the current index; renders nothing when the index is out of range |
| counter `{index + 1}` → `{index}` | counts the current position within the set |

The file was restored from a pristine copy after every mutation; `git diff --stat
components/Lightbox.tsx` confirmed clean at the end. Note the two propagation
mutations: they are killed by the *behavioural* tests, not by the quirk-documenting
one — the suite would still catch a real regression there even if the quirk test were
deleted.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface; its lightbox mention (added by BI-027, the click-to-enlarge clause in both Review steps) is still accurate and a test file is not part of that surface. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only; no architectural or contract change here. |
  | `CLAUDE.md` | **No change.** Its Testing bullet already states the glob, the no-`globals` consequence, and the real-seam-over-`vi.mock` default — all three still accurate, and this task's no-mock choice is an instance of the stated rule rather than a change to it. |
  | `.flowtron/PLAN.md` | **Updated, twice.** TEST-002.4 flipped to stub form and kept 2-space nested beneath the active `TEST-EPIC-002` parent; new `BI-035.5` filed beneath `BI-EPIC-035`, inserted before the terminal `BI-035.N` per SPEC/epic.md. |

  Also re-checked §"Project quick commands" and §"Archive layout" (outside the sweep
  list): both accurate — `TEST-*` → `archive/test/` matches where this note lands, and
  all four commands ran green this session.

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.`, kept 2-space
  nested beneath the active `TEST-EPIC-002` parent in `## Medium` per SPEC/epic.md
  §"Child placement invariant", then tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Put executable coverage on `components/Lightbox.tsx` — the review/gallery overlay,
which BI-027 shipped untested on the reasoning that its only branching logic lived in
`lib/lightbox.ts`. That was half true: `stepIndex` was covered, but nothing verified
that the component *calls* it correctly from its four entry points, tears its `window`
keydown listener down, or gates its nav chrome on set size.

**Changed:** `components/Lightbox.test.tsx` (new, 249 lines) and two `.flowtron/PLAN.md`
lines. No production code touched; no dependency added (the 3-dep tree holds).

**Verification:** `npm test` 239→**262 passed**, 16→**17 files**; lint and typecheck
green. The load-bearing check is the mutation pass: eleven branches in `Lightbox.tsx`
were broken in turn and every one produced a failure on exactly the test written for
it, so a future break names its own cause. `git diff --stat components/Lightbox.tsx`
confirmed the file restored after each.

**Scope decision:** the PLAN line named three behaviours, and the third — "focus
behavior" — did not exist. `Lightbox` has no initial focus, no trap, and no restore,
despite declaring `role="dialog" aria-modal="true"`; keyboard nav works only because
the handler is bound to `window`. Surfaced rather than silently reinterpreted; the
operator chose test-only, so the gap is filed as **`BI-035.5`** under the a11y epic
that already carries `BI-035.3`, and this task stays test-only like every sibling.

**Refactors:** none made. One **deferred**: the Close button does not
`stopPropagation`, so it fires `onClose` twice (its own handler plus the backdrop's).
Idempotent in both consumers, so harmless today — but pinned by a test that documents
it as a quirk rather than a contract, so a future fix registers as deliberate.
Changing it here would have been production work inside a test task.

**Docs:** all four AI-referenced docs swept — three verified unchanged with reasons,
`PLAN.md` updated twice (this task's stub form + the new `BI-035.5` filing).

**Maintainability:** the overlay's riskiest property is invisible in use — a `window`
keydown listener that outlives its component would keep stepping a closed lightbox,
and nothing in the UI would show it. That teardown is now pinned, as is the
clamp-don't-wrap choice BI-027 made deliberately for triage predictability. Two latent
a11y/consistency issues that had been sitting unrecorded since 2026-06-24 are now
either filed (`BI-035.5`) or documented in a test.

**Archived:** 2026-08-09
