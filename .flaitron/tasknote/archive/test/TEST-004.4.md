---
title: imagegen-client-tests
status: completed
tags: []
created: 2026-08-30
due:
related-tasks: [TEST-EPIC-004, BI-045, BI-046, BI-047]
touches:
  - lib/imagegenClient.ts
  - lib/imagegenClient.test.ts
---

# TEST-004.4 | imagegen-client-tests

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-004]] · [[BI-045]] · [[BI-046]] · [[BI-047]]

## 🎯 Goal

Cover `lib/imagegenClient.ts` — the browser-side plumbing every UI caller routes through to reach the `app/api/imagegen/*` server surface — with a unit suite driven by `vi.stubGlobal('fetch', ...)`, so the client layer stops being the untested half of the request path.

## ✅ Acceptance

- [x] `lib/imagegenClient.test.ts` exists and covers all 12 exported functions: `loadStoredRoot`, `clearStoredRoot`, `suggestedRoots`, `browseDirectory`, `linkRoot`, `linkImagegenRoot`, `listRounds`, `readRoundBatch`, `writeRoundSelection`, `approvedConflict`, `promoteApproved`, `removeApproved`, `imagegenFileUrl`
- [x] GET-path query construction is asserted per function (`path`, `root`, `round`, `filename` as applicable); POST/DELETE body payloads are asserted for `linkRoot`, `writeRoundSelection`, `promoteApproved`, `removeApproved`
- [x] `envelope()` unwrapping is asserted on both `Result` arms — success (200 + value) and failure (non-200 + error) — plus a non-JSON response body and a network-level `fetch` throw, each surfacing the correct fallback error string
- [x] Array/void-returning wrappers (`suggestedRoots`, `listRounds`) are asserted to collapse a failed `Result` into `[]` rather than propagating the error
- [x] `readRoundBatch` is asserted to reject when `batch.json`'s own `round` field disagrees with the requested round, even when `parseRoundBatch` itself succeeds
- [x] `loadStoredRoot` / `clearStoredRoot` are asserted against real `localStorage` (happy-dom), not a `fetch` stub
- [x] `imagegenFileUrl` is asserted for `epoch === 0` (omits `v`) and `epoch > 0` (includes `v`)
- [x] `npm test` passes with the new suite; `npx tsc --noEmit` and `npm run lint` clean

## 🧩 Subtasks

- [x] Write `lib/imagegenClient.test.ts` with a module header stating why the fixtures take the shape they do
- [x] Build a `fetch` stub helper that captures the request URL (for GET query assertions) and body (for POST/DELETE assertions), following `lib/imageBlob.test.ts`'s `vi.stubGlobal('fetch', ...)` + `afterEach(vi.unstubAllGlobals)` shape
- [x] `envelope()` unwrap block: success, failure-with-error, failure-without-error (status fallback), non-JSON body, network throw — driven through one representative export (`suggestedRoots`) since `envelope` is private
- [x] Per-export query/body construction block for the remaining 11 exports
- [x] `readRoundBatch` round-mismatch regression case
- [x] `loadStoredRoot` / `clearStoredRoot` localStorage block
- [x] `imagegenFileUrl` epoch block
- [x] Run `npm test`, `npx tsc --noEmit`, `npm run lint`

## 🔗 Related

- [[TEST-EPIC-004]] — parent epic: imagegen server-surface tests
- [[BI-045]] — depends-on: introduced `app/api/imagegen/` and the `RouteEnvelope`/`Result` contract this client unwraps
- [[BI-046]] — depends-on: added the unconfined `browse` route `browseDirectory` calls
- [[BI-047]] — depends-on: rewrote `lib/imagegenClient.ts` to drop the live-root cache, leaving `loadStoredRoot`/`clearStoredRoot` as the one-shot legacy-adoption path this suite covers

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** [[TEST-004.2]] pinned the server-side helper layer (`lib/imagegenRoute.ts`) and [[TEST-004.3]] pinned that every route invokes its guard; neither touches the browser-side caller. `lib/imagegenClient.ts` has no test file at HEAD, and it is the layer every UI code path (`useWorkspace`, `ImagegenContext`) goes through to reach the server — its `envelope()` unwrap, query-string construction, and the `loadStoredRoot`/`clearStoredRoot` legacy-adoption path are all untested. Scope matches the filed line exactly.

