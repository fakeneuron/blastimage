---
title: workspace-autoload-test
status: completed
tags: [testing, vitest, component, epic-child]
created: 2026-08-06
due:
related-tasks: [TEST-EPIC-001, TEST-001.2, BI-026]
---

# TEST-001.3 | workspace-autoload-test

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-001]] [[TEST-001.2]] [[BI-026]]

## 🎯 Goal

Cover `Workspace.tsx`'s BI-026 auto-load-round effect — the repo's highest-logic
component behaviour and the one piece of it that shipped with no tests at all.

## ✅ Acceptance

- [ ] `components/Workspace.test.tsx` pins all four behaviours BI-026's own Acceptance claimed: auto-loads the latest round when linked, fires at most once per mount, never overrides an already-loaded round, and opens the bulk-review pane for a multi-task round
- [ ] Each of the effect's four gates is asserted negatively as well — `!ready`, `!imagegenLinked`, `loadedRound !== null`, and `availableRounds.length === 0` each suppress the auto-load
- [ ] A single-task round does *not* open the bulk pane (the `loaded.length > 1` branch is pinned in both directions)
- [ ] The assertions are **live** — verified by mutation (removing a guard from the effect makes the suite fail, not pass)
- [ ] `npm test`, `npm run lint`, `npm run typecheck`, and `npm run build` stay green
- [ ] No production code changed and no new dependency added (test-only task; the 3-dep tree holds, per BI-021.2)

## 🧩 Subtasks

- [ ] Add the `vi.mock('@/lib/useWorkspace')` seam with `importOriginal` so `DEFAULT_BATCH_SIZE` (consumed by `TaskDetail` + `BulkReviewPane`) survives the mock
- [ ] Write a `makeWorkspace(overrides): UseWorkspace` stub factory — full interface, no-op handlers, typed so contract drift is a typecheck error
- [ ] Positive path: all gates open → `loadRound()` called exactly once, with no argument (latest-round default)
- [ ] Negative gates: one test per suppressed condition (`!ready`, `!imagegenLinked`, `loadedRound` set, empty `availableRounds`)
- [ ] One-shot per mount: gate inputs churn after the first fire → still exactly one call
- [ ] Bulk-review branch: multi-task round renders `BulkReviewPane`; single-task round stays on `TaskDetail`
- [ ] Verify: full suite, lint, typecheck, build, plus a mutation check proving the assertions are live

## 🔗 Related

