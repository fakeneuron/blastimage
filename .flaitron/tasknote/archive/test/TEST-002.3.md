---
title: task-detail-tests
status: completed
tags: []
created: 2026-08-09
due:
related-tasks: [TEST-EPIC-002, TEST-002.2, TEST-002.4]
---

# TEST-002.3 | task-detail-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-002]] [[TEST-002.2]] [[TEST-002.4]]

## 🎯 Goal

Add component tests for `components/TaskDetail.tsx` covering prompt editing, reference-photo toggling (≤3 cap), and generate-button gating on `generationAvailable`.

## ✅ Acceptance

- [ ] `components/TaskDetail.test.tsx` pins the three behaviours the PLAN line names:
      prompt editing, reference toggle at the `MAX_ACTIVE_REFS` cap, and the
      Generate gate on `generationAvailable`
- [ ] Prompt: the draft is controlled (typing updates it without a blur), blur
      persists via `onSetPrompt`, the draft resyncs on **task switch** but survives
      an external `basePrompt` update to the same task, and Generate fires with the
      live unblurred draft (the BI-007 gap the `promptDraft` state exists to close)
- [ ] Refs: the `n/3 active` counter renders, `onToggleRef(taskId, refId)` fires,
      and at the cap a non-selected thumbnail is `disabled` while an already-selected
      one stays clickable (the deselect escape hatch)
- [ ] Generate gate: disabled with the bridge note when `generationAvailable` is
      false, disabled with the missing-signal note when there is no prompt and no
      ref, enabled on prompt-only **and** on ref-only, and disabled while `generating`
- [ ] The bridge reason **outranks** the missing-signal reason when both apply (BI-031.2)
- [ ] Rename gate (BI-030.3): an accepted rename calls `onRenameTask`; a declined
      one restores the field to `task.name`
- [ ] Assertions are **live** — verified by mutation (breaking a branch in
      `TaskDetail.tsx` fails the test written for it)
- [ ] `npm test`, `npm run lint`, `npm run typecheck` stay green
- [ ] No production code changed and no new dependency added (test-only task)

## 🧩 Subtasks

- [ ] Add `components/TaskDetail.test.tsx` with a local `makeTask` / `makeRef`
      fixture pair and a `renderDetail(overrides)` helper returning the spy props,
      following the `ReviewGrid.test.tsx` / `Sidebar.test.tsx` idiom (explicit
      vitest imports, hand-wired `afterEach(cleanup)`)
- [ ] Empty state: no task selected renders the "Select a task" prompt
- [ ] Prompt tests: initial value, typing, blur-persist, resync-on-task-switch,
      no-resync-on-same-task update, generate-uses-live-draft
- [ ] Reference tests: counter text, toggle callback, cap disables non-selected
      thumbnails and leaves selected ones enabled
- [ ] Generate-gate tests: the `generationAvailable` / `hasSignal` / `generating`
      matrix plus the reason-precedence assertion
- [ ] Rename tests: accepted + declined (`onRenameTask` returning `false`)
- [ ] Latest-batch section: skeletons while generating; the `round N+1` label and
      the delegated `ReviewGrid` once an iteration exists (wrap in the real
      `ImagegenProvider`, per the `ReviewGrid.test.tsx` precedent)
- [ ] Verify: `npm test`, `npm run lint`, `npm run typecheck`, plus a mutation pass

## 🔗 Related

- [[TEST-EPIC-002]] — parent epic: component test coverage
- [[TEST-002.2]] — sibling: `ReviewGrid` tests (pattern precedent)
- [[TEST-002.4]] — sibling: `Lightbox` tests (pattern precedent)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `components/TaskDetail.tsx` (184 LOC) still has zero component
  tests, and all three surfaces the PLAN line names are present and unchanged in
  current code. It is the composition point for the whole task pane and carries
  real conditional logic (draft resync, generate-gate precedence, rename restore).

- [x] Read relevant source files

- [x] **Best Practices Review** — test-only task; no production code changes expected.
  Touched responsibility is verification, not behaviour. The established idiom is
  set by `ReviewGrid.test.tsx` / `Sidebar.test.tsx`: local fixture factories, a
  `render*(overrides)` helper returning `vi.fn()` spies, explicit vitest imports
  (`globals: true` is off), hand-wired `afterEach(cleanup)`, and role-based queries.
  Extending that shape rather than inventing a new one. No refactor needed; none
  deferred. Per CLAUDE.md, prefer real seams over module mocks — `TaskDetail` is
  fully props-driven, so no mocks are needed at all.

- [x] **Archive skim** — `grep -l TaskDetail` across the archive returned
  `TEST-001.2`, `TEST-001.3`, `BI-003` (pane), `BI-004` (reference library),
  `BI-005`/`BI-006`/`BI-009` (review grid), `BI-007` (generate controls),
  `BI-030.3` (rename decline), `BI-031.2` (`generationAvailable`), plus the
  `CORE-001.x` adoption notes. Load-bearing findings in Discovery Notes below.

