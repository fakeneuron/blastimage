---
title: quality-stack-gaps
status: completed
tags: []
created: 2026-09-24
due:
related-tasks: []
touches:
  - eslint.config.mjs
  - package.json
  - package-lock.json
  - tsconfig.json
  - vitest.config.mts
  - justfile
  - .github/workflows/ci.yml
  - .gitignore
  - lib/roundBatch.ts
  - lib/roundSelection.ts
  - lib/terminalRound.ts
  - lib/terminalRound.test.ts
  - lib/workspace.ts
  - lib/useWorkspace.ts
  - lib/useWorkspace.test.ts
  - lib/persistence.ts
  - lib/ImagegenContext.tsx
  - lib/useFocusTrap.test.tsx
  - lib/generate.test.ts
  - lib/imagegenClient.test.ts
  - lib/imagegenServerFs.test.ts
  - playwright.config.ts
  - components/Workspace.tsx
  - components/Workspace.test.tsx
  - components/GalleryPanel.tsx
  - components/GalleryPanel.test.tsx
  - components/ReviewGrid.tsx
  - components/ReviewGrid.test.tsx
  - components/FeedbackModal.test.tsx
  - components/IterateModal.test.tsx
  - components/ImportBuilder.test.tsx
  - CLAUDE.md
  - .flowtron/tasknote/README.md
---

# CORE-5 | quality-stack-gaps

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[RELATED]]

## 🎯 Goal

Adopt the fleet quality-stack gaps natabula routed here: type-checked ESLint, `eslint --max-warnings 0`, `exactOptionalPropertyTypes`, a `just coverage` recipe, and a changed-line `diff-cover` gate.

## ✅ Acceptance

- [x] `eslint.config.mjs` enables a type-checked typescript-eslint preset on a non-comment line — `grep -Eq '(recommended|strict)TypeChecked' eslint.config.mjs`
- [x] `package.json` `lint` script passes `--max-warnings 0` — `node -e "const s=require('./package.json').scripts.lint; if(!/eslint/.test(s)||!/--max-warnings[ =]0([^0-9]|$)/.test(s)) process.exit(1)"`
- [x] `tsconfig.json` sets `exactOptionalPropertyTypes` and `tsc --noEmit` exits 0 — `grep -Eq '"exactOptionalPropertyTypes"[[:space:]]*:[[:space:]]*true' tsconfig.json` and `npx tsc --noEmit`
- [x] `justfile` has a `coverage` recipe and `ci.yml` runs `diff-cover` — `grep -Eq '^coverage( |:)' justfile` and `grep -q diff-cover .github/workflows/ci.yml`
- [x] Vitest coverage reports included source, not only imported files — `grep -q 'include:' vitest.config.mts`
- [x] Lint, typecheck, and unit tests pass — `just lint`, `just typecheck`, `just test`
- [x] `just coverage` against the worktree diff meets the 80% changed-line gate — `just coverage HEAD`

## 🧩 Subtasks

- [x] Layer `recommendedTypeCheckedOnly` onto the existing ESLint 9 / `eslint-config-next` flat config and add `--max-warnings 0` to `lint`
- [x] Set `exactOptionalPropertyTypes` and omit optional keys whose value is `undefined` at the nine reported sites
- [x] Add `@vitest/coverage-v8`, `coverage.include` for `app` / `components` / `lib`, and ignore `coverage/`
- [x] Add the fleet `just coverage` recipe and the CI `diff-cover` step (pin `10.5.1`, fail-under 80, `fetch-depth: 0`)
- [x] Update the CLAUDE.md type-safety line and the tasknote quick-command list

## 🔗 Related

- [[DEPLOY-005]] — related-decision: ESLint 10 stays blocked on `eslint-plugin-react`; this task stays on ESLint 9 and layers type-checked rules onto `eslint-config-next`

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The five named gaps are all absent and all still the fleet contract. The only local constraint is ESLint 9 (DEPLOY-005), which does not remove the type-checked preset — `eslint-config-next` already spreads `typescript-eslint` recommended, so the type-checked-only ruleset layers on without a second plugin registration and without the ESLint 10 skeleton.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

PLAN.md line is under Low, `[medium]`, `[unattended]`, shortname `quality-stack-gaps`. Description is 34 words. `## Completed` holds 75 checked rows (>60); rotation is an operator motion, not this task.

Measured gaps against `natabula/docs/STACK-TENDENCIES.md` §Frontend / §Command interface / §Continuous integration and the deposit files (`templates/nextjs/eslint.config.mjs`, `templates/nextjs/tsconfig.json`, `templates/nextjs/vitest.config.ts`, `templates/justfile` `coverage`, `configs/.github/workflows/ci.yml`):

- `package.json` `"lint": "eslint"` — no `--max-warnings 0`. Current `eslint .` is clean (no problems), so the flag is a guard, as the deposit describes.
- `eslint.config.mjs` spreads `eslint-config-next/core-web-vitals` and `/typescript` (syntax `recommended`, with `no-unused-vars` at warn) plus jsx-a11y recommended rules. No type-checked preset. `node_modules/eslint-config-next/dist/typescript.js` confirms it concatenates `typescript-eslint` `recommended` only.
- `tsconfig.json` has `strict` and `noUncheckedIndexedAccess` (BI-036) and not `exactOptionalPropertyTypes`. `tsc --noEmit --exactOptionalPropertyTypes` reports 9 errors in `lib/roundBatch.ts`, `lib/terminalRound.ts` (3), `lib/workspace.ts`, `lib/useFocusTrap.test.tsx` (2), `lib/useWorkspace.test.ts`, `playwright.config.ts`. All are an optional property assigned `T | undefined`, plus one `delete` on a required global.
- `justfile` has no `coverage` recipe. `.github/workflows/ci.yml` has lint, typecheck, test, build, audit, gitleaks, and e2e — no `diff-cover`, and checkout is shallow.
- `vitest.config.mts` has no `coverage` block. `@vitest/coverage-v8` is not a direct dependency (vitest 4.1.11). `.gitignore` lists `coverage.xml` and not `coverage/`; the natabula ignore deposit lists both.
- Tests are colocated under `lib/` and `components/`, unlike the skeleton's `tests/unit/`. `coverage.include` must name `app`, `components`, and `lib` and exclude `**/*.test.{ts,tsx}` so a new untested module is 0% rather than absent, without treating test files as the gated source.

