---
title: test-reach audit
status: completed
tags: [audit, test]
created: 2026-10-18
due:
related-tasks: [TEST-EPIC-012, TEST-012.2, TEST-012.3]
touches:
  - AGENTS.md
---

# TEST-012.N | test-reach audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-012]]

## 🎯 Goal

Verify the completed `TEST-EPIC-012` (`test-reach`) cohort sits coherently in the codebase: cumulative doc-drift sweep across `.flaitron/tasknote/README.md` §"AI-referenced docs", naming/style consistency across the cohort's deliverables, and a child row filed for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces
- [x] Audit findings recorded in Implementation Notes; each miss filed as an open child row of `TEST-EPIC-012` (Step 5), landing in the audit's closure commit — no misses, so no rows filed
- [x] Single `feat: TEST-012.N — audit TEST-EPIC-012` (or `chore: ...` if no code edits land) commit lands — `chore:` (doc-only edit)
- [x] PLAN.md line for `TEST-012.N` flipped to stub form `Completed YYYY-MM-DD.`
- [x] Tasknote moved to `.flaitron/tasknote/archive/test/TEST-012.N.md`

## 🧩 Subtasks

- [x] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [x] Walk `.flaitron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [x] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [x] Surface audit findings in Implementation Notes; file each miss as an open child row (Step 5)
- [x] Phase 4: flip `TEST-012.N` PLAN line to stub form + archive tasknote

## 🔗 Related

- [[TEST-EPIC-012]] — parent epic (test-reach)
- [[TEST-012.2]] — webkit-e2e (cohort)
- [[TEST-012.3]] — route-handler-tests (cohort)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Operator invoked `/ft-close-epic TEST-012.N`; pre-flight passed. Cohort at audit time: `.2` webkit-e2e and `.3` route-handler-tests, both closed 2026-10-18. No `.1` child (Discovery was supplied by audit-repo 2026-10-18). No open siblings, so no early-audit decision.

- [x] Read relevant source files — both archived cohort tasknotes; `playwright.config.ts`, `.github/workflows/ci.yml` e2e install step, AGENTS.md Testing line, README install line, the headers of the two new handler suites and their siblings (`imagegenFileRoute.test.ts`, `imagegenSelectionRoute.test.ts`).

- [x] **Best Practices Review** — N/A: verification pass; the one edit is a doc sentence.

- [x] **Archive skim** — self-referential (the cohort children are the archive entries). Prior history on the surfaces is cited by the children themselves (TEST-007.2, TEST-004.3, BI-045, BI-048) and was not re-read.

- [x] **Drift check** — `playwright.config.ts` declares `chromium` + `webkit`; CI installs `chromium webkit`; README, AGENTS.md and the tasknote README quick-commands all say `chromium webkit`; both new suites exist; BI-068 (filed by `.2`) is still open in `## Medium`. Remaining "Chromium-only" mentions (`docs/REVIEW-LOOP.md:164`, `lib/ImagegenContext.tsx`, `lib/imagegenServerFs.ts`, `lib/storage.ts`) are FSA history, correctly left alone.

- [x] No clarifications needed. Assumption: `.2`'s "green in CI" criterion, left not-met pending push, is not an audit miss — it resolves on the operator's next push and needs no row.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:**

- **TEST-012.2 webkit-e2e** — `webkit` project (`devices["Desktop Safari"]`) in `playwright.config.ts`; CI installs both browsers; three focus-restore specs now open dialogs from the keyboard; Safari mouse-open restore gap filed as BI-068; AGENTS.md / README / tasknote README install lines updated.
- **TEST-012.3 route-handler-tests** — `lib/imagegenApprovedRoute.test.ts` + `lib/imagegenDiscoveryRoutes.test.ts` (67 tests), all route files at 100% lines; no source changed; docs judged "no change".

✅ Phase 1 Discovery complete; entering Phase 2 Execution.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — N/A: no new code surface. The AGENTS.md edit extends the existing sentence rather than adding a new one.

- [x] **Minimal refactor gate** — no refactor. The duplicated `SAME_ORIGIN` / request-literal helper across four handler suites was already weighed and declined by TEST-012.3 (review note 4); not reopened.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A: doc-only edit.

**Implementation Notes:**

- **Coherence:** the two children touch disjoint surfaces (Playwright vs vitest handler suites), so no naming or style conflicts were possible between them. Within `.3`, the new suites match their siblings: `@/app/...` route imports (same as `imagegenSelectionRoute.test.ts`), the same header convention (why it lives in `lib/`, request-shaped literals, `realpath`'d roots), and the same temp-root fixtures. No contradictory cross-refs.
- **Inline fix (cumulative doc drift):** `AGENTS.md:33` said "the suite covering the route handlers lives in `lib/` and discovers its subjects from the filesystem" — singular, naming only the guard suite. `.3` closed it as "no change, not enumerating", but after `.3` there are four handler suites in `lib/` that import their route directly, and the sentence reads as if the guard suite is the only one. Reworded so the guard suite (filesystem discovery, TEST-004.3) and the handler suites (direct import, `lib/imagegenApprovedRoute.test.ts` and siblings, TEST-012.3) are both named, and the "moving it beside the routes" warning covers both.
- **Regressions:** none. Unit, lint, tsc, and e2e under both engines are green at HEAD (Testing Notes).
- **Open item, not a miss:** `.2`'s "green in CI" is still unverified. `origin/main` is 4 commits behind HEAD, and both cohort commits are among them. The last CI run (DEPLOY-013) predates the cohort. It resolves on the next push.
- **Misses filed:** none.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — regression run over the cohort surfaces (below)

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — N/A: the only edit is one AGENTS.md sentence; no code diff to grade.

- [x] (frontend) N/A — no rendered surface changed

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- `npm test` → 0 (754 passed)
- `npm run lint` → 0
- `npx tsc --noEmit` → 0
- `npm run test:e2e` → 0 (20 passed — 10 chromium, 10 webkit, 16.6s)
- `git rev-list --left-right --count origin/main...HEAD` → `0 4` (cohort not yet pushed; CI unobserved)

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: no change (install line already `chromium webkit`). `AGENTS.md`: Testing line updated to name both the guard suite and the handler suites (above). `CLAUDE.md`: no change. `.flaitron/PLAN.md`: audit row stubbed, epic flipped and moved with its cohort to `## Completed`. `VISION.md`: no change. `docs/ADOPT.md`: no change. `docs/WORKFLOW.md`: no change. `docs/REVIEW-LOOP.md`: no change (its "Chromium-only" is FSA history). `docs/GROK-AGENT.md`: no change.

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — N/A: the AGENTS.md fix is itself the always-loaded-layer update.

**Final Summary:** The test-reach cohort fits together: WebKit e2e and the route-handler suites touch separate surfaces, follow their siblings' conventions, and stay green at HEAD (754 unit, 20/20 e2e across chromium and webkit). One cumulative doc drift was fixed inline: AGENTS.md's Testing line named only the guard suite as "the" route suite in `lib/`, and now names the handler suites as well. No misses filed, so the epic flips. Still open from `.2`: green-in-CI is unobserved until the operator pushes. `touches:` reconciliation: AGENTS.md as declared, plus the workflow files (PLAN, this note).

**Archived:** 2026-10-18