- [x] **Drift check** — no drift. `generationAvailable` is `TaskDetail.tsx:29`,
  `promptDraft` state `:62`, the `generateHint` precedence chain `:80-92`, and
  `onToggleRef` is passed to `ReferenceLibrary` at `:135`. `MAX_ACTIVE_REFS = 3`
  is `lib/workspace.ts:35`. One boundary clarification recorded below (the cap's
  *UI* lives in the child component), not a drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed.** Explicit assumptions:
  1. "ref toggle (≤3 cap)" is tested **through** `TaskDetail` as the composition
     point — the cap affordance renders in the `ReferenceLibrary` child. This does
     not poach [[TEST-002.6]], which owns `ReferenceLibrary`'s own add/remove
     ingest path (file validation, size cap, dropzone).
  2. Test-only task: `TaskDetail.tsx` and its children are not modified.
  3. The rename gate is covered here even though the PLAN line does not name it —
     rationale in Discovery Notes.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive findings (load-bearing):**

- **[[TEST-001.2]]** widened the vitest include glob to
  `{lib,components}/**/*.test.{ts,tsx}` and added the `@` alias + `oxc.jsx.runtime`
  to `vitest.config.ts`. Component tests are discoverable and no config work is needed.
- **[[TEST-002.2]]** set the coverage precedent this file follows, including the
  **mutation pass** as an acceptance criterion (break a branch, confirm the matching
  test fails) — carried forward here.
- **[[BI-007]]** shipped the generate controls with a known gap: a just-typed,
  unblurred prompt was lost at generate time. The `promptDraft` state + the
  `handleGenerate` persist-then-generate pair exist to close it. That is exactly the
  kind of fix a well-meaning refactor silently undoes, so it gets an explicit test.
- **[[BI-030.3]]** made `onRenameTask` return a boolean so a declined slug-break
  warning restores the uncontrolled name input. Also `TaskDetail`-owned logic with a
  documented past bug and no test.
- **[[BI-031.2]]** added `generationAvailable` and the deliberate reason precedence:
  the missing-bridge hint outranks the missing-signal hint, because no prompt helps a
  browser that cannot generate at all. The precedence is the assertion worth pinning.

**Coverage boundary (no duplication):**

- `lib/workspace.test.ts:167` already pins the **pure reducer** cap
  (`toggleTaskRefImage` refuses to exceed `MAX_ACTIVE_REFS`).
- `lib/useWorkspace.test.ts:187` already pins `generationAvailable`'s **detection**
  (bridge present/absent).
- What is untested is the **UI consequence** of both: the disabled thumbnail at the
  cap, and the disabled Generate button with the right explanatory note. That is this
  task's slice.

**Scope note — the rename gate.** The PLAN line names three surfaces. No other
`TEST-EPIC-002` child claims `TaskDetail`, so the BI-030.3 rename-restore branch
would otherwise finish the epic uncovered. It is two tests in the same file, on the
same component, with a documented past regression — added as a deliberate, stated
extension rather than left as a hole.

**Provider requirement.** `TaskDetail` renders `ReviewGrid` → `ResolvedImage`, which
throws outside `ImagegenProvider`. Only the latest-batch tests need an iteration, so
the helper wraps every render in the real provider (same call as `ReviewGrid.test.tsx`;
happy-dom exposes no `indexedDB`, so the mount-time restore resolves to `null`) and
drains it with `await act(async () => {})`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the `ReviewGrid.test.tsx` / `Sidebar.test.tsx`
  idiom: local fixture factories, a `render*(overrides)` helper returning `vi.fn()`
  spies, explicit vitest imports, hand-wired `afterEach(cleanup)`, role-based queries,
  and the real `ImagegenProvider` mount. No new shape invented. The one addition is a
  `markup()` builder split out of `renderDetail()` so `rerender` can reuse the same
  spy set — needed by the task-switch cases and cheaper than threading props by hand.

- [x] **Minimal refactor gate** — no refactor. `TaskDetail.tsx` is fully props-driven,
  so no seam had to be opened to test it; production code is untouched.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Added `components/TaskDetail.test.tsx` (~390 LOC, 30 tests in 6 describes): empty
state, prompt editing, reference selection, the generate gate, the rename gate, and
the latest-batch section. No production file changed.

**Two findings worth recording:**

1. **React restores an uncontrolled input's tracked value after a discrete event.**
   The first cut of the rename-decline test delivered the new name on the blur
   event's own `target` payload (`fireEvent.blur(el, { target: { value } })`). The
   handler's `e.target.value = task.name` restore ran — and was then reverted to the
   fireEvent-supplied value, so the test failed against correct code. Splitting it
   into a real `change` → `blur` pair fixes it and is what a user actually does; it
   is wrapped in a local `renameTo()` helper with the reason in a comment, so the
   next person does not re-derive it.

