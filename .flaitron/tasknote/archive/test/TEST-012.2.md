---
title: webkit-e2e
status: completed
tags: [e2e, ci, webkit]
created: 2026-10-18
due:
related-tasks: [TEST-EPIC-012, TEST-007.2, BI-045, TEST-010, TEST-011]
touches:
  - playwright.config.ts
  - .github/workflows/ci.yml
  - AGENTS.md
  - README.md
  - e2e/review-keyboard.spec.ts
  - e2e/iterate-feedback-modal.spec.ts
---

# TEST-012.2 | webkit-e2e

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[TEST-EPIC-012]]

## 🎯 Goal

Run all four `e2e/*.spec.ts` under a `webkit` Playwright project beside chromium, locally and in the CI `e2e` job, so the operator's daily-driver engine (Safari) is covered.

## ✅ Acceptance

- [x] `playwright.config.ts` declares a `webkit` project beside `chromium` — `grep -q 'name: "webkit"' playwright.config.ts`
- [x] All four specs green under WebKit locally (a WebKit-only failure fixed, or `test.skip`-ped with a filed follow-up) — `npx playwright test --project=webkit`
- [x] Chromium still green — `npx playwright test --project=chromium`
- [x] CI `e2e` job installs webkit — `grep -q 'playwright install --with-deps chromium webkit' .github/workflows/ci.yml`
- [ ] Green in CI — not met yet (pending push): a push needs an explicit operator ask, so CI hasn't run this diff
- [x] Docs no longer claim chromium-only — `git grep -n "chromium-only" AGENTS.md` prints nothing

## 🧩 Subtasks

- [x] Add `webkit` project (`devices["Desktop Safari"]`) to `playwright.config.ts`
- [x] `npx playwright install webkit` locally; run the suite under webkit, triage any failure
- [x] CI `e2e` job: install webkit alongside chromium
- [x] Update AGENTS.md Testing line + README.md install line
- [x] Run chromium + webkit, lint, typecheck

## 🔗 Related

- [[TEST-EPIC-012]] — parent epic (test-reach)
- [[TEST-007.2]] — predecessor: built the harness chromium-only, deferred webkit
- [[BI-045]] — replaced FSA with the localhost imagegen API specifically so WebKit could link a folder
- [[TEST-010]] / [[TEST-011]] — Playwright spine settings (workers, reporter, report artifact)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Config has only `chromium` (`playwright.config.ts` `projects`); CI installs only chromium; AGENTS.md still says "chromium-only". BI-045 made Safari a target browser, so the gap is real.

- [x] Read relevant source files — `playwright.config.ts`, `.github/workflows/ci.yml` `e2e` job, `e2e/` (4 specs + `helpers.ts`), `package.json` (`@playwright/test` 1.63.0), `justfile` `e2e` recipe

- [x] **Best Practices Review** — config-only change; adding a project is Playwright's native multi-browser shape, no new abstraction.

- [x] **Archive skim** — `archive/test/` (confirmed against README table: `TEST-*` → `archive/test/`). TEST-007.2: chromium-only was a deliberate "later call", deferred firefox/webkit. BI-045: WebKit has no FSA, which is why the server-side imagegen API exists — so WebKit e2e exercises exactly that path. TEST-010: local workers capped at 2 (thermal), CI serial; TEST-011: report artifact on failure — both unaffected by a second project.

- [x] **Drift check** — PLAN line says "all four `e2e/*.spec.ts`": confirmed four specs (smoke, imagegen-link-load, iterate-feedback-modal, review-keyboard). No drift.

- [x] No clarifications needed (--fast). Assumptions: `devices["Desktop Safari"]`; both projects run by default under `npm run test:e2e` (no chromium-only default); CI keeps one job and installs both browsers in one step rather than a matrix; "green in CI" can only be observed after the operator pushes.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:**

- `docs/REVIEW-LOOP.md:164` "Chromium-only" refers to FSA history (BI-045), not the e2e harness — leave it.
- CI wall-clock roughly doubles for the e2e job (serial, two browsers); `timeout-minutes: 20` should still hold.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the existing `projects` array with Playwright's stock `devices["Desktop Safari"]`; CI keeps its single `e2e` job (one install step, no matrix).

- [x] **Minimal refactor gate** — no refactor; the app-side focus fix was deferred to BI-068 rather than widened into this task.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — no new tests; three existing assertions gated on WebKit (below).

**Implementation Notes:**