- [x] Read relevant source files — `lib/imagegenClient.ts` (207 ln, 12 exports + private `envelope`/`getJson`/`sendJson`/`safeStorage`), `lib/storage.ts:57` (`Result<T>`), `lib/roundBatch.ts` (`parseRoundBatch`, `RoundBatch`), `lib/roundSelection.ts` (`RoundSelectionTask`), `lib/imagegenServerFs.ts:301` (`DirectoryListing`), and the two existing `vi.stubGlobal('fetch', ...)` suites in the repo (`lib/imageBlob.test.ts`, `lib/storage.test.ts`) for the established fixture shape. Read set was narrow and fully enumerable — no probe needed.

- [x] **Best Practices Review** — test-only addition; no production code change planned. One established shape is reused: `vi.stubGlobal('fetch', fetchMock)` + `afterEach(() => vi.unstubAllGlobals())`, exactly `lib/imageBlob.test.ts`'s pattern. `loadStoredRoot`/`clearStoredRoot` are tested against real `localStorage` rather than a mock, following `lib/storage.test.ts`'s `localStorage.clear()` convention — happy-dom provides a real `Storage` implementation, so stubbing it would test the stub instead of the code. No module mocks; `fetch` and `localStorage` are the only seams, both real globals under happy-dom. Dependency direction untouched — the test imports only from `lib/`.

