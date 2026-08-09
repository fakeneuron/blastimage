---
title: modal-chrome-tests
status: completed
tags: [testing, components]
created: 2026-08-09
due:
related-tasks: [TEST-002.N, TEST-002.6, TEST-002.4, TEST-EPIC-002]
---

# TEST-003 | modal-chrome-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-002.N]] · [[TEST-002.6]]

## 🎯 Goal

Close `TEST-EPIC-002`'s one residual coverage gap: pin the shared modal chrome
(`window` keydown Esc + listener teardown, backdrop-vs-dialog click) on
`FeedbackModal`, `IterateModal`, `ImportBuilder`, and `DeleteTaskModal`, plus the
`ResolvedImage` resolve/re-resolve path every other cohort test file mounts a
provider to satisfy.

## ✅ Acceptance

- [ ] `components/FeedbackModal.test.tsx` exists and pins: Esc closes, listener torn down on unmount, backdrop click closes, dialog click does not, and each of the three submit paths (`save` / `keep` / `approve`) reports trimmed text + the reference flag
- [ ] `components/IterateModal.test.tsx` exists and pins: the same four chrome behaviours, `composePrompt`'s three prefill shapes through the rendered textarea, the empty-prompt submit gate, and that submit reports the trimmed edited prompt
- [ ] `components/ResolvedImage.test.tsx` exists and pins: `https:`/`data:` passthrough, `imagegen:` resolution to a blob URL, re-resolve on `src` change, that a stale in-flight resolution cannot overwrite a newer `src` (the `cancelled` flag), and the outside-provider throw
- [ ] `components/ImportBuilder.test.tsx` gains Esc + backdrop/dialog-click tests, and its header's "deliberately out of scope" paragraph is corrected (it becomes false once the tests land)
- [ ] `components/DeleteTaskModal.test.tsx` gains the two chrome tests it lacks (listener teardown on unmount, backdrop-vs-dialog click); its existing Esc test stays
- [ ] Every new assertion is mutation-checked — breaking the branch it names fails that test and no other
- [ ] `npm test`, `npm run lint`, `npm run typecheck` all clean; no production `.tsx`/`.ts` file changed

## 🧩 Subtasks

- [ ] Write `components/FeedbackModal.test.tsx` — real `ImagegenProvider` (it renders `ResolvedImage`), local `makeImage` factory + `renderModal(overrides)` helper per the cohort idiom
- [ ] Write `components/IterateModal.test.tsx` — same harness; prefill cases driven through the `image.feedback.text` / `basePrompt` props
- [ ] Write `components/ResolvedImage.test.tsx` — real provider with `lib/imagegenFs` mocked per `lib/ImagegenContext.test.tsx` precedent; `URL.createObjectURL` stubbed
- [ ] Add the two deferred chrome tests to `components/ImportBuilder.test.tsx` and correct its header paragraph
- [ ] Add the two missing chrome tests to `components/DeleteTaskModal.test.tsx`
- [ ] Mutation pass over every new assertion; restore from pristine copies afterwards
- [ ] Phase 3 gates: targeted files, full `npm test`, lint, typecheck

## 🔗 Related

- [[TEST-002.N]] — the epic audit that surfaced this gap as its finding 2 and named `TEST-003` as the follow-up
- [[TEST-002.6]] — deferred `ImportBuilder`'s Esc/backdrop chrome as "a real, consciously deferred gap"; this task picks it up
- [[TEST-002.4]] — `Lightbox` tests; established the listener-teardown assertion this task replicates on four modals
- [[TEST-EPIC-002]] — the completed component-test-coverage epic whose residual gap this closes

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md — `## Medium`, unchecked, `[medium]🧩`,
  surfaced by [[TEST-002.N]]. 26-word description, well inside the filing-discipline cap.

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The gap is real and unchanged at HEAD. All three components named in
  the PLAN line still have no test file, and `ImportBuilder.test.tsx`'s deferral is
  still unpicked-up. Nothing since the audit (one commit, `2ab6dc5`, which filed this
  very line) touched any of the four components.

- [x] Read relevant source files — `FeedbackModal.tsx` (126), `IterateModal.tsx` (120),
  `ResolvedImage.tsx` (38), `ImportBuilder.tsx` (236), `DeleteTaskModal.tsx` (chrome
  block), `lib/ImagegenContext.tsx`, plus the harness precedents:
  `Lightbox.test.tsx` (teardown + backdrop idiom), `ImportBuilder.test.tsx`,
  `DeleteTaskModal.test.tsx`, `lib/ImagegenContext.test.tsx` (the `imagegenFs`-mock
  idiom), `vitest.config.ts`, `.flowtron/tasknote/README.md`.

