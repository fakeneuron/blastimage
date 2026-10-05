---
title: imagegen-route-tests
status: completed
tags: []
created: 2026-08-30
due:
related-tasks: [TEST-EPIC-004, BI-045]
touches:
  - lib/imagegenRoute.ts
  - lib/imagegenRoute.test.ts
---

# TEST-004.2 | imagegen-route-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-004]]

## 🎯 Goal

Cover `lib/imagegenRoute.ts` — the shared guard/root/serialize plumbing every
`app/api/imagegen/**` handler routes through — with a unit suite, so the layer
that invokes the guard stops being the untested one.

## ✅ Acceptance

- [x] `lib/imagegenRoute.test.ts` exists and covers all six exports: `refuseUnguarded`, `resultResponse`, `rootFrom`, `jsonBody`, `roundFrom`, `filenameFrom`
- [x] `refuseUnguarded` is asserted both ways: `null` when the guard passes, and a 403 `NextResponse` whose body carries `{ ok: false, error }` when it refuses
- [x] `resultResponse` is asserted on both `Result` arms: 200 + `{ ok: true, value }`, and 400 + `{ ok: false, error }`
- [x] `rootFrom` covers absent/empty input (the "link your folder" caller error) and delegation to `resolveRoot` for a real directory
- [x] `jsonBody` covers a valid object body, malformed JSON, and a non-object JSON body (`null`, array, scalar)
- [x] `roundFrom` and `filenameFrom` cover their accept and reject branches, including round `0` and the path-separator rejections
- [x] `npm test` passes with the new suite; `npx tsc --noEmit` and `npm run lint` clean

## 🧩 Subtasks