- [[TEST-EPIC-001]] — parent epic; this is the first real coverage through the gate the epic opened
- [[TEST-001.2]] — predecessor: widened the vitest include glob and proved `.tsx` tests execute; this task is the coverage it unblocked
- [[BI-026]] — the effect under test; shipped 2026-06-18 with `Updated/added tests — N/A`

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** BI-026's tasknote is explicit that the effect shipped untested —
  *"Updated/added tests — N/A. Behavior is an effect over the existing `loadRound`
  path… no new pure logic introduced"* — with Phase 3 recorded as *"Static + unit
  verification only; no in-browser run in this environment,"* and even the visual
  confirmation deferred to the adopter. That reasoning was sound at the time (no
  component test path existed, per CORE-001.3: *"components have no test infra per
  epic clarification #3"*), but it means the one guarded, multi-condition effect in
  the codebase has zero executable coverage. TEST-001.2 removed the blocker; this
  task spends it on the highest-value target.

- [x] Read relevant source files — `components/Workspace.tsx` (the effect, `:55-65`),
  `lib/useWorkspace.ts` (the five gate inputs + `loadRound`'s contract),
  `lib/ImagegenContext.tsx` (provider mount path), `components/BulkReviewPane.tsx`
  (the observable branch outcome), `components/Sidebar.test.tsx` (the fixture idiom
  to extend), `vitest.config.ts` + `vitest.setup.ts` (the harness TEST-001.2 built).

- [x] **Best Practices Review** — the touched surface is a single new test file; no
  runtime code moves, so no dependency direction or abstraction boundary changes.
  Existing abstraction extended: `Sidebar.test.tsx`'s `makeTask` / `makeSession` /
  `makeProps(overrides)` local-fixture idiom, widened to a `makeWorkspace(overrides)`
  factory over the full `UseWorkspace` interface. Typing the stub as `UseWorkspace`
  (rather than a structural literal) is deliberate: it makes hook-contract drift a
  `npm run typecheck` failure instead of a silently stale mock. No duplication
  introduced; no refactor required or deferred.

- [x] **Archive skim** — `archive/bi/` (19 tasknotes cite `Workspace.tsx`),
  `archive/core/`, `archive/test/`. Three load-bearing finds, recorded below.

- [x] **Drift check** — the PLAN line cites `Workspace.tsx`'s auto-load-round effect
  and attributes it to BI-026: both accurate. The effect is present and unchanged
  at `components/Workspace.tsx:55-65`, still guarded by `autoLoadedRef` + the four
  conditions BI-026 described, and `BI-026` sits in `## Completed` as claimed. The
  vitest harness TEST-001.2 landed (`include: ["{lib,components}/**/*.test.{ts,tsx}"]`,
  `resolve.alias` for `@/`, `oxc.jsx.runtime`) is intact. No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **One clarifying question asked** (harness choice — see Discovery Notes); the
  operator confirmed the recommended option, so the approach and subtask list are
  unchanged from the pre-ask plan. Explicit assumptions:

  1. **Test-only task.** No production code changes. Exporting `WorkspaceInner`
     purely to make it testable was offered and declined — it grows the module's
     public surface for no runtime consumer, which the Phase 3 quality assertion
     explicitly flags against.
  2. **Real `ImagegenProvider`, mocked `useWorkspace`.** The provider is safe to
     render for real (verified: happy-dom exposes no `indexedDB`, and
     `loadImagegenHandle` short-circuits on `typeof indexedDB === 'undefined'`, so
     the restore resolves to `null` with no crash and no `linked` flip). Only the
     hook is mocked, because the effect is defined *entirely* in terms of that
     hook's outputs.
  3. **Real child components.** `Sidebar` / `TaskDetail` / `BulkReviewPane` /
     `GalleryPanel` render for real rather than as stubs, so "the bulk pane opened"
     is asserted against actually-rendered output. Fixtures carry zero images, so
     `ResolvedImage` never needs a resolved blob.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive finds:**

- **BI-026** — the effect's own tasknote. Its Acceptance lists exactly four claims
  (auto-loads when linked; at most once per mount; never overrides a manual load;
  multi-task rounds open bulk review) and its Phase 2 records them as verified by
  *trace + green suite*, not by a test. Those four claims map 1:1 onto this task's
  test cases — the tasknote is effectively a pre-written spec.
- **CORE-001.3** — records *"components have no test infra per epic clarification
  #3"* as the reason a fix was routed into `lib/storage.ts` rather than tested at
  the component layer. That constraint is now stale (TEST-001.2), which is worth
  knowing for future routing decisions but changes nothing in this task.
- **TEST-001.2** — names this task as its follow-up and leaves the harness details
  (alias resolution, JSX runtime, hand-wired `afterEach(cleanup)` because the config
  sets no `globals: true`) documented in `vitest.config.ts` comments. Reuse as-is.

**Harness choice (the one clarifying question).** `Workspace` has no injection seam:
it constructs its own `ImagegenProvider` and calls `useWorkspace()` internally, and
the effect gates on five hook outputs. Three routes were surfaced — module-mock the
hook, build a full fake-FSA integration harness, or export `WorkspaceInner`. Operator
chose the module mock. It is the repo's **first** `vi.mock` (existing tests stub
globals via `vi.stubGlobal` and use real seams), so the precedent is worth recording:
mock a module when the unit under test has no injection point *and* its logic is
expressed purely over that module's outputs. The integration route was rejected as
testing five subsystems at once behind a brittle fixture — a failure there would not
localize to the effect.

**A note on happy-dom `indexedDB`.** Verified rather than assumed
(`node -e "new (require('happy-dom').Window)()"` → `indexedDB: undefined`). This is
what makes the real provider safe to mount; if a future happy-dom version ships
`indexedDB`, the restore path would start executing and this test may need
`vi.stubGlobal('indexedDB', undefined)` — the same guard `imagegenFs.test.ts`
already applies.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended `Sidebar.test.tsx`'s local-fixture idiom:
  `makeTask` / `makeSession` reused near-verbatim, `makeProps(overrides)` widened
  into `makeWorkspace(overrides): UseWorkspace`. Explicit vitest imports +
  `afterEach(cleanup)` match both `Sidebar.test.tsx` and `useWorkspace.test.ts`
  (the config sets no `globals: true`). Single quotes, per the `lib/` + `components/`
  convention. The one new shape is `vi.mock` — justified below, and now recorded in
  `CLAUDE.md` so the next reader knows when it applies.

- [x] **Minimal refactor gate** — no refactor, and no production code touched at all.
  The alternative that would have required one (exporting `WorkspaceInner` to make it
  directly renderable) was explicitly declined at the Phase 1 ask: it grows a module's
  public surface with no runtime consumer.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`components/Workspace.test.tsx` (new, 232 lines) — nine tests in two describes.

*Harness (the only non-obvious part):*
- `vi.hoisted` holds the mutable hook result; the `vi.mock('@/lib/useWorkspace')`
  factory closes over it and spreads `importOriginal()` back in, so
  `DEFAULT_BATCH_SIZE` (imported by `TaskDetail` + `BulkReviewPane`) survives.
- `makeWorkspace(overrides)` is typed as the real `UseWorkspace` interface, so a
  hook-contract change breaks `npm run typecheck` rather than leaving a stale mock.
- `install(overrides)` swaps the hook result between renders; `flush()` is
  `await act(async () => {})`, which drains both the provider's mount-time restore
  and the effect's async IIFE.
- Everything else runs for real: `ImagegenProvider`, `Sidebar`, `TaskDetail`,
  `BulkReviewPane`, `GalleryPanel`. "The bulk pane opened" is asserted against
  actually-rendered output (`getByRole('heading', { name: /Bulk review · 2 tasks/ })`
  — the accessible name concatenates the heading's split text nodes, which a plain
  `getByText` string would not match).

*Coverage — one test per guard, both directions:*

| Test | Pins |
|---|---|
| loads the latest round once every gate is open | fires; `loadRound()` called with **no** argument (latest-round default) |
| waits for the imagegen folder link | `!imagegenLinked` suppresses, then flipping it fires |
| waits for the mount-time load | `!ready` suppresses, then flipping it fires |
| does not fire when no rounds are available | `availableRounds.length === 0` |
| never overrides a round the user already loaded | `loadedRound !== null`, held across a round-list change |
| fires at most once per mount | `autoLoadedRef` one-shot under churning deps |
| opens the bulk-review pane for a multi-task round | `loaded.length > 1` → `setBulkTaskIds` |
| stays on the single-task view for a one-task round | the same branch, negative side |
| stays on the single-task view when the round loads nothing | `loaded` is `null` (failure/cancel path) |

Deliberately *not* done: no coverage of `loadRound`'s own internals (already covered
in `lib/`), no other Workspace behaviour (modals, quota banner, bulk-exit), no changes
to existing tests.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — no duplication (`makeTask` / `makeSession` are ~10
  lines shared in shape with `Sidebar.test.tsx`; extracting them into a shared
  fixtures module would be a premature abstraction across two files, so they stay
  local per the SPEC's DRY-is-contextual framing). No dead code — every stub member
  of `makeWorkspace` is required by the `UseWorkspace` type and reached by a real
  child component. No public-surface growth: nothing exported, no production file
  changed. The file's header comment states why the mock exists and what is *not*
  mocked, so the harness is self-explaining.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** No rendered app
  surface changed; the only new file is a test. `npm run build` output is
  byte-comparable to before (same route table, `/` still 18 kB).

**Testing Notes:**

| Gate | Before | After |
|---|---|---|
| `npm test` | 132 passed / 11 files | **141 passed / 12 files** |
| `npm run lint` | clean | clean |
| `npm run typecheck` | clean | clean |
| `npm run build` | ✓ 5/5 static, `/` 18 kB | ✓ 5/5 static, `/` 18 kB |

**Mutation check — the criterion that matters here.** This task's whole value is that
the assertions *catch* a regression, so each of the effect's six guards was removed in
turn and the suite re-run. Every mutation failed, and each failed on exactly the test
written for it — no over-broad assertions masking which guard broke:

| Mutation to `Workspace.tsx` | Failing test |
|---|---|
| drop `if (autoLoadedRef.current) return;` | fires at most once per mount |
| drop `if (loadedRound !== null) return;` | never overrides a round the user already loaded |
| `!ready \|\| !imagegenLinked` → `!ready` | waits for the imagegen folder link |
| `!ready \|\| !imagegenLinked` → `!imagegenLinked` | waits for the mount-time load |
| drop `if (availableRounds.length === 0) return;` | does not fire when no rounds are available |
| `loaded.length > 1` → `>= 1` | stays on the single-task view for a one-task round |

Each run reported `1 failed | 8 passed`. The file was restored from a pristine copy
after every mutation and `git diff --stat components/Workspace.tsx` confirmed clean.

**Environment note (verified, not assumed):** `new (require('happy-dom').Window)()`
reports `indexedDB: undefined`, which is why the real `ImagegenProvider` mounts safely
— `loadImagegenHandle` short-circuits and the restore resolves to `null`. Should a
future happy-dom ship `indexedDB`, this file may need the
`vi.stubGlobal('indexedDB', undefined)` guard `imagegenFs.test.ts` already applies.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface; a test file is not part of it. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only; untouched. |
  | `CLAUDE.md` | **Updated.** TEST-001.2's sweep deferred a testing-conventions entry to *"once TEST-001.3 lands actual component coverage"* — that condition is now met, so the Stack section gains one line: the runner, the co-located `{lib,components}/**/*.test.{ts,tsx}` layout, the no-`globals` consequence (explicit imports + hand-wired `afterEach(cleanup)`), and when `vi.mock` is the right tool versus the repo's default real-seam/`vi.stubGlobal` approach. |
  | `.flowtron/PLAN.md` | **Updated.** TEST-001.3 flipped to stub form, kept nested under the active TEST-EPIC-001 parent. |

  Also checked §"Project quick commands" (outside the sweep list): `npm test` /
  `npm run test:watch` / lint / typecheck all still accurate.

  **One drift found outside the sweep list, deliberately not acted on** —
  `.flowtron/tasknote/README.md` §"Archive layout" maps `TEST-*` → `archive/testing/`,
  but TEST-001.2 archived to `archive/test/` and this task follows it. Two valid
  resolutions (correct the table, or move both tasknotes to `archive/testing/`), so it
  is queued as an operator question at the 📦 gate rather than silently picked.

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-06.`, kept 2-space nested beneath the active `TEST-EPIC-001` parent in `## High` per SPEC/epic.md §"Child placement invariant", then tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Put executable coverage on `Workspace.tsx`'s auto-load-round effect — the repo's one
guarded, multi-condition component behaviour, which BI-026 shipped verified by trace
and a green suite rather than by a test, because no component test path existed then.

**Changed:** `components/Workspace.test.tsx` (new, 232 lines) · `CLAUDE.md` (+1 line).
No production code touched.

**Verification:** `npm test` 132→**141 passed**, 11→**12 files**; lint, typecheck, and
`next build` green (`/` unchanged at 18 kB). Nine tests cover all four behaviours
BI-026's Acceptance claimed plus the negative side of every gate. The load-bearing
check is the mutation pass: each of the effect's **six** guards was removed in turn and
every one produced a failure — each on exactly the test written for it, so a future
break names its own cause. `git diff --stat` confirmed the file restored after each.

**Refactors:** none made, none deferred. Exporting `WorkspaceInner` to avoid mocking
was offered at the Phase 1 ask and declined — it would grow a module's public surface
with no runtime consumer.

**Docs:** two of four AI-referenced docs verified unchanged; `CLAUDE.md` updated
(discharging TEST-001.2's explicit deferral); PLAN.md updated. One out-of-sweep
archive-path drift surfaced for the operator rather than silently resolved.

**Maintainability:** the auto-load effect is the piece of this app most likely to
regress silently — it is invisible when it works, and its four guards exist precisely
to *not* fire. It now has six independently-pinned assertions. This is also the repo's
first `vi.mock`; the precedent (mock a module only when the unit has no injection point
and its logic is expressed purely over that module's outputs) is recorded both in the
test's header comment and in `CLAUDE.md`, so it does not become a default. No
dependency added; the 3-dep tree holds.

**Archived:** 2026-08-06