- [x] **Best Practices Review** — the deliverable is test-only; no production module
  boundary moves. The established shape to extend is the `TEST-EPIC-002` cohort idiom,
  verified identical across seven files by [[TEST-002.N]]: explicit vitest imports
  (`globals: true` is off), hand-wired `afterEach(cleanup)`, local `make<Thing>()`
  factories plus a single `render<Component>(overrides)` helper returning `vi.fn()`
  spies, no `vi.mock` where a props seam exists. Three of the five files extend that
  directly. `ResolvedImage.test.tsx` is the one file that needs a decision (below) —
  it takes `lib/ImagegenContext.test.tsx`'s precedent rather than inventing a shape.
  One code-facing doc correction is required in scope: `ImportBuilder.test.tsx`'s
  header states Esc/backdrop are "deliberately out of scope", which this task falsifies.
  No refactor needed; no cleanup deferred.

- [x] **Archive skim** — `.flowtron/tasknote/archive/test/` (9 notes) skimmed;
  `grep -l` on the five source paths in scope returned `TEST-002.6` (ImportBuilder,
  the deferral), `TEST-002.4` (the teardown assertion precedent), and `TEST-002.N`
  (the audit that filed this task). All three read in full. Load-bearing findings in
  Discovery Notes.

- [x] **Drift check** — every claim in the PLAN line verified against HEAD:

  | Claim | At HEAD |
  |---|---|
  | `FeedbackModal` window-keydown + teardown | `FeedbackModal.tsx:35-41` ✓ |
  | `FeedbackModal` backdrop close | `:48` (backdrop `onClick`), `:55` (dialog `stopPropagation`) ✓ |
  | `IterateModal` window-keydown + teardown | `IterateModal.tsx:48-54` ✓ |
  | `IterateModal` backdrop close | `:61` / `:68` ✓ |
  | `ResolvedImage` uncovered | no `ResolvedImage.test.tsx`; 38 lines, one effect ✓ |
  | `ImportBuilder` Esc/backdrop deferred | `ImportBuilder.test.tsx:11-13` still says so ✓ |

  No drift. One thing the line does **not** name — see finding 1 below.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit
  assumptions

  **One clarification asked** (finding 1): whether `DeleteTaskModal`'s residual chrome
  belongs in this task. Operator confirmed **include it**. Explicit assumptions carried:

  1. **Test-only.** No production `.ts`/`.tsx` file changes. The `ImportBuilder.test.tsx`
     header correction is a comment inside a test file, not production code.
  2. **`ResolvedImage` gets the real provider with `lib/imagegenFs` mocked**, not a
     `vi.mock` of `ImagegenContext`. Rationale in finding 2.
  3. **The `cancelled` flag is pinned by its observable consequence**, not by a
     setState-after-unmount assertion. Rationale in finding 3.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Finding 1 — the chrome shape is on four components, not two.** The PLAN line names
`FeedbackModal` and `IterateModal`; `DeleteTaskModal.tsx` carries a byte-equivalent
listener (`:46-53`), backdrop (`:60`), and `stopPropagation` (`:70`), and its own
docstring says it "mirrors the `IterateModal` idiom". `DeleteTaskModal.test.tsx:101`
already pins Esc, but neither teardown nor the backdrop. Surfaced to the operator;
**confirmed in scope**, so the edit set gains a fifth file. This is the scope deviation
that fires the Phase 1→2 gate.

**Finding 2 — `ResolvedImage` has exactly one seam, and it is not a prop.** Its only
input beyond `src` is `useImagegen()`, and `ImagegenContext` (the context object) is
not exported — so there is no way to inject a fake `resolveDisplayUrl` from outside.
Two candidate shapes:

- `vi.mock('@/lib/ImagegenContext')` — CLAUDE.md reserves `vi.mock` for components with
  no injection point, which arguably fits, but it would stub out the very code path
  (`resolveDisplayUrl`'s passthrough-vs-resolve branch) whose interaction with the
  component is the thing worth testing.
- Mount the **real** `ImagegenProvider` with `lib/imagegenFs` mocked
  (`restoreLinkedImagegenFolder` → a fake root, `readImagegenFile` → a `File`) and
  `URL.createObjectURL` stubbed.

Taking the second. It is already precedent in this repo — `lib/ImagegenContext.test.tsx`
does exactly this, for exactly this reason — and it keeps the real context wiring in the
test. The five cohort files that mount a bare `ImagegenProvider` only ever exercise the
*passthrough* branch (happy-dom has no `indexedDB`, so the handle restores to `null`
and `imagegen:` URLs are returned unresolved); mocking the FS module is what makes the
resolve branch reachable at all.

**Finding 3 — the `cancelled` flag needs an observable, and it has one.**
`ResolvedImage.tsx:32-34` guards against a resolution landing after unmount. React 19
no longer warns on setState-after-unmount, so a test asserting "no warning" would be
vacuous — it would pass with the guard deleted. The flag's *real* consequence is
observable though: when `src` changes while the first resolution is still in flight,
the stale result must not overwrite the newer one. Driving A→B with A's
`readImagegenFile` held open, then releasing it, pins the guard with a test that fails
when the guard is removed. That is the assertion this file will carry; the
after-unmount case is documented in the header as deliberately unpinned rather than
faked.

**Finding 4 — `Lightbox.test.tsx` supplies the two chrome assertions verbatim.**
`:108-117` (unmount, then fire on `window`, expect no calls) and `:194-208`
(`container.firstChild` click closes / `dialog()` click does not) are the exact shapes
to replicate. Replicating rather than hoisting into a shared helper follows the
cohort's own settled call — four separate tasknotes independently declined to hoist
fixtures, each recording SPEC's DRY-is-contextual framing; a shared `expectModalChrome()`
helper across five files would hide which component is actually being exercised in a
failure.

**Baseline before any edit:** `npm test` → 323 passed / 22 files.

Discovery surfaced a scope deviation (finding 1 — a fifth file joins the edit set) → fire 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the `TEST-EPIC-002` cohort idiom in all five files
  (explicit vitest imports, hand-wired `afterEach(cleanup)`, local `make<Thing>()`
  factories + one `render<Component>(overrides)` helper returning `vi.fn()` spies).
  The four chrome assertions are replicated per component rather than hoisted into a
  shared `expectModalChrome()` helper — see finding 4 in Discovery; the cohort settled
  this question four times independently, and a shared helper would report a failure
  without naming which modal broke. `ResolvedImage.test.tsx` took
  `lib/ImagegenContext.test.tsx`'s `vi.mock('@/lib/imagegenFs')` shape rather than
  inventing one.

- [x] **Minimal refactor gate** — no refactor. Two existing test files gained a
  `unmount`/`container` return from their already-present render helpers (one line
  each), which is the minimum needed for the teardown and backdrop assertions.
  `ImportBuilder.test.tsx`'s header paragraph was rewritten because this task
  falsifies it — the code-facing-documentation half of the Phase 3 quality assertion,
  not cleanup.

- [x] Implemented the minimal solution — three new files, two extended; **zero
  production `.ts`/`.tsx` lines changed** (`git diff` over `components/*.tsx` excluding
  tests is empty at HEAD).

- [x] Updated/added tests for non-trivial behavior — 49 new tests; every one
  mutation-checked (Phase 3).

**Implementation Notes:**

### What landed

| File | Tests | Lines | Note |
|---|---|---|---|
| `components/FeedbackModal.test.tsx` | 14 | 198 | new |
| `components/IterateModal.test.tsx` | 16 | 209 | new |
| `components/ResolvedImage.test.tsx` | 9 | 231 | new |
| `components/ImportBuilder.test.tsx` | 14 (+6) | +67/−4 | chrome block + header correction |
| `components/DeleteTaskModal.test.tsx` | 10 (+4) | +47/−3 | chrome block |

Suite: **323 → 372 tests, 22 → 25 files.**

### Three decisions worth recording

**1. `ResolvedImage` mounts the real provider with `lib/imagegenFs` mocked.** Its only
seam is `useImagegen()`, and `ImagegenContext` exports no context object, so nothing can
be injected from outside. `vi.mock`-ing `ImagegenContext` would have stubbed out the
passthrough-vs-resolve branch that is the whole point of the file. Mocking the FS module
one level down keeps the real context wiring and reaches the resolve branch — the exact
shape `lib/ImagegenContext.test.tsx` already uses, for the same reason. This is also why
the five cohort files that mount a bare `ImagegenProvider` never exercised this path:
happy-dom has no `indexedDB`, so their handle restores to `null` and `imagegen:` URLs
come back untouched.

**2. The `cancelled` guard is pinned by its observable half only.** React 19 dropped the
setState-after-unmount warning, so an "asserts no warning" test would pass with
`ResolvedImage.tsx:32-34` deleted — a test that cannot fail is worse than no test. The
guard's other half *is* observable: a resolution landing after its `src` was replaced
must lose to the newer one. Driving A→B with A's read held open pins it, and the
mutation pass confirms deleting the guard fails exactly that test. The after-unmount
half is documented in the file header as deliberately unpinned rather than faked.

**3. A latent bug is pinned as a documented quirk, not fixed.** `resolveDisplayUrl` is a
`useCallback` with an empty dep list, so its identity never changes — which means
`ResolvedImage`'s effect never re-runs when the provider's handle restore completes.
An `imagegen:` image mounted *before* the restore settles keeps its raw, unrenderable
`imagegen:` src for the life of the mount. It is why this file's fixtures gate on
`linked`. Following `Lightbox.test.tsx:178-192`'s precedent in this repo, it is pinned
in a clearly-labelled "documents a live quirk rather than a contract" block, so adding a
`linked` dependency later surfaces here as a deliberate change instead of passing
silently. **Not fixed** — that is a production change outside this task's test-only
scope. Filed as a follow-up candidate at closure.

### Scope

Five files, not four: `DeleteTaskModal` carries the identical chrome and was missing the
teardown and backdrop halves. Surfaced at the Phase 1→2 gate and confirmed in scope by
the operator, so the codebase now has zero unpinned modal chrome.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — all five files green; full `npm test`
  → **372 passed / 25 files**

- [x] Ran lint/type-check on changed code — `npm run lint` clean, `npm run typecheck` clean

- [x] **Quality assertions** — the diff is five test files and nothing else. No
  duplication beyond the deliberate per-component chrome replication (justified in
  Discovery finding 4 and in each file's header); no dead code; no public-surface
  growth — no production module changed, and the two extended helpers widened their
  return objects only. The one piece of **stale code-facing documentation** this task
  created was corrected in the same diff: `ImportBuilder.test.tsx`'s header claimed
  Esc/backdrop were "deliberately out of scope", which the new block falsifies.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** No rendered surface
  changed; the diff is test files only, and `git diff` over the production components
  is empty.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

| Gate | Result |
|---|---|
| `npx vitest run` on the five changed files | 63 passed |
| `npm test` | **372 passed / 25 files** (was 323 / 22) |
| `npm run lint` | clean |
| `npm run typecheck` | clean |
| `git diff` over `components/*.tsx` minus tests | empty — no production change |

### Mutation pass — 22 mutations, 22 caught, 0 silent

Each mutation was applied to a pristine copy, the owning test file run, then the file
restored from `pristine/`. Every mutation failed the assertion written for it.

| Component | Mutation | Failed |
|---|---|---|
| `FeedbackModal` | drop listener cleanup | `stops listening once unmounted` |
| | drop backdrop `onClick` | `closes on a backdrop click` |
| | drop dialog `stopPropagation` | 3 tests (see note) |
| | `submit('keep')` → `submit('approve')` | `Save & Keep reports … the keep action` |
| | drop notes `.trim()` | `trims the typed notes …` |
| | drop text prefill | `prefills both fields from saved feedback` |
| | drop reference-flag prefill | `prefills both fields from saved feedback` |
| `IterateModal` | drop listener cleanup | `stops listening once unmounted` |
| | drop backdrop `onClick` | `closes on a backdrop click` |
| | drop dialog `stopPropagation` | 3 tests (see note) |
| | `return base \|\| note` → `return base` | `uses the feedback alone …` |
| | drop the `Refine:` composition branch | 3 prefill/submit tests |
| | `canSubmit = true` | both `disables submit …` tests |
| | drop prompt `.trim()` | `reports the edited prompt, trimmed` |
| `ResolvedImage` | drop the `cancelled` guard | `lets a newer src win over a resolution still in flight …` |
| | drop `setDisplaySrc(src)` at effect start | `drops the previous blob immediately …` |
| `ImportBuilder` | drop listener cleanup | `stops listening once unmounted` |
| | drop backdrop `onClick` | `closes on a backdrop click` |
| | drop dialog `stopPropagation` | 2 tests |
| `DeleteTaskModal` | drop listener cleanup | `stops listening once unmounted` |
| | drop backdrop `onClick` | `closes on a backdrop click without deleting` |
| | drop dialog `stopPropagation` | 2 tests |

**Note on the `stopPropagation` mutations.** These fail 2–3 tests rather than one, and
that is correct rather than an over-broad assertion: without `stopPropagation`, *every*
in-dialog click also reaches the backdrop, so Cancel/Close fire `onClose` twice and the
submit buttons fire it once when they should not. The blast radius is the bug's actual
blast radius. The dedicated `stays open when the dialog itself is clicked` test is the
one that names the cause directly.

All five production files verified byte-identical to their pristine copies afterwards
(`git diff` over `components/*.tsx` excluding tests is empty).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md`
  §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Describes the shipped user-facing surface and makes no coverage claim; a test-only task changes nothing it documents. |
  | `AGENTS.md` | **No change.** Carries the flowtron paste-block only. |
  | `CLAUDE.md` | **No change — checked closely, and the rule held.** Its Testing bullet reserves `vi.mock` "for components with no injection point (see `components/Workspace.test.tsx`)". `ResolvedImage` *is* such a component — its only seam is `useImagegen()`, and no context object is exported — yet this task still declined to `vi.mock` it, mocking the FS module one level down instead so the real context wiring stays under test. That is the rule's spirit satisfied more conservatively than its letter requires, not drift. Considered adding "…or a transitive module when that is the only way to reach a branch (see `ResolvedImage.test.tsx`)"; declined as unnecessary, since the file's own header explains the decision in full. Flagging the judgment here so it can be overruled cheaply. |
  | `.flowtron/PLAN.md` | **Updated.** `TEST-003` flipped to stub form and moved to the top of `## Completed`. `## Medium` still carries `BI-EPIC-035`, so no `(none)` placeholder needed. |

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.` and moved to the
  top of `## Completed` (standalone task); tasknote moved to
  `.flowtron/tasknote/archive/test/TEST-003.md`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Closed `TEST-EPIC-002`'s one residual coverage gap. All four modals in the codebase
(`FeedbackModal`, `IterateModal`, `ImportBuilder`, `DeleteTaskModal`) now pin the chrome
they share — Esc closes, the `window` listener is torn down on unmount, the backdrop
closes and the dialog does not — and `ResolvedImage`, the component every other cohort
test file mounted a provider to satisfy, finally has its own resolve path under test.

**Changed:** three new test files (`FeedbackModal.test.tsx` 198, `IterateModal.test.tsx`
209, `ResolvedImage.test.tsx` 231) and two extended (`ImportBuilder.test.tsx` +67/−4,
`DeleteTaskModal.test.tsx` +47/−3). **No production code changed** — 49 new tests, suite
323 → 372 across 22 → 25 files.

**Verification:** `npm test` 372 passed, lint and typecheck clean, plus a 22-mutation
pass in which every mutation failed the assertion written for it and none passed
silently.

**Scope.** Five files rather than the four the PLAN line named: `DeleteTaskModal` carries
byte-equivalent chrome and was missing the teardown and backdrop halves. Surfaced at the
Phase 1→2 gate, confirmed by the operator, so no follow-up is needed for the same shape.

**Two things pinned honestly rather than conveniently.** React 19 dropped the
setState-after-unmount warning, so the obvious test for `ResolvedImage`'s `cancelled`
guard would have passed with the guard deleted; it is pinned instead by the half that is
observable — a stale resolution losing to a newer `src` — and the mutation pass confirms
that one bites. And `ResolvedImage` carries a latent bug: `resolveDisplayUrl` is a
`useCallback([])`, so its identity never changes and the component's effect never re-runs
when the provider's folder-handle restore later completes. An `imagegen:` image mounted
before that restore keeps its raw, unrenderable src for the life of the mount.
Unreachable in the app today (round images exist only after a folder is linked), so it is
pinned as a labelled quirk per `Lightbox.test.tsx`'s precedent rather than fixed here —
fixing it is a production change this test-only task should not make. **Filed as a
follow-up candidate.**

**Refactors:** none. Two existing render helpers widened their return object by one line
each, which the new assertions require.

**Docs:** all four AI-referenced docs swept — three unchanged with reasons recorded, one
(`CLAUDE.md`) checked closely enough to record why it stays unchanged; `PLAN.md` updated.
One code-facing correction landed in the diff: `ImportBuilder.test.tsx`'s header claimed
Esc/backdrop were deliberately out of scope, which this task falsified.

**Maintainability:** the durable effect is that the four modals' chrome is now a
*tested* convention rather than a copied one. It was copy-paste across four components
with no assertion anywhere, which is exactly how one of them quietly loses its cleanup in
a refactor. The mutation table is the evidence the assertions are live: 22 deliberate
breakages, 22 named failures, zero silent passes.

**Archived:** 2026-08-09
