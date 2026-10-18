---
title: route-handler-tests
status: completed
tags: [test, api-routes]
created: 2026-10-18
due:
related-tasks: [TEST-EPIC-012, TEST-004.3, BI-048, BI-062]
touches:
  - lib/imagegenApprovedRoute.test.ts
  - lib/imagegenDiscoveryRoutes.test.ts
---

# TEST-012.3 | route-handler-tests

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[TEST-EPIC-012]]

## 🎯 Goal

Handler-level vitest coverage for `app/api/imagegen/{approved,browse,link,round,rounds}/route.ts`, driven for real against temp roots, so each reaches ≥80% lines under `vitest --coverage`.

## ✅ Acceptance

- [x] `DELETE /approved` and `POST /approved` (and `GET`) have handler tests: success, idempotent/absent, validation refusal, root/confinement refusal — `npx vitest run lib/imagegenApprovedRoute.test.ts`
- [x] `browse`, `link` (GET + POST), `round`, `rounds` have handler tests for success and each refusal branch — `npx vitest run lib/imagegenDiscoveryRoutes.test.ts`
- [x] Each of the five routes ≥80% lines — `npx vitest run --coverage --coverage.include='app/api/imagegen/**'` (read the `% Lines` column)
- [x] Full suite, lint, and type-check stay green — `npm test`, `npm run lint`, `npx tsc --noEmit`

## 🧩 Subtasks

- [x] Baseline coverage measured (approved 20.7, browse 50, link 30.8, round 25, rounds 40 % lines)
- [x] `lib/imagegenApprovedRoute.test.ts` — GET / POST / DELETE of `approved`, real temp root
- [x] `lib/imagegenDiscoveryRoutes.test.ts` — `browse`, `link`, `round`, `rounds`
- [x] Re-measure coverage; every route ≥80%
- [x] Full suite + lint + tsc

## 🔗 Related

- [[TEST-EPIC-012]] — parent epic (test-reach)
- [[TEST-004.3]] — route-guard suite; covers refusals only, which is the gap this fills
- [[BI-048]] — `imagegenFileRoute.test.ts`, the pattern to mirror

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Baseline re-measured today and matches the PLAN line (approved 20.68, browse 50, link 30.76, round 25, rounds 40 % lines). The route-guard suite only asserts the guard fires; no handler success path is tested.

- [x] Read relevant source files — all five `route.ts`, `lib/imagegenRoute.ts` (helpers), `lib/imagegenServerFs.ts` (fs behavior behind them), and the two sibling suites `imagegenFileRoute.test.ts` / `imagegenSelectionRoute.test.ts`.

- [x] **Best Practices Review** — N/A for source: the task adds tests only and touches no module boundary. Test side: real temp roots through the real handlers, no module mocks (matches AGENTS.md "prefer real seams").

- [x] **Archive skim** — `grep -l app/api/imagegen archive/test/`: TEST-004.2/.3/.4/.N, TEST-007.3. Load-bearing: suites must live in `lib/` (vitest glob excludes `app/`), requests must be request-shaped literals (the `Request` constructor drops `Host` / `Sec-*`, which the guard reads), and roots must be `realpath`'d (macOS `/var` → `/private/var`). All three are already the convention in the sibling suites.

- [x] **Drift check** — PLAN line matches the current tree; route list, line numbers, and baseline coverage all current. One nuance: the PLAN line says "mirroring `lib/imagegenFileRoute.test.ts`"; I mirror its fixture style but split per route family rather than one file per route, since the five routes share one request helper.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed (--fast). Assumptions: (1) test files in `lib/`, named `imagegen<Family>Route(s).test.ts`; (2) `link` GET depends on `process.cwd()`, so it is asserted by shape, not content, or with `vi.spyOn(process, 'cwd')`; (3) `browse` is unconfined by design, so its tests use temp dirs and never walk `~`.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:**

Coverage gaps are exactly the post-guard bodies of each handler (GET/POST/DELETE bodies in `approved`, the `path` read in `browse`, `GET` + `POST` body in `link`, `round` and `rounds` bodies). All are thin wrappers over `lib/imagegenRoute.ts` + `lib/imagegenServerFs.ts`, so tests drive the handler against a temp root and assert both the response and the disk.