- [x] **Archive skim** — `grep -rl` over `.flowtron/tasknote/archive/*/` for `imagegenClient` / `linkImagegenRoot` / `imagegenFileUrl` / `writeRoundSelection` / `loadStoredRoot`: hits on `BI-024.2`, `BI-024.4`, `BI-046`, `BI-045`, `BI-047`, `TEST-004.2`. Read `BI-047` in full — it is the task that rewrote this exact file, deleting `saveStoredRoot`/`restoreLinkedRoot` and leaving `loadStoredRoot`/`clearStoredRoot` as a deliberate one-shot adoption path (its Implementation Notes: "Adoption is one-shot, by construction... A path that no longer resolves is dropped rather than retried forever"). Skimmed `BI-045` (envelope/`RouteEnvelope` origin) and `BI-046` (`browseDirectory`'s picker use). `TEST-004.2`/`.3` confirmed as siblings covering the server side only — no overlap. No `TEST-004.1` sibling exists (epic Discovery supplied by the 2026-08-30 audit-repo run), so no `## 🌳 Fan-out` claim to echo into this note's YAML.

- [x] **Drift check** — the PLAN.md line's three named surfaces all verified at HEAD: URL/query construction (`getJson`/`sendJson` build every request via `URLSearchParams`, `imagegenFileUrl` builds one directly), `Result` unwrapping (`envelope<T>`, lines 70-81), and stored-root handling (`loadStoredRoot`/`clearStoredRoot`, lines 52-63, unchanged since BI-047). `vi.stubGlobal('fetch', ...)` is the exact mechanism named and already the repo's established pattern (2 prior suites). The plan formed here neither contradicts a SPEC contract nor diverges from the filed line, and matches `CLAUDE.md`'s testing convention (tests beside source, real seams over `vi.mock`). No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed (--fast not used; genuinely unambiguous).** Explicit assumptions:

  1. **`envelope()` is exercised through its callers, not directly.** It is a private, unexported function — its five behaviors (success, failure-with-error, failure-without-error, non-JSON body, network throw) are asserted through `suggestedRoots`, one representative export, rather than re-asserted per caller. Every other export's own test focuses on its request-shape contribution (query/body), not re-proving `envelope`.
  2. **`getJson`/`sendJson` are covered transitively, not directly.** Same private-helper reasoning as `envelope` — both are exercised by every GET/POST/DELETE export's own test.
  3. **No production code changes.** If the suite surfaces a real defect it is filed rather than fixed inline, unless it is a one-line correctness bug the test proves (the [[TEST-004.2]]/[[TEST-004.3]] carve-out).
  4. **`safeStorage()`'s `window === undefined` and privacy-mode-throw branches are not separately asserted.** Both are environment-detection guards vitest's happy-dom environment cannot exercise without mocking `window` itself, which the repo's `lib/storage.test.ts` also does not do for its own `localStorage` calls — out of scope for this task's stated coverage (query construction, `Result` unwrapping, stored-root handling).

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**This is the last untested layer in the imagegen client/server round-trip.** [[BI-045]] built the server adapter with three sibling test suites (`imagegenGuard.test.ts`, `imagegenServerFs.test.ts`, and later [[TEST-004.2]]'s `imagegenRoute.test.ts`); [[TEST-004.3]] pinned that every route handler invokes the guard. `lib/imagegenClient.ts` — the file every one of those routes is *called from* — has had no suite since BI-045 introduced it. This task closes the loop: server-side guard (tested), server-side routing/serialization (tested), route-handler invocation (tested), and now the client that constructs every one of those requests.

**`envelope()`'s non-JSON-body path is deliberately safety-net behavior, not a documented contract.** `res.json()` throwing (a crashed route, a proxy error page) is caught and treated as `body = null`, which then falls into the `!body || !body.ok` branch with the `res.status`-based fallback message. This mirrors what the pre-BI-045 File System Access layer did with a rejected handle operation, per the file's own header comment. Worth a dedicated test case because it is the one branch that has no server-side counterpart to cross-check against.

**`readRoundBatch`'s round-mismatch guard is client-side, not server-side.** The server route (`/api/imagegen/round`) returns whatever `batch.json` says; `readRoundBatch` is the only place that cross-checks the returned `round` field against the round number the caller actually requested (lines 150-155). A route serving a stale or misnumbered file would otherwise be handed to the UI silently — this is the one export with logic beyond "unwrap and forward," so it earns its own regression case.

**`loadStoredRoot`/`clearStoredRoot` are legacy, but still load-bearing.** Per BI-047's Implementation Notes, they are the one-shot adoption path for a root linked before BI-047 — read once at mount, cleared immediately after (success or not). The functions themselves are trivial `localStorage` wrappers; the task-level coverage need is just "the wrapper does what it says," not re-testing BI-047's `useWorkspace` orchestration (out of scope — that belongs to `lib/useWorkspace.test.ts`, already covers the adoption *flow*).

**Fixture shape chosen: URL-capturing `fetch` mock, no request-literal trap.** Unlike [[TEST-004.2]]/[[TEST-004.3]], which build `Request` objects and hit the `Host`/`Sec-*` forbidden-header drop from the real `Request` constructor, this suite's `fetch` is stubbed entirely — no real `Request` is ever constructed, so that trap does not apply here. The mock captures `(input, init)` and asserts against the parsed `URL`/`init.body` directly, matching `lib/imageBlob.test.ts`'s existing idiom.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — reused `lib/imageBlob.test.ts`'s `vi.stubGlobal('fetch', ...)` + `afterEach(vi.unstubAllGlobals)` shape and `lib/storage.test.ts`'s direct-`localStorage` convention verbatim; no new fixture idiom introduced. A single `stubFetch(handler)` helper parameterizes the response per test (rather than one hardcoded mock per describe block), since 11 of the 13 request-shape tests only differ in what the handler returns.

- [x] **Minimal refactor gate** — test-only; no production code touched.

- [x] Implemented the minimal solution — `lib/imagegenClient.test.ts` (271 ln, 27 tests) covering all 12 exports.

- [x] Updated/added tests for non-trivial behavior — the suite *is* the deliverable.

**Implementation Notes:**

**One fixture bug caught and fixed before the suite went green.** The `readRoundBatch` fixture's `batchJson()` helper initially omitted `RoundBatchTask.name` (a required field alongside `slug`/`prompt`/`images`), so `parseRoundBatch` legitimately rejected the fixture with `Task 1 needs a non-empty "name".` — both `readRoundBatch` tests failed against a fixture bug, not a code bug. Added `name: 'Hero'` to the fixture; both tests then passed. No production code was in question at any point.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npx vitest run lib/imagegenClient.test.ts`: **27 passed**. Full suite `npm test`: 30 files, **554 passed** (baseline 29 files / 527 — this suite is the entire delta).

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` exit 0, no output; `npm run lint` exit 0, no output.

- [x] **Quality assertions** — no duplication: the `stubFetch`/`jsonResponse` helpers are the sibling suites' `vi.stubGlobal('fetch', ...)` idiom reused, parameterized once rather than copy-pasted per test. No dead code. Public surface unchanged — nothing outside the new test file was edited. No stale code-facing documentation: the module header explains the one deliberate departure from the sibling suites (no `Request`-literal trap, because `fetch` itself is stubbed) at the point a reader would otherwise wonder why.

- [x] (frontend) Asked the user for visual confirmation — **N/A**: no UI surface. The change is one test file; nothing renders differently and no production code path moved.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: no change (no user-facing surface moved; the change is a test file). `AGENTS.md`: no change (no workflow or command change). `CLAUDE.md`: no change — its Testing bullet describes the conventions this suite follows (tests beside source, real seams over `vi.mock`), and the `vi.stubGlobal('fetch', ...)` pattern it names is exactly what this suite reuses rather than a new convention worth adding. `.flowtron/PLAN.md`: updated at this closure (TEST-004.4 flipped to stub form, kept nested under the active TEST-EPIC-004).

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form and kept nested beneath the active parent epic, tasknote moved to `.flowtron/tasknote/archive/test/`.

- [x] **Evidence-based recap** drafted

**Final Summary:**

`lib/imagegenClient.ts` — the browser-side layer every UI caller routes through to reach `app/api/imagegen/*` — went from zero tests to 27, closing out TEST-EPIC-004's coverage sweep across guard (BI-045-era suites), route helper ([[TEST-004.2]]), route-handler invocation ([[TEST-004.3]]), and now the client that constructs every request.

**Changed:** `lib/imagegenClient.test.ts` (new, 271 ln, 27 tests across all 12 exports). No production code, no config, no dependency changes.

**Verification:** `npx vitest run lib/imagegenClient.test.ts` 27/27; `npm test` 554 passed across 30 files (baseline 527/29, so this suite is the entire delta); `npx tsc --noEmit` exit 0; `npm run lint` exit 0.

**One fixture bug caught pre-green, not a production bug.** The `readRoundBatch` fixture initially omitted `RoundBatchTask.name` (a required field), so `parseRoundBatch` correctly rejected it — both affected tests failed against the fixture, not the code under test. Fixed in the fixture before the suite was accepted as green.

**Refactors:** none. The minimal-refactor gate held completely — this task added one file and touched nothing else.

**Documentation:** doc-drift sweep clean across all four AI-referenced docs. The suite's one departure from the sibling suites' fixture shape (no `Request`-literal trap, because `fetch` itself is stubbed) is explained in the module header.

**Maintainability effect.** TEST-EPIC-004's stated gap — "the BI-045/046/047 server surface writes to the operator's repo and has no tests on the layer that invokes its guard" — is now closed end to end: the guard's decision, its translation to a 403, every route's invocation of it, and the client that builds every one of those requests are each independently pinned. A future edit to `imagegenClient.ts`'s query construction, `envelope()` unwrapping, or the `readRoundBatch` round-mismatch guard now fails loudly rather than silently changing what the UI receives.

**Archived:** 2026-08-30