- [x] Write `lib/imagegenRoute.test.ts` with a module header stating why the fixtures take the shape they do
- [x] `refuseUnguarded` / `resultResponse` blocks — assert status + parsed body, not just truthiness
- [x] `rootFrom` block against a real temp directory (`realpath`-canonical), mirroring `imagegenServerFs.test.ts`
- [x] `jsonBody` block over the three body shapes
- [x] `roundFrom` + `filenameFrom` blocks over accept/reject branches
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run lint`

## 🔗 Related

- [[TEST-EPIC-004]] — parent epic (imagegen server surface tests)
- [[BI-045]] — built `lib/imagegenRoute.ts` and the two sibling suites this one follows (`imagegenGuard.test.ts`, `imagegenServerFs.test.ts`)
- [[TEST-004.3]] — follow-up sibling: route-handler-level 403 coverage across `app/api/imagegen/**` (this note stays at the helper layer)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `lib/imagegenRoute.ts` has no test file at HEAD, and it is the
  layer that decides whether the guard runs at all, how a `Result` becomes an
  HTTP status, and whether a caller-supplied round number or filename is
  accepted. Its two collaborators (`imagegenGuard`, `imagegenServerFs`) are both
  well covered, which makes this the exact gap the epic names. Scope is
  unchanged from the filed line.

- [x] Read relevant source files — `lib/imagegenRoute.ts` (67 ln, six exports),
  `lib/imagegenGuard.ts`, `lib/imagegenServerFs.ts` `resolveRoot`,
  `lib/storage.ts:57` (`Result<T>`), plus the two sibling suites and
  `vitest.config.ts`.

- [x] **Best Practices Review** — test-only addition; no production code changes
  and no new abstractions. The suite extends two established shapes rather than
  inventing one: request-shaped literals with a bare `Headers` (from
  `imagegenGuard.test.ts`, because the `Request` constructor drops `Host` and
  `Sec-*` forbidden header names) and a real `mkdtemp` + `realpath` temp
  directory (from `imagegenServerFs.test.ts`, because `resolveRoot`'s job is
  what the filesystem actually does). No module mocks — `vi.mock` is reserved
  for components with no injection point per `CLAUDE.md`, and both collaborators
  here are real seams. Dependency direction untouched.

- [x] **Archive skim** — `grep -l` over `archive/{bi,core,test,deployment}/` for
  `imagegenRoute` / `imagegenGuard` / `refuseUnguarded`: hits on `BI-045`,
  `BI-046`, `BI-047`. Read BI-045 (the module's origin) and skimmed the other
  two. Findings in Discovery Notes. No prior `TEST-004.*` tasknote — the epic's
  Discovery was supplied by the 2026-08-30 audit-repo run, so there is no `.1`
  sibling and no `## 🌳 Fan-out` claim to echo into this note's YAML.

- [x] **Drift check** — all six exports named in the PLAN.md line exist verbatim
  in `lib/imagegenRoute.ts` at HEAD (`refuseUnguarded:17`, `resultResponse:23`,
  `rootFrom:35`, `jsonBody:40`, `roundFrom:53`, `filenameFrom:60`). No test file
  exists for the module. The plan this note forms is a pure superset-free read of
  its PLAN.md line, and touches no SPEC contract.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed.** Assumptions: (1) scope is the helper module only
  — asserting 403s through the actual `app/api/imagegen/**` handlers is
  TEST-004.3's deliverable, and duplicating it here would just move that task's
  work; (2) no production code changes — if a test surfaces a real defect it is
  filed, not fixed inline, unless it is a one-line correctness bug the test
  proves; (3) `NextResponse` is asserted through its public surface (`.status`,
  `await .json()`), which the spike below confirms works under happy-dom.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**The layer under test is where the guard is enforced.** `refuseUnguarded` is
the only reason six route files cannot each forget to call
`guardImagegenRequest` — BI-045's Implementation Notes say so explicitly ("so
the guard cannot be forgotten in one of six files"). That reasoning has never
been pinned by a test. `imagegenGuard.test.ts` proves the *decision* is right;
nothing proves the decision is turned into a 403 with a body.

**Environment spike (run before writing anything).** `next/server`'s
`NextResponse.json` was the one open question — the suite is the first in the
repo to import it, and the vitest environment is happy-dom, not node. A
throwaway test confirmed `NextResponse.json(body, { status })` constructs,
exposes `.status`, and round-trips through `await .json()` under the existing
config. No environment override, no `@edge-runtime/vm`, no adapter needed.

**Two fixture traps inherited from BI-045.** (1) `new Request(url, { headers })`
silently drops `Host` and every `Sec-*` header, so a `refuseUnguarded` fixture
built that way would assert on headers the guard never received — the sibling
suite's request-shaped literal is the workaround and this suite reuses it. (2)
`resolveRoot` returns `realpath` output and containment is a prefix comparison,
so a raw `mkdtemp` path fails on macOS (`/var` → `/private/var`); the temp
fixture must canonicalize up front, as `imagegenServerFs.test.ts` does.

**`roundFrom` accepts `0` despite the doc comment.** The comment reads "positive
integer" but the guard is `n < 0`, so round `0` is accepted. Round numbering
starts at 1 in practice, but `0` is not rejected — the test pins the actual
behaviour and the note records the comment/code mismatch rather than silently
asserting either reading as intended.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — no new shape. The suite extends the two fixtures the
  sibling suites already established: `imagegenGuard.test.ts`'s request-shaped
  literal (the `Request` constructor drops `Host`/`Sec-*`) and
  `imagegenServerFs.test.ts`'s real `mkdtemp` + `realpath` workspace with a
  `beforeEach`/`afterEach` pair. One small local helper is new — `bodyReq`, a
  `{ json }` literal — because `jsonBody` touches nothing else on a `Request`
  and a real `Request` cannot be made to reject on `.json()` without also
  carrying a body. No module mocks: both collaborators are real seams, per
  `CLAUDE.md`.

- [x] **Minimal refactor gate** — one production change, and only because a test
  proved a defect (below). No other file touched; no cleanup deferred.

- [x] Implemented the minimal solution — `lib/imagegenRoute.test.ts` (248 ln, 27
  tests) + a 1-branch fix in `lib/imagegenRoute.ts` `roundFrom`.

- [x] Updated/added tests for non-trivial behavior — every branch of all six
  exports, plus a regression test pinning the `roundFrom` fix.

**Implementation Notes:**

**A blank round silently became round 0.** `roundFrom` coerced with
`Number(raw)`, and `Number('')` is `0` — so `?round=` or a `{round: ''}` body
passed the `Number.isInteger(n) && n >= 0` guard and resolved to a real round
directory. Harmless on the two read paths (`rounds/r0/batch.json` does not
exist, and `resolveUnderRoot` still confines it), but `POST /api/imagegen/selection`
routes the same value into `writeRoundSelection`, which **creates**
`rounds/r0/selection.json` in the operator's repo. That is a write from a value
the function was written to reject.

Fixed inline rather than filed, under the Phase 1 assumption reserving that for
a one-line correctness bug a test proves: the string branch now maps a
blank/whitespace-only value to `NaN` before `Number` sees it. The doc comment
moved from "positive integer" to "non-negative integer" in the same edit — it
was already inaccurate about the `n < 0` guard, and the accuracy claim sits on
the line being changed.

**Round 0 itself is left accepted.** Tightening the guard to `n < 1` is a
behaviour change no failure here proves, and nothing writes `r0` any more once
the blank case is closed. Pinned as-is with the reasoning in the test.

**Two tolerated-but-unasserted shapes pinned, not corrected.** `jsonBody` lets a
JSON array through (`typeof [] === 'object'`, non-null), and `filenameFrom`
returns a padded name verbatim — trimming decides only emptiness. Both are
recorded as the module's actual contract with a comment saying why the test
blesses rather than fixes them: every caller reads named keys off the body,
which an array has none of, and no caller is harmed by the padding.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npx vitest run
  lib/imagegenRoute.test.ts`: **27 passed**. Full suite `npm test`: 28 files,
  **509 passed** (baseline 27 files / 482 — the suite is the entire delta).

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` clean (exit 0),
  `npm run lint` clean (no output).

- [x] **Quality assertions** — no duplication: the request and workspace
  fixtures are the sibling suites' shapes reused deliberately, not copied
  logic, and each collaborator's own behaviour stays asserted in its own suite
  rather than re-asserted here. No dead code. Public surface unchanged —
  `roundFrom`'s signature and every accepted input except the blank string are
  identical. Code-facing doc corrected in place (`roundFrom`'s comment).

- [x] (frontend) Asked the user for visual confirmation — **N/A**: no UI
  surface. The change is a test file plus one branch in a server-side helper;
  nothing renders differently.

**Testing Notes:**

**The regression test was verified to actually fail.** Stashing the `roundFrom`
fix while leaving the new (untracked) suite in place reproduced 2 failures —
the blank-round test and the negatives/unparseable loop that includes `''`.
Restoring the fix returns both to green, so the test is pinned to the defect
rather than to the implementation that happens to be there.

**Environment note for the next suite in this area.** `next/server`'s
`NextResponse.json` works unmodified under the repo's happy-dom vitest
environment — `.status` and `await .json()` both behave. TEST-004.3 needs the
same import to reach the real route handlers and does not need an environment
override or an edge-runtime shim.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: no change (no user-facing surface
  moved). `AGENTS.md`: no change (no workflow or command change).
  `CLAUDE.md`: no change — its Testing bullet describes the conventions this
  suite followed (tests beside source, explicit imports, `afterEach(cleanup)`
  by hand, real seams over `vi.mock`), and its `app/api/imagegen/` paragraph
  describes routes, not this helper. `.flowtron/PLAN.md`: updated at this
  closure (TEST-004.2 flipped to its stub form, kept nested under
  TEST-EPIC-004).

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped
  to `completed`, PLAN.md line flipped to the stub form and kept nested beneath
  the active parent epic, tasknote moved to `.flowtron/tasknote/archive/test/`.

- [x] **Evidence-based recap** drafted

**Final Summary:**

`lib/imagegenRoute.ts` — the shared plumbing every `app/api/imagegen/**` handler
routes through, and the reason none of them can forget the guard — went from
zero tests to 27. Writing them surfaced one real defect, fixed in the same task.

**Changed:** `lib/imagegenRoute.test.ts` (new, 248 ln, 27 tests across all six
exports); `lib/imagegenRoute.ts` (+14/−2 — one branch in `roundFrom` plus its
doc comment).

**Verification:** `npx vitest run lib/imagegenRoute.test.ts` 27/27; `npm test`
509 passed across 28 files (baseline 482 / 27); `npx tsc --noEmit` exit 0;
`npm run lint` clean. The regression test was confirmed to fail against the
pre-fix module before being accepted.

**Defect found and fixed.** `roundFrom` coerced a blank round with `Number('')`
→ `0`, which passed its own guard. On `POST /api/imagegen/selection` that wrote
`rounds/r0/selection.json` into the operator's repo from an input the function
intended to reject. One branch closes it; a regression test pins it.

**Refactors:** none beyond that fix — the minimal-refactor gate held, and the
suite adds no abstraction, no helper module, and no shared fixture file.

**Documentation:** doc-drift sweep clean across all four AI-referenced docs; one
code-facing comment corrected in place.

**Maintainability effect.** The layer that converts a guard refusal into a 403
and a `Result` into a status code is now pinned, so a future edit to
`imagegenRoute.ts` fails loudly rather than silently changing what six routes
return. Three shapes the module tolerates but never documented — round 0, array
bodies, un-trimmed filenames — are now recorded as deliberate rather than
rediscovered by the next reader. TEST-004.3 inherits a verified answer to the
one environment question it would otherwise have had to spike.

**Archived:** 2026-08-30
