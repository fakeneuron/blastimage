---
title: imagegen-link-load-e2e
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: [TEST-EPIC-007, TEST-007.2, TEST-007.4, TEST-007.N]
touches:
  - e2e/imagegen-link-load.spec.ts
  - test-fixtures/imagegen/rounds/r1/hero-banner-001.jpg
  - test-fixtures/imagegen/rounds/r1/hero-banner-002.jpg
# No TEST-007.1 Fan-out to echo — epic was filed from audit-repo with children starting at .2.
---

# TEST-007.3 | imagegen-link-load-e2e

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-007]] [[TEST-007.2]] [[TEST-007.4]] [[TEST-007.N]]

## 🎯 Goal

Exercise 🔗 Link imagegen + ↻ Load round against `test-fixtures/imagegen/` through the running Next server.

## ✅ Acceptance

- [x] `e2e/imagegen-link-load.spec.ts` exercises 🔗 Link imagegen (typed-path fallback) against `test-fixtures/imagegen/` through the Playwright webServer
- [x] After link, round r1 is in the review UI (Hero banner task, prompt, two review images) — auto-load (BI-026) is the product path
- [x] ↻ Load round r1 is enabled and a click re-ingests without duplicating the task (BI-043)
- [x] Fixture round images are real JPEGs (the committed files were 1×1 PNGs named `.jpg`; `X-Content-Type-Options: nosniff` would hide them)
- [x] `e2e/smoke.spec.ts` still passes; vitest still discovers only `{lib,components}/**/*.test.{ts,tsx}`

## 🧩 Subtasks

- [x] Replace the two fixture `.jpg` files with real 1×1 JPEGs so the file route can serve them
- [x] Add `e2e/imagegen-link-load.spec.ts` extending the smoke spec's Playwright shape
- [x] Run `just e2e` (or `npm run e2e`) and confirm both specs pass
- [x] Confirm `npm test` still ignores `e2e/`

## 🔗 Related

- [[TEST-EPIC-007]] — parent epic: real-browser harness for folder picker, round load, and review keyboard paths
- [[TEST-007.2]] — depends-on: Playwright harness, dedicated port, CI e2e job, smoke spec
- [[TEST-007.4]] — follow-up: lightbox / keep / approve / discard / focus-trap in a real browser
- [[TEST-007.N]] — epic audit (not started)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** TEST-007.2 landed the Playwright harness (port 3009, smoke spec). Link + Load against `test-fixtures/imagegen/` is still unexercised in a real browser; the fixture, picker, and ingest path all exist.

- [x] Read relevant source files — `e2e/smoke.spec.ts`, `playwright.config.ts`, `components/Sidebar.tsx` (Link / Load round labels), `components/ImagegenLinkModal.tsx` (typed-path fallback), `components/Workspace.tsx` (BI-026 auto-load), `lib/useWorkspace.ts` (`linkImagegenFolder` / `loadRound`), `test-fixtures/imagegen/rounds/r1/`, `app/api/imagegen/file/route.ts` (nosniff + extension MIME)

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  Extend `e2e/smoke.spec.ts`'s Playwright shape (`@playwright/test`, role queries, no helpers file). Specs stay in `e2e/*.spec.ts` so vitest never discovers them (TEST-001.2 / TEST-007.2). Typed-path fallback is the CI-stable way to name `test-fixtures/imagegen/` — the browse tree starts at `$HOME` and is environment-dependent. Keep/approve/discard/lightbox/focus-trap stay in TEST-007.4. Fixture JPEG correction is in-scope: Load round cannot show images until the bytes match the `.jpg` MIME the file route advertises.

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Explicit assumptions:
  1. **Typed path, not browse.** PLAN names `test-fixtures/imagegen/`; the picker's "Or type an absolute path" field is the only environment-stable way to hit it in CI. `path.join(process.cwd(), 'test-fixtures', 'imagegen')`.
  2. **Auto-load then click Load.** BI-026 auto-loads r1 after link; the spec waits for that, then clicks ↻ Load round r1 to exercise the named button and BI-043 idempotence. Fixture has one task, so bulk-review does not open.
  3. **TEST-007.4 owns review keyboard.** This spec asserts ingest (task, prompt, two `<img>`s), not keep/approve/discard/lightbox/focus-trap.
  4. **Fixture bytes.** The two committed `.jpg` files are 1×1 PNGs. The file route serves them as `image/jpeg` with `nosniff` (BI-048), so a browser will not decode them. Replace the bytes with real 1×1 JPEGs; keep the `.jpg` names (unit tests use those filenames as strings, independent of the fixture files).
  5. **No app-code change.** The e2e is the deliverable; picker/load already work. Negative paths (bad path, owned-folder) stay in `ImagegenLinkModal.test.tsx`.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Current state:**