- First WebKit run: 5/10 failed; a second run at 2 workers failed 9/10, mostly `page.goto` timeouts and browser `SIGTERM`s during cold turbopack compile (environmental, not WebKit). Serial run isolated **3 deterministic failures**, all `await expect(opener).toBeFocused()` after Escape: `review-keyboard.spec.ts` lightbox trap, `iterate-feedback-modal.spec.ts` iterate + feedback traps.
- Root cause: WebKit does not focus a `<button>` on mouse click (Safari platform behavior), so `useFocusTrap` (`lib/useFocusTrap.ts:66`) captures `<body>` as the opener and has nothing to restore. Keyboard-opened dialogs are unaffected. The Tab-trap assertions in the same tests all pass in WebKit.
- Disposition: an app fix touches the shared opener contract of all six `useFocusTrap` dialogs, so it is out of scope here. Filed as **BI-068** (`/ft-file-task --park --med`, commit `d9c047e`). The first pass gated the opener assertion on `browserName !== 'webkit'`. After the external review it was **replaced**: the three tests now open their dialog from the keyboard (`opener.focus()` + Enter), the path focus restore exists for. Restore is asserted in both engines, with no browser conditional and no `test.skip`. Mouse-open restore in Safari stays a real app gap, tracked in BI-068 (its stub and PLAN line now say to add a mouse-open e2e with the fix).
- `playwright.config.ts`: `webkit` project beside `chromium`. `ci.yml`: `npx playwright install --with-deps chromium webkit`, and the job comment now says "browser install". AGENTS.md Testing line and README install line updated. `docs/REVIEW-LOOP.md:164` "Chromium-only" is FSA history, so it was left alone.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) N/A — no rendered surface changed; Asked the user for visual confirmation (`👁️ **CONFIRM**` on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- `grep -q 'name: "webkit"' playwright.config.ts` → 0
- `npx playwright test --project=webkit` → 0 (10 passed, 29.5s; also 10 passed at default 2 workers, 28.3s)
- `npx playwright test --project=chromium` → 0 (10 passed)
- `npm run test:e2e` (both projects) → 0 (20 passed, 56.9s; re-run after the keyboard-open change → 0, 20 passed, 25.5s, with lint/typecheck → 0)
- `grep -q 'playwright install --with-deps chromium webkit' .github/workflows/ci.yml` → 0
- `git grep -n "chromium-only" AGENTS.md` → 1 (no match, as intended)
- `npm run lint` → 0 · `npm run typecheck` → 0 · `npm test` → 0 (687 passed)
- Green in CI: not observable until the operator pushes (push needs an explicit ask).
- Prettier is not a repo tool (no config, not in `package.json`); `prettier --check` flags the same 6 files before and after the diff, so it was ignored.
- 👁️ visual confirm: N/A. No rendered surface changed (config, CI, specs, docs).

**External review** (`/code-review medium`, working-tree diff). No blockers; every Acceptance criterion holds.

1. *Linux WebKit may focus on click, so the gate drops coverage in CI.* **note → fixed**: the gate is gone and keyboard-open asserts restore everywhere.
2. *A silent gate gives no signal when BI-068 lands.* **note → fixed** (no gate left); BI-068 now carries "add a mouse-open restore e2e".
3. *Open from the keyboard instead.* **note → fixed** (adopted).
4. *Altitude: the defect is in `useFocusTrap`.* **note → filed** as BI-068.
5. *The gate is copy-pasted three times.* **note → fixed** (gates removed).
6. *Doubled CI e2e time vs the 20-min timeout.* **note → no change**: locally each project takes ~30s, so even 3× serial plus retries plus the apt install sits well under 20 min. CI will confirm on push.
7. *`localhost` vs `127.0.0.1` for WebKit.* **note → no change**: the same `baseURL` already works for chromium in CI and for webkit locally. Switching hosts risks the imagegen guard's `Host` check; a CI webkit failure would surface it.
8. *`touches:` missing the two spec files.* **note → fixed** (declared).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — README.md: install line → `chromium webkit`. AGENTS.md: Testing line → "chromium + webkit projects" + install command. CLAUDE.md: no change. PLAN.md: row flipped, BI-068 filed. VISION.md: no change. docs/ADOPT.md: no change. docs/WORKFLOW.md: no change. docs/REVIEW-LOOP.md: no change (its "Chromium-only" is FSA history). docs/GROK-AGENT.md: no change. Also `.flaitron/tasknote/README.md` quick-commands install line → `chromium webkit`.

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — the WebKit click-focus quirk now lives in the spec comments and in BI-068; the AGENTS.md Testing line names both projects. Nothing further for the always-loaded layer.

**Final Summary:** Playwright now runs a `webkit` project (`devices["Desktop Safari"]`) beside chromium, and the CI `e2e` job installs both browsers. All four specs pass under both engines (20/20 locally). WebKit surfaced one real difference: Safari doesn't focus a button on mouse click, so `useFocusTrap` has no opener to restore after a mouse-opened dialog. The three restore tests now open their dialog from the keyboard, the path restore exists for, and still assert restore in both engines. The app-side mouse-open gap is filed as BI-068. `touches:` reconciliation: the diff matches the declared set (six paths) plus the workflow files (PLAN, tasknote README, this note). Green-in-CI is **not yet verified**: it needs a push, which needs an explicit operator ask.

**Archived:** 2026-10-18
