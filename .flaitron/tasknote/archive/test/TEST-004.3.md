---
title: route-guard-coverage
status: completed
tags: []
created: 2026-08-30
due:
related-tasks: [TEST-EPIC-004, TEST-004.2, BI-045, BI-046, BI-047]
touches:
  - lib/imagegenRouteGuard.test.ts
  - app/api/imagegen/
---

# TEST-004.3 | route-guard-coverage

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-004]] · [[TEST-004.2]] · [[BI-045]] · [[BI-046]] · [[BI-047]]

## 🎯 Goal

Add a table-driven test that imports every exported route handler under `app/api/imagegen/**` and asserts each returns 403 on a cross-origin `Request`, so a new route added without `refuseUnguarded` fails CI.

## ✅ Acceptance

- [x] A new test file discovers every `route.ts` under `app/api/imagegen/**` **dynamically** — a route added tomorrow is covered without editing the test
- [x] The discovery is itself asserted against the filesystem, so a glob that silently stops matching fails rather than making the suite vacuous
- [x] Every discovered module exports at least one HTTP-verb handler (a route file that exports none fails)
- [x] Each discovered `(route, verb)` pair is asserted table-driven: a cross-origin `Request` yields **403** with `{ ok: false, error: 'Cross-origin requests are not allowed.' }`
- [x] The refusal is asserted to happen **before** the handler reads the request body
- [x] Mutation-verified: removing `refuseUnguarded` from one route makes the suite fail (the assertion is live, per the [[TEST-001.2]] precedent)
- [x] `npm test` passes; `npx tsc --noEmit` and `npm run lint` clean

## 🧩 Subtasks