**Best practices:** extend the existing flat config, justfile, and CI job. Do not replace them with the ESLint 10 skeleton or the layout-detect CI template — blastimage's CI has repo-specific audit, gitleaks, and Playwright jobs (DEPLOY-001, BI-034, TEST-007.2) that the deposit does not. `recommendedTypeCheckedOnly` is the type-checked ruleset meant to sit on an existing `recommended` config, which is what `eslint-config-next/typescript` already applies; the full `recommendedTypeChecked` array would register `@typescript-eslint` a second time. ESLint stays on 9 because DEPLOY-005 records `eslint-plugin-react` crashing on ESLint 10. Optional-property fixes omit the key when the value is `undefined` rather than widening `prop?: T` to include `undefined`, which would erase the flag.

**Archive skim** (`archive/core/`, prefix confirmed in the README table): CORE-003 owns the `.next-verify/**` eslint ignore and the note that flat config does not auto-ignore dot-directories — those ignores stay. CORE-001.1 scopes cross-cutting config to this repo and keeps `.flowtron/core` out. No ⚠️ superseded-claim pointer on those notes changes this work.

**Drift check:** the PLAN line's five items are still missing. No SPEC contract covers the quality stack. No drift.

No clarifications needed (--fast). Assumptions: stay on ESLint 9; omit undefined optional keys; keep the existing CI jobs and add the coverage gate to the `ci` job; pin `diff-cover@10.5.1` and fail-under 80 to match the deposit; `coverage.include` is `app` / `components` / `lib` excluding colocated tests; `typescript-eslint@8.70.0` (already hoisted) and `@vitest/coverage-v8@4.1.11` become direct devDependencies.

Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Extended the existing flat config, justfile, and `ci` job. `recommendedTypeCheckedOnly` sits on `eslint-config-next`'s `recommended` so `@typescript-eslint` is not registered twice. ESLint stays on 9 (DEPLOY-005). `require-await` is off for `**/*.test.{ts,tsx}` and disabled on `localStorageAdapter` and `NOOP_IMAGEGEN`, whose `async` methods return Promises and do not await. Optional properties are omitted when the value is `undefined` (`ref`, `keeperPath`, `width`/`height`, Playwright `workers`). `JSON.parse` arrays go through an `unknown[]` predicate so `Array.isArray` does not produce `any`. Promise-returning click handlers are wrapped in `void` at the JSX attribute. No unrelated refactor. `generate.ts` was not edited: `var` cannot be optional, so the test assigns `undefined` instead of `delete`.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

`--unattended` full set, plus the Acceptance commands. `just coverage` re-runs the suite with the lcov reporters.

- `grep -Eq '(recommended|strict)TypeChecked' eslint.config.mjs` → 0
- `node -e` lint-script `--max-warnings 0` check → 0
- `grep -Eq '"exactOptionalPropertyTypes"[[:space:]]*:[[:space:]]*true' tsconfig.json` → 0
- `just typecheck` (`tsc --noEmit`) → 0
- `grep -Eq '^coverage( |:)' justfile` → 0
- `grep -q diff-cover .github/workflows/ci.yml` → 0
- `grep -q 'include:' vitest.config.mts` → 0
- `just lint` → 0
- `just test` → 0 (32 files, 611 tests)
- `just coverage HEAD` → 0 (40 changed lines, 1 missing, 97%)

Structural check: the `isUnknownArray` helper is duplicated in the two parsers on purpose — they do not share a module. `require-await` disables are local to the two Promise seams and to tests. CLAUDE.md states the new compiler flag. No dead code left by the assertion cleanup; query helpers that still need an element type use the testing-library generic instead of `as`.

External review (separate context, uncommitted diff): no blockers. Note — push to `main` skips the gate when `github.event.before` is the zero SHA or missing from the clone. Disposition: accepted; that is the deposit's "no honest base" notice, not a silent pass. Note — `toEqual` treats a missing key and `undefined` as equal. Disposition: fixed in `lib/terminalRound.test.ts` with `not.toHaveProperty` for a missing `ref` and a missing `keeperPath`.

Frontend visual confirmation: N/A. No layout, copy, or new control. The click handlers still call the same functions; component tests click Generate, Folder, Sheet, and the gallery download button.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

Type-checked ESLint (on ESLint 9), `--max-warnings 0`, `exactOptionalPropertyTypes`, `just coverage`, and a changed-line `diff-cover` gate are in place. Optional properties are omitted instead of assigned `undefined`. The changed-line gate on this diff is 97%.

Doc-drift: `CLAUDE.md` type-safety line updated. `README.md`, `AGENTS.md`, `VISION.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md` — no change. `.flowtron/tasknote/README.md` quick commands gained `just coverage` (that file is the index, not an entry in the list). `PLAN.md` flipped to the stub in this closure.

`touches:` matches `git diff --name-only` plus this tasknote. No undeclared paths. `lib/generate.ts` was surveyed and not edited.

Learnings: carried on the `CLAUDE.md` type-safety line (omit absent optional properties). Nothing further for `AGENTS.md`.

**Archived:** 2026-09-24