- Harness: `playwright.config.ts` port **3009**, `reuseExistingServer: false`, chromium-only, `testDir: ./e2e`. `e2e/smoke.spec.ts` asserts title + Project combobox and explicitly defers folder-picker / round-load here.
- Picker: 🔗 Link imagegen → dialog `Link imagegen folder`. Three naming paths (BI-046): shortcuts, tree, typed fallback (`getByLabel('Or type an absolute path')` + `Link path`). After a successful link the sidebar button's accessible name is `imagegen linked: ${imagegenRootLabel}` → `test-fixtures/imagegen`. Empty bootstrap project is renamed after the parent folder (`test-fixtures`, BI-047).
- Load: ↻ button `aria-label` is `Load round r1` once rounds exist; disabled until linked. Round chips only when `availableRounds.length > 1` (fixture has r1 only). `Workspace.tsx` auto-loads latest round once per mount when linked + rounds exist + `loadedRound === null` (BI-026).
- Fixture: `rounds/r1/batch.json` schemaVersion 1, one task `hero-banner` / "Hero banner" / "Warm hero shot for the homepage", two images. ReviewGrid `<img alt>` is that prompt. `ingestRoundBatch` slugs by name; re-load upserts the same round (BI-043).
- Images: `ResolvedImage` → `/api/imagegen/file` with extension MIME + `X-Content-Type-Options: nosniff`. Fixture files are PNG bytes named `.jpg` (`file` reports "PNG image data, 1 x 1"). They will not render until the bytes are JPEG.

**Archive skim (`archive/test/` + related BI notes):**
- **TEST-007.2** — predecessor. Smoke is harness proof only; "folder-picker / round-load / review-keyboard paths belong to TEST-007.3 and TEST-007.4". `test-fixtures/imagegen/` noted as existing for this child. No `.1` Fan-out.
- **BI-046** — picker; typed path is first-class for anything the tree omits. Accessible names we can query.
- **BI-026** — auto-load is the common path after link; manual Load remains.
- **BI-043** — reingest of the same `r<N>` must not duplicate the task. Spec clicks Load after auto-load to pin that in-browser.
- **BI-048** — file route nosniff; mislabeled MIME will not display. Directly motivates the fixture-byte fix.
- TEST-001.*–TEST-006, TEST-004.* — vitest / route tests; none run Playwright.

**Drift check:** PLAN.md line matches HEAD. TEST-007.2 completed and nested. Fixture path, Sidebar labels (`Link imagegen`, `Load round r1`), and modal role name all match current code. No SPEC contradiction — ordinary implementation child of TEST-EPIC-007. Fixture PNG-as-jpg is a data bug, not plan drift.

**Assumptions (no ask):** typed path via `process.cwd()`; auto-load then explicit Load click; no review-keyboard; replace fixture JPEG bytes in place; no app-code change.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

  Extended `e2e/smoke.spec.ts`: `@playwright/test`, role queries, one file per child, no helpers module. Typed-path fallback is the existing BI-046 control; no new picker API. Fixture JPEG replacement is data, not a new image pipeline.

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

  No app-code change. Fixture bytes replaced in place so `.jpg` names stay (unit tests use those filenames as strings). Deferred: browse-tree linking, owned-folder offer, keep/approve/discard/lightbox (TEST-007.4).

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

  `e2e/imagegen-link-load.spec.ts` — typed path → auto-load assertions → ↻ Load round r1 click → still one Hero banner.

**Implementation Notes:** Fixture files were PNG bytes named `.jpg` (`file` reported "PNG image data, 1 x 1"). Replaced with 160-byte 1×1 JPEGs so `/api/imagegen/file` can serve `image/jpeg` under `nosniff`. Spec uses `path.join(process.cwd(), 'test-fixtures', 'imagegen')`.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

  One new spec file, no helper duplication with smoke. No app public-surface growth. Docs already describe `e2e/*.spec.ts` from TEST-007.2.

- [x] (frontend) Asked the user for visual confirmation — N/A, no rendered app-UI change; `just e2e` is the browser check.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:** `npx tsc --noEmit` exit 0. `npx eslint e2e/imagegen-link-load.spec.ts` exit 0. `npm test` 32 files / 575 tests (e2e glob excluded). `just e2e` → 2 passed (3.7s): smoke 535ms, link-load 979ms.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  - `README.md` — no change (e2e install/run already documented by TEST-007.2)
  - `AGENTS.md` — no change
  - `CLAUDE.md` — no change (Testing bullet already names `e2e/*.spec.ts`)
  - `.flowtron/PLAN.md` — this child's stub flip (nested under TEST-EPIC-007)
  - `VISION.md` — no change
  - `docs/ADOPT.md` — no change
  - `docs/WORKFLOW.md` — no change
  - `docs/REVIEW-LOOP.md` — no change
  - `docs/GROK-AGENT.md` — no change

- [x] Closed — every `## ✅ Acceptance` criterion ticked. YAML `status:` flipped to `completed`. PLAN.md line to stub form, kept nested beneath TEST-EPIC-007. Tasknote moved to `.flowtron/tasknote/archive/test/TEST-007.3.md`. No superseded-claim pointer.

- [x] **Evidence-based recap** drafted — see below.

**Final Summary:** Real-browser coverage for 🔗 Link imagegen + ↻ Load round against the committed `test-fixtures/imagegen/` fixture. New `e2e/imagegen-link-load.spec.ts` types the absolute fixture path into the BI-046 picker, waits for BI-026 auto-load (Hero banner + prompt + two images), then clicks Load round r1 and asserts BI-043 idempotence (still one task). Fixture `.jpg` files replaced with real 1×1 JPEGs so the file route's `nosniff` JPEG MIME actually decodes. No app-code change. Verified: `tsc` / eslint on the spec / `npm test` 575 / `just e2e` 2 passed in 3.7s. Docs: no change (TEST-007.2 already named the e2e surface). Deferred: TEST-007.4 review keyboard.

**Archived:** 2026-09-09