- [x] Write `lib/imagegenRouteGuard.test.ts` with a module header stating why it lives in `lib/`, why discovery is dynamic, and why the request fixture is a literal
- [x] Discover route modules via `import.meta.glob('../app/api/imagegen/**/route.ts')`; cross-check the glob keys against a `node:fs` walk of the same tree
- [x] Build the `(path, verb)` table at module scope with top-level await, filtering exports to HTTP verb names that are functions
- [x] Assert each pair returns 403 + the cross-origin reason, with a `json()` that rejects so a body-before-guard handler fails
- [x] Mutation check: strip `refuseUnguarded` from one route, confirm the suite fails, restore
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run lint`

## 🔗 Related

- [[TEST-EPIC-004]] — parent epic: imagegen server-surface tests
- [[TEST-004.2]] — predecessor: per-route tests for `lib/imagegenRoute.ts` and the route handlers
- [[BI-045]] — depends-on: introduced the `app/api/imagegen/` server surface and its guard
- [[BI-046]] — depends-on: added the unconfined `browse` route
- [[BI-047]] — depends-on: project-bound imagegen root

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** [[TEST-004.2]] pinned `lib/imagegenRoute.ts` — the helper layer —
  and explicitly reserved route-handler-level 403 coverage for this task. At HEAD
  all seven `app/api/imagegen/**/route.ts` files call `refuseUnguarded` first, but
  nothing asserts that they do: the guard's correctness is tested
  (`imagegenGuard.test.ts`), its translation to a 403 is tested
  (`imagegenRoute.test.ts`), and its *invocation at every entry point* is tested
  nowhere. Scope is unchanged from the filed line.

- [x] Read relevant source files — all seven route handlers under
  `app/api/imagegen/**` (10 exported verb handlers total), `lib/imagegenGuard.ts`,
  `lib/imagegenRoute.ts`, `lib/imagegenRoute.test.ts`, `vitest.config.ts`,
  `tsconfig.json`, `package.json` scripts. Read set was narrow and enumerable —
  no probe needed.

- [x] **Best Practices Review** — test-only addition; no production code change
  planned. Two established shapes are reused rather than reinvented: the
  request-shaped literal with a bare `Headers` (from `imagegenGuard.test.ts` /
  `imagegenRoute.test.ts`, because `new Request` drops `Host` and `Sec-*`
  forbidden header names), and assertion through `NextResponse`'s public surface
  (`.status`, `await .json()`), which [[TEST-004.2]] already proved works under
  happy-dom. **One new shape, deliberately:** module discovery via
  `import.meta.glob` instead of a hand-written import list. Justified below —
  a hardcoded table cannot fail for a route it does not know about, which is
  precisely the regression this task exists to catch. No module mocks; both the
  guard and the route modules are real seams. Dependency direction untouched: the
  test reads `app/` from `lib/`, which is a test-only edge, not a production one.

- [x] **Archive skim** — `grep -rl` over `.flowtron/tasknote/archive/` for
  `imagegenGuard` / `app/api/imagegen` / `imagegenRoute` / `vitest.config`: 15
  hits. Read [[TEST-004.2]] (the direct predecessor) in full and skimmed
  [[TEST-001.2]] (the vitest include-glob decision). Findings in Discovery Notes.
  No `TEST-004.1` sibling exists — the epic's Discovery was supplied by the
  2026-08-30 audit-repo run — so there is no `## 🌳 Fan-out` claim to echo into
  this note's YAML.

- [x] **Drift check** — the PLAN.md line cites `app/api/imagegen/**` (7 route
  files present at HEAD), `refuseUnguarded` (`lib/imagegenRoute.ts:17`, called
  first in all 10 handlers), and a 403 on cross-origin (`imagegenGuard.ts` returns
  `'Cross-origin requests are not allowed.'`, which `refuseUnguarded` serializes
  at 403). All verbatim-accurate. The plan formed here neither contradicts a SPEC
  contract nor diverges from the filed line; `CLAUDE.md`'s testing convention
  (tests beside source under `{lib,components}/**`) is honoured by the chosen
  placement. No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed.** Explicit assumptions:

  1. **The file lives in `lib/`, not `app/`.** `vitest.config.ts`'s include glob is
     `{lib,components}/**/*.test.{ts,tsx}`, so a test colocated beside the routes
     would not be discovered without widening the glob *and* amending `CLAUDE.md`.
     Since the suite discovers its subjects from the filesystem, its own location
     is irrelevant to what it covers — so the minimal change wins and no config is
     touched. The module header records this so the next reader does not retry it.
  2. **Coverage is the guard invariant, not each route's behaviour.** What is
     asserted is that every entry point refuses a cross-origin caller. The
     arguments each handler then validates are `imagegenRoute.test.ts`'s scope
     ([[TEST-004.2]]) and are not re-asserted here.
  3. **No positive control that executes handler bodies.** A same-origin table
     would drive real filesystem work (`browse` with no `path` lists the operator's
     home directory), which is a cost and a surprise this task should not
     introduce. Liveness is proven by mutation instead — the repo's own precedent
     from [[TEST-001.2]].
  4. **No production code changes.** If the suite surfaces a real defect it is
     filed rather than fixed inline, unless it is a one-line correctness bug the
     test proves (the same carve-out [[TEST-004.2]] operated under).

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**A hardcoded import table would not do the job the task asks for.** The PLAN
line's stated purpose is "so a new route added without `refuseUnguarded` fails
CI." A test that imports seven named handlers passes happily when an eighth
route appears — it fails only for routes it already knows about, which are
exactly the routes nobody is worried about. The coverage has to be derived from
the filesystem at test time, or it is not coverage of the invariant at all.

**`import.meta.glob` is the mechanism, and it was spiked before being chosen.**
A throwaway `lib/__spike.test.ts` confirmed under the repo's existing config
(vitest 4.1.8, happy-dom, node 26): the pattern
`'../app/api/imagegen/**/route.ts'` resolves all 7 route files; each lazy loader
resolves to a real module whose verb exports are functions; top-level `await` in
a test file works, so the `(path, verb)` table can be built at module scope and
handed to `it.each` for per-handler test names (10 cases); and
`npx tsc --noEmit` stays clean given a `/// <reference types="vite/client" />`
line (`vite` is already present as a vitest dependency — no new package). The
spike was deleted before Phase 2.

**The glob needs its own guard.** `import.meta.glob` is resolved by Vite at
transform time, so a moved directory or an edited pattern could silently return
fewer entries — and a table-driven suite over an empty table passes. The suite
therefore cross-checks the glob keys against a `node:fs` walk of the same tree,
which turns that silent failure into a red test.

**Environment question already answered upstream.** [[TEST-004.2]]'s Testing
Notes record that `next/server`'s `NextResponse` works unmodified under the
repo's happy-dom vitest environment and that TEST-004.3 "does not need an
environment override or an edge-runtime shim." Confirmed again by the spike;
no environment work in this task.