2. **The first draft-resync tests were mutation-transparent.** Repointing the resync
   effect's dependency from `[task?.id]` to `[task?.basePrompt]` survived, because
   both original cases changed the id and the prompt together. Two cases were added
   to separate the variables — an external `basePrompt` rewrite on the *same* task
   (edit must survive) and a task switch between two *identical* prompts (draft must
   reset). Both kill the mutant, and they are the ones that actually state the rule
   the code comment claims.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npx vitest run components/TaskDetail.test.tsx`
  → **30 passed**. Full suite `npm test` → **292 passed / 18 files** (run because the
  new file mounts the shared `ImagegenProvider`).

- [x] Ran lint/type-check on changed code — `npm run lint` clean, `npm run typecheck` clean.

- [x] **Quality assertions** — no avoidable duplication (fixtures are local factories;
  `markup()` is shared by the initial render and `rerender`; `Spies` derives from
  `makeSpies` rather than restating the prop list). No dead code — lint's unused-symbol
  rule is clean. No public-surface growth: zero production files changed
  (`git diff --stat components/TaskDetail.tsx` empty after the mutation pass). The two
  non-obvious mechanics (React's post-event value restore, the provider requirement)
  carry inline comments rather than being left as folklore.

- [x] **Mutation pass** — eight branch mutations applied and reverted one at a time;
  each was caught by the test written for it:

  | Mutation | Caught by |
  |---|---|
  | bridge gate ignored entirely | bridge-absent + precedence |
  | generate-hint precedence inverted | precedence |
  | `promptDraft.trim()` → `promptDraft` | whitespace-only prompt |
  | declined rename no longer restores | rename decline |
  | generate sends `task.basePrompt` | live-draft generate |
  | `(index ?? 0) + 1` → `index ?? 0` | round label |
  | resync dep `[task?.id]` → `[task?.basePrompt]` | both new resync cases |
  | cap no longer disables thumbnails | cap disable |
  | `generating` no longer disables Generate | in-flight disable |

- [x] (frontend) Visual confirmation — **N/A.** Test-only task; no rendered surface,
  styling, or behaviour changed. `git status` shows one added test file and nothing else.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":
  - `README.md` — **no change.** No feature surface shipped; the file makes no coverage claim.
  - `AGENTS.md` — **no change.** Flowtron workflow only; says nothing about test coverage.
  - `CLAUDE.md` — **no change.** Its testing paragraph (glob, `globals: true` off, real
    seams over module mocks, `vi.mock` reserved for `Workspace.test.tsx`) is still exactly
    right — this task used real props and added no mock.
  - `.flowtron/PLAN.md` — **updated.** `TEST-002.3` flipped to stub form, nested under
    the active `TEST-EPIC-002` parent.

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.`, kept 2-space
  nested beneath the active `TEST-EPIC-002` parent per the epic child-placement invariant;
  tasknote moved to `.flowtron/tasknote/archive/test/TEST-002.3.md`

- [x] **Evidence-based recap** drafted

**Final Summary:**

Put 30 component tests on `components/TaskDetail.tsx`, the task pane's composition
point, which had shipped across six tasks with none. The suite pins the three
surfaces the PLAN line named — prompt editing, reference toggling at the ≤3 cap,
and the Generate gate on `generationAvailable` — plus the BI-030.3 rename-restore
branch, which no other epic child claimed and would otherwise have finished the
epic uncovered.

- **Changed:** `components/TaskDetail.test.tsx` (new, ~390 LOC). No production file
  touched; no dependency added.
- **Verification:** targeted run 30/30; `npm test` 292/292 across 18 files;
  `npm run lint` and `npm run typecheck` clean.
- **Mutation pass:** nine branch mutations across `TaskDetail.tsx` and
  `ReferenceLibrary.tsx`, each caught by its own test (table in Phase 3). Two
  initial gaps were found and closed this way — the resync tests were transparent
  to a dependency-array swap until the id and prompt variables were separated.
- **Refactors:** none made, none deferred. `TaskDetail` is fully props-driven, so
  no production seam had to be opened.
- **Documentation:** three of four AI-referenced docs verified unchanged; PLAN.md
  updated.
- **Maintainability:** the branches most likely to be broken silently now fail
  loudly — the BI-007 unblurred-draft fix, the BI-031.2 hint precedence, and the
  BI-030.3 rename restore each have a named test. Two non-obvious test mechanics
  (React's post-event input-value restore, the `ImagegenProvider` requirement) are
  documented inline so the next component test does not rediscover them.
- **Epic status:** `TEST-002.5` and `TEST-002.6` remain open before the `.N` audit.

**Archived:** 2026-08-09