✅ Phase 1 Discovery complete; entering Phase 2 Execution.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an existing pattern: `imagegenFileRoute.test.ts` / `imagegenSelectionRoute.test.ts` (temp `realpath`'d root, request-shaped literals, real handler, assert on disk). Two files by route family rather than five, since the request helpers are shared within each family.

- [x] **Minimal refactor gate** — no source touched; tests only.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — the deliverable is the tests.

**Implementation Notes:**

- `lib/imagegenApprovedRoute.test.ts` — `GET` (no conflict / identical / differs / missing source / four refusals), `POST` (copy + creates `approved/`, replace, missing source writes nothing, body and root refusals), `DELETE` (remove, round source untouched, idempotent twice over, directory-in-the-way → 400, unlinked, path-in-filename deletes nothing).
- `lib/imagegenDiscoveryRoutes.test.ts` — `browse` (sorted, dot-dirs and files skipped, `recognized` flag, `parent`), `link` GET (stubs `process.cwd` to a temp dir) and POST, `round` (text passthrough, missing batch, unlinked, blank round does not read `r0`), `rounds` (ascending numeric sort, skips folders without `batch.json`, empty root).
- `browse` is never called without a `path`: that branch lists `~`, and a test has no business reading it. The `homedir()` default is therefore untested (`imagegenServerFs.test.ts` exercises `listDirectories` only with explicit paths); it is `lib/` code outside this task's route-handler scope and does not affect the ≥80% criterion.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) N/A — tests only, no rendered surface

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Verification receipt (full suite run — cheap, 6s):

- `npx vitest run lib/imagegenApprovedRoute.test.ts lib/imagegenDiscoveryRoutes.test.ts` → exit 0 (67 passed)
- `npx vitest run --coverage --coverage.include='app/api/imagegen/**'` → exit 0; Lines 100% (92/92) across all seven route files. Before: approved 20.68, browse 50, link 30.76, round 25, rounds 40. Every route is therefore at 100% lines, comfortably above the ≥80% bar.
- `npm test` → exit 0 (35 files, 754 passed)
- `npm run lint` → exit 0
- `npx tsc --noEmit` → exit 0

Quality assertions: no source changed; no dead code. The one place the new suites repeat themselves is the request-literal builders and `SAME_ORIGIN` header constant (see review note 4).

External review (`/code-review medium`, scoped to the two new files). No finding returned a blocker against the ≥80% criterion; Acceptance #1 names "root/confinement refusal", so these were treated as gaps in the criterion as written and fixed:

1. **Fixed** — no symlink-escape / confinement test for `approved`. Added GET, POST (dest and source symlink) and DELETE cases; each asserts nothing was written or deleted outside the root.
2. **Fixed** — `.` / `..` / backslash filenames untested. Added to POST and DELETE (`..` also on GET).
3. **Fixed** — supplied-but-invalid root untested. Added nonexistent-dir cases on every verb and a root-is-a-file case on POST, `rounds`, and `browse`.
4. **Note, not fixed** — request-builder / `SAME_ORIGIN` boilerplate is duplicated across these two suites and the two existing sibling suites. A shared `lib/` test helper is a refactor of existing tests beyond this task; not filed — four copies of a 3-line literal is under the bar.
5. **Fixed** — `rounds` test titled "root is not a folder" tested only a nonexistent path; retitled and a real "root is a file" case added.
6. **Fixed** — `browse` file-path and symlink-to-dir / symlink-to-file cases added. The no-`path` branch (lists `~`) stays untested on purpose.
7. **Fixed** — `round` non-numeric / negative / fractional round and an unparseable `batch.json` (passed through as text — parsing is the client's job) added.
8. **Fixed, reviewer partly wrong** — the reviewer predicted a corrupt `batch.json` would 500 `rounds`; `summarizeRoundBatch` never throws, so it yields an empty summary. A test now pins that.
9. **Fixed** — refused POSTs now also assert `approved/` was not created.
10. **Not fixed** — `link` GET multi-candidate ordering/dedupe: `suggestRoots` is `lib/` code and the single-sibling case plus the empty case cover the handler's lines; ordering is a `imagegenServerFs` concern, out of scope for route-handler tests. The `process.cwd()` stub keeps the real repo's `imagegen/` out of the assertion.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md` no change; `AGENTS.md` no change (its Testing bullet says the route-handler suite lives in `lib/` — still true, now with two more files; the claim is not enumerating); `CLAUDE.md`, `VISION.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md` no change (tests only, no behavior or contract moved); `.flaitron/PLAN.md` updated at closure.

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — N/A: the pitfalls hit (request-shaped literals, `realpath`'d roots, suites in `lib/`) are already in AGENTS.md's Testing bullet and the sibling suites' headers.

**Final Summary:**

Added `lib/imagegenApprovedRoute.test.ts` and `lib/imagegenDiscoveryRoutes.test.ts` (67 tests), driving the `approved`, `browse`, `link`, `round`, and `rounds` handlers for real against temp roots. Route line coverage rose from 20–50% to 100% on all five (100%, 92/92, across the route directory). Full suite 754/754, lint and tsc clean. No source changed.

Recap — changed files: the two new test files (declared in `touches:`); workflow files: this tasknote (archived), `.flaitron/PLAN.md`. `touches:` reconciliation: declared == actual deliverables. Maintainability: closes the gap the route-guard suite left (it asserts refusals only), including the symlink-confinement and idempotent-delete behavior that previously had no test at all.

**Archived:** 2026-10-18