**Fixture trap inherited from BI-045.** `new Request(url, { headers })` silently
drops `Host` and every `Sec-*` name (forbidden header names), so a fixture built
that way asserts the guard on headers it never received. The sibling suites' 
request-shaped literal is reused. The literal additionally carries a `json()`
that rejects, which makes "the handler guarded before touching the body" an
assertion rather than an assumption.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — two established shapes reused verbatim: the
  request-shaped literal with a bare `Headers` (`imagegenGuard.test.ts`,
  `imagegenRoute.test.ts`) and assertion through `NextResponse`'s public surface
  (`.status`, `await .json()`, proven under happy-dom by [[TEST-004.2]]). **One
  new shape, justified:** `import.meta.glob` module discovery in place of a
  hand-written import list — see Implementation Notes for why the established
  shape (a named import table) cannot satisfy this task's stated goal. No module
  mocks; the guard and the route modules are real seams, per `CLAUDE.md`.

- [x] **Minimal refactor gate** — no production code touched, no `vitest.config.ts`
  change, no new dependency. `vite/client` types come from the existing vitest
  dependency tree. Nothing deferred.

- [x] Implemented the minimal solution — `lib/imagegenRouteGuard.test.ts`
  (122 ln, 18 tests over the 7 route files and their 10 verb handlers).

- [x] Updated/added tests for non-trivial behavior — the suite *is* the deliverable;
  its own liveness is pinned by the two mutations recorded in Testing Notes.

**Implementation Notes:**

**Discovery is the deliverable, not the 403 assertion.** Asserting that seven
known handlers refuse a cross-origin caller is nearly worthless — they all do,
and they will keep doing so. The value is entirely in the eighth route, the one
someone adds in six months and forgets to wrap. So the suite derives its subjects
from `import.meta.glob('../app/api/imagegen/**/route.ts')`, which Vite re-resolves
at transform time on every run, filters each module's exports down to real HTTP
verb names that are functions, and feeds the resulting `(route, verb)` table to
`it.each`. Ten cases today, automatically more tomorrow. Mutation 2 below is the
proof that this works.

**The glob is guarded by a filesystem walk.** A table-driven suite over an empty
table passes, and `import.meta.glob` is exactly the kind of thing that can start
returning nothing after a directory move or a pattern edit — silently, since it
is resolved at build time rather than asserted at run time. A `node:fs` walk of
the same tree cross-checks the glob keys, so that failure mode is a red test
rather than a green vacuum. This is the one assertion in the file that exists to
protect the other seventeen.

**The request literal makes body-ordering an assertion.** Its `json()` returns a
rejected promise, so a handler that awaited the body before calling
`refuseUnguarded` fails rather than passing on a technicality. Combined with the
cross-origin `Origin` header against a loopback `Host`, one fixture covers every
verb — the guard's origin arm refuses `GET` and `POST` identically, so no
per-method table is needed.

**Placement recorded in the file, not just here.** The suite lives in `lib/`
because `vitest.config.ts`'s include glob is `{lib,components}/**` ([[TEST-001.2]]);
a test colocated in `app/` would silently never run. The module header says so, so
the next reader does not "fix" the placement and quietly delete the coverage.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npx vitest run
  lib/imagegenRouteGuard.test.ts`: **18 passed**. Full suite `npm test`: 29 files,
  **527 passed** (baseline 28 files / 509 — this suite is the entire delta).

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` exit 0;
  `npm run lint` exit 0, no output.

- [x] **Quality assertions** — no duplication: the request fixture and the
  `NextResponse` assertion style are the sibling suites' shapes reused
  deliberately, and each collaborator's own behaviour stays asserted in its own
  suite rather than re-asserted here. No dead code. Public surface unchanged —
  nothing outside the new test file was edited, so there is no production surface
  growth at all. No stale code-facing documentation: the one new concept
  (filesystem-derived subjects) is explained in the module header, at the point of
  use. The single piece of unexplained-looking complexity — a `node:fs` walk that
  duplicates what the glob already did — carries its own comment saying why it is
  not redundant.

- [x] (frontend) Asked the user for visual confirmation — **N/A**: no UI surface.
  The change is one test file; nothing renders differently and no production code
  path moved.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

