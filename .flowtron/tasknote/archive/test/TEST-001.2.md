---
title: vitest-include-tsx
status: completed
tags: [testing, vitest, epic-child]
created: 2026-08-06
due:
related-tasks: [TEST-EPIC-001, TEST-001.3, BI-029.3]
---

# TEST-001.2 | vitest-include-tsx

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-001]] [[TEST-001.3]] [[BI-029.3]]

## 🎯 Goal

Widen the vitest include glob so component tests are discoverable at all, and prove the new path actually runs with one smoke test.

## ✅ Acceptance

- [x] `vitest.config.ts` include glob discovers `.tsx` test files under both `lib/` and `components/`
- [x] At least one component test exists, runs, and passes (`npm test` file count rises from 10 → 11)
- [x] The new test's assertions are **live** — verified by mutation (a wrong expectation makes the suite fail, not pass)
- [x] `npm run lint`, `npm run typecheck`, and `npm run build` stay green with the new `.tsx` test file present
- [x] No new runtime or dev dependency added (the repo's 3-dep tree holds, per BI-021.2)

## 🧩 Subtasks

- [ ] Widen the include glob to `{lib,components}/**/*.test.{ts,tsx}`
- [ ] Resolve the `@/` path alias in the vitest config (components import through it; Vite ignores tsconfig `paths`)
- [ ] Configure the JSX runtime for `.tsx` (tsconfig is `jsx: "preserve"`; Vite does not read it)
- [ ] Add `components/Sidebar.test.tsx` — the one substantial props-only component, no provider wrapper needed
- [ ] Verify: full suite, lint, typecheck, build, plus a mutation check proving the assertions are live

## 🔗 Related

- [[TEST-EPIC-001]] — parent epic; this is the gate fix the rest of the epic depends on
- [[TEST-001.3]] — follow-up sibling: covers `Workspace.tsx`'s auto-load-round effect through the path this task opens
- [[BI-029.3]] — downstream consumer: the export regression test needs a working test path

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The archive shows the lib-only testing culture was a *deliberate,
  twice-reaffirmed* choice (BI-021.3, CORE-001.1) — which initially reads as an
  argument to de-scope. It isn't: the defect is that the culture is now enforced
  by *config* rather than chosen. BI-021.3's author decided to confirm a modal
  manually, a legitimate call; but had they decided otherwise, the test would have
  silently not run. This task restores the choice without mandating broad coverage,
  which is exactly the PLAN line's scope. Two filed siblings (TEST-001.3, BI-029.3)
  are blocked on it.

- [x] Read relevant source files

- [x] **Best Practices Review** — touched surface is build/test config plus one new
  test file; no runtime code changes, so no dependency direction or abstraction
  boundary moves. Existing abstraction extended: `storage.test.ts`'s local
  `makeSession(overrides)` fixture idiom is reused rather than reaching for the real
  `lib/workspace.ts` factories (which mint uuids/timestamps and would make assertions
  non-deterministic). No duplication introduced; no refactor required or deferred.

- [x] **Archive skim** — `archive/bi/` + `archive/core/` (no `archive/test/` — this is
  the first `TEST-` task). Two load-bearing finds, both recorded below.

- [x] **Drift check** — `vitest.config.ts` include was verbatim `["lib/**/*.test.ts"]`
  as the PLAN line cites; `@testing-library/react` + `happy-dom` present in
  devDependencies as claimed; 12 components, none carrying a test. No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed.** Explicit assumptions:
  1. **Smoke target = `Sidebar`.** It is the only substantial component that is
     props-only — no context, and it never reaches `ResolvedImage` (which calls
     `useImagegen()` and throws outside `ImagegenProvider`). Every other candidate
     — `Lightbox`, `ReviewGrid`, `BulkReviewPane`, `TaskDetail` — pulls in
     `ResolvedImage` transitively and would need a provider wrapper, which is
     harness scaffolding this task shouldn't be inventing.
  2. **Scope is the gate, not coverage.** One file, three assertions on logic
     `Sidebar` actually owns. Broad component coverage is TEST-001.3's job.
  3. **No new dependency.** Honors the norm BI-021.2 recorded; ruled out
     `@vitejs/plugin-react` in favour of the built-in `oxc` transform option.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive finds (both shape the task, neither changes its scope):**

- **BI-021.3** drift check states it outright: *"Testing culture is **lib-only**
  (`lib/*.test.ts`; no component tests in the repo) — match it: cover pure parse/emit
  in `storage.test.ts`, confirm the modal manually (BI-019/BI-021.2 precedent)."* So
  the absence of component tests is convention, not neglect. This task does not
  overturn it — it makes the convention a choice again.
- **CORE-001.1** resolved-scoping table: *"Component test coverage (none today) in
  scope for `.3`? → **Only for changed behavior.** Tests extended where fixes change
  logic; no broad new component test suite in this epic."* Reinforces keeping the
  smoke test deliberately minimal.
- **BI-021.2** established the no-new-dependency norm ("the 3-dep tree held"),
  which drove the `oxc`-over-plugin decision below.

**Two config blockers the PLAN line did not anticipate** (surfaced during execution,
both inside the task's own surface so no reconciliation scan was triggered):

1. **`@/` alias.** `Sidebar.tsx` itself imports `@/lib/types` and `@/lib/storage`.
   Vite does not read tsconfig `paths`, so *no* component test could load at all
   without `resolve.alias`. The lib tests never exposed this — they use relative
   imports (`./storage`).
2. **JSX runtime.** tsconfig is `jsx: "preserve"` (Next compiles JSX itself) and Vite
   does not read tsconfig for the transform, so `.tsx` failed to parse with
   `RolldownError: Unexpected JSX expression`. Fixed via Vite 8's `oxc.jsx.runtime`
   rather than adding `@vitejs/plugin-react`.

Widening the glob alone would therefore *not* have worked — worth recording, since
the PLAN line described this as a one-line glob change.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended `storage.test.ts`'s local-fixture idiom
  (`makeSession(overrides)` with frozen timestamps and literal ids) rather than
  introducing a new fixture shape or importing the uuid-minting factories from
  `lib/workspace.ts`. Explicit vitest imports + `afterEach(cleanup)` match
  `useWorkspace.test.ts` (the config sets no `globals: true`, so RTL auto-cleanup
  is unavailable and cleanup must be wired by hand). Single quotes, per `lib/`
  convention; the config file keeps its existing double quotes.

- [x] **Minimal refactor gate** — no refactor. The two config additions
  (`resolve.alias`, `oxc.jsx`) are not cleanup; they are load-bearing prerequisites
  without which no component test can load or parse. No unrelated cleanup performed
  or deferred.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

`vitest.config.ts` (+14 lines net):
- `include` → `["{lib,components}/**/*.test.{ts,tsx}"]`
- `resolve.alias` → `"@"` to the repo root via `fileURLToPath(new URL(".", import.meta.url))`
- `oxc.jsx.runtime` → `"automatic"`
- Comments explain *why* each is needed, so the next reader doesn't retry the
  one-line-glob assumption.

`components/Sidebar.test.tsx` (new, 113 lines) — three tests over the logic `Sidebar`
owns: per-task list rendering, the no-tasks empty state, and the `canGenerateAll`
→ `disabled` gate (asserted in both directions in one test, so a stuck-true or
stuck-false regression is caught).

Deliberately *not* done: no provider-wrapper test helper, no coverage of the eleven
other components, no change to the lib tests. Those are TEST-001.3 / BI-029.3 scope.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — no duplication (the fixture idiom is reused, not
  copied wholesale — `makeTask`/`makeProps` are new and specific to this component's
  prop surface), no dead code, no public-surface growth (nothing exported), and the
  config comments are accurate as written.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** No rendered app
  surface changed; this task adds a test file and test-runner config. `npm run build`
  output is byte-comparable (same route table, 18 kB `/`).

**Testing Notes:**

| Gate | Before | After |
|---|---|---|
| `npm test` | 129 passed / 10 files | **132 passed / 11 files** |
| `npm run lint` | clean | clean |
| `npm run typecheck` | clean | clean |
| `npm run build` | — | ✓ compiled, 5/5 static pages, `/` 18 kB |

**Mutation check (the acceptance criterion that matters).** A green suite proves
nothing on its own — the point of this task is that the *path executes*. Flipping
one expectation to a string that does not render:

```
expect(screen.getByText('Hero banner XXX')).toBeTruthy();
→ Test Files 1 failed (1) · Tests 1 failed | 2 passed (3)
```

The assertion is live and failures surface. Mutation reverted; full suite re-run
green at 132.

Discovery order also served as harness proof: the first run failed with
`RolldownError: Unexpected JSX expression` at `Sidebar.test.tsx:82` — which
demonstrated the widened glob was already discovering the file before the transform
was configured.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface; test-runner config is not part of it. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only; untouched. |
  | `CLAUDE.md` | **No change.** Its Stack section lists framework / state / target API / dev port, with no testing-conventions entry to drift. Considered adding one; deferred as out of scope — better placed once TEST-001.3 lands actual component coverage. |
  | `.flowtron/PLAN.md` | **Updated.** TEST-001.2 flipped to stub form, kept nested under the active TEST-EPIC-001 parent. |

  Also checked §"Project quick commands" (outside the sweep list): `npm test` /
  `npm run test:watch` are unchanged and still accurate.

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-06.`, kept 2-space nested beneath the active `TEST-EPIC-001` parent in `## High` per SPEC/epic.md §"Child placement invariant", then tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Widened the vitest include glob so component tests are discoverable, and proved the
path executes with one smoke test on `Sidebar`. The repo's component tests were
unrunnable-by-config, not merely absent.

**Changed:** `vitest.config.ts` (+14 net) · `components/Sidebar.test.tsx` (new, 113
lines). No runtime code touched.

**Verification:** `npm test` 129→**132 passed**, 10→**11 files**; lint, typecheck, and
`next build` all green. A mutation check (`'Hero banner'` → `'Hero banner XXX'`)
produced `1 failed | 2 passed`, confirming the assertions are live rather than
vacuously green; reverted and re-run clean.

**Refactors:** none made, none deferred. The two config additions beyond the glob
(`resolve.alias` for `@/`, `oxc.jsx.runtime` for the `.tsx` transform) are
prerequisites, not cleanup — without either, no component test loads or parses at
all. Worth flagging: the PLAN line scoped this as a one-line glob change, and that
would not have worked.

**Docs:** three of four AI-referenced docs verified unchanged; PLAN.md updated.

**Maintainability:** the lib-only testing convention (BI-021.3, CORE-001.1) is now a
*choice* again rather than a config accident — a component test added by any future
task will actually run. Directly unblocks TEST-001.3 and BI-029.3, both of which
need this path. No dependency added; the 3-dep tree holds.

**Archived:** 2026-08-06