**Both mutations were run, and both went red.** Liveness is proven by mutation
rather than by a same-origin positive control, following the [[TEST-001.2]]
precedent in this repo:

1. **Existing route loses its guard.** Deleting the two `refuseUnguarded` lines
   from `app/api/imagegen/rounds/route.ts` failed exactly one case —
   `'GET' 'app/api/imagegen/rounds/route.ts'` — 1 failed / 17 passed. Restored.
2. **A brand-new unguarded route appears.** Adding
   `app/api/imagegen/__mutation/route.ts` exporting a bare `GET` that returns 200
   raised the suite from 18 to **20** tests on its own — the new route was
   discovered without touching the test file — and failed the one case that
   mattered: `'GET' 'app/api/imagegen/__mutation/route.ts'`, 1 failed / 19 passed.
   Removed.

Mutation 2 is the task's actual acceptance criterion demonstrated end to end: an
unguarded route added by someone who has never read this suite fails CI anyway.
Suite returns to 18/18 green with both mutations reverted, and
`git status --porcelain` confirmed no residue.

**No positive control that executes handler bodies.** A same-origin table would
drive real filesystem work — the browse route with no `path` argument lists the
operator's home directory — which is a cost and a surprise this suite should not
introduce. The mutations cover what a positive control would have: they prove the
403 is caused by the guard rather than by a handler that refuses everything.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: no change (no user-facing surface moved;
  the change is a test file). `AGENTS.md`: no change (it carries the flowtron
  paste-block and no testing conventions). `CLAUDE.md`: no change — its Testing
  bullet states tests live beside their source under
  `{lib,components}/**/*.test.{ts,tsx}` with functions imported explicitly and
  real seams preferred over `vi.mock`, all of which this suite follows; the
  `import.meta.glob` discovery is a single-file technique explained in that file's
  own header, not a project-wide convention worth promoting to a cold-start doc.
  `.flowtron/PLAN.md`: updated at this closure (TEST-004.3 flipped to stub form,
  kept nested under the active TEST-EPIC-004).

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped to
  `completed`, PLAN.md line flipped to stub form and kept nested beneath the
  active parent epic, tasknote moved to `.flowtron/tasknote/archive/test/`.

- [x] **Evidence-based recap** drafted

**Final Summary:**

The imagegen route surface now enforces its own guard invariant in CI. A new
suite discovers every `route.ts` under `app/api/imagegen/**` from the filesystem
at run time and asserts each exported handler returns 403 to a cross-origin
caller — so a route added six months from now without `refuseUnguarded` fails the
build without anyone remembering this test exists.

**Changed:** `lib/imagegenRouteGuard.test.ts` (new, 122 ln, 18 tests). No
production code, no config, no dependency changes — the only file added.

**Verification:** `npx vitest run lib/imagegenRouteGuard.test.ts` 18/18;
`npm test` 527 passed across 29 files (baseline 509 / 28, so this suite is the
entire delta); `npx tsc --noEmit` exit 0; `npm run lint` exit 0.

**Liveness proven by two mutations.** Stripping `refuseUnguarded` from
`rounds/route.ts` failed exactly that route's case. Adding a brand-new unguarded
route raised the suite from 18 to 20 tests *without editing the test file* and
failed the new route — the task's acceptance criterion demonstrated end to end.
Both reverted; suite back to 18/18 with a clean `git status`.

**Refactors:** none. The minimal-refactor gate held completely — this task added
one file and touched nothing else, including `vitest.config.ts` (the suite lives
in `lib/` precisely so the include glob does not need widening).

**Documentation:** doc-drift sweep clean across all four AI-referenced docs. The
one novel technique is documented in the test file's own header, where the reader
who would otherwise undo it will actually see it.

**Maintainability effect.** BI-045 built `refuseUnguarded` so "the guard cannot be
forgotten in one of six files"; [[TEST-004.2]] pinned the helper, and this task
pins the other half of that claim — that every route actually calls it. The
coverage is now self-extending: it grows with the route surface rather than
decaying against it, which is the failure mode a hand-written import table would
have had from its first day. Three cheap protections keep it honest — the glob is
cross-checked against a filesystem walk so it cannot silently cover nothing, each
route must export at least one verb handler, and the fixture's rejecting `json()`
makes "guarded before reading the body" an assertion rather than a hope.

**Archived:** 2026-08-30
