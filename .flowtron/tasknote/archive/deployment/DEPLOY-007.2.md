---
title: sharp-audit-gate
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: [DEPLOY-EPIC-007]
---

# DEPLOY-007.2 | sharp-audit-gate

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-EPIC-007]]

## 🎯 Goal

Bump `next` 16.3.3 → 16.3.4 (and the pending patch/minor group) so `npm audit --omit=dev --audit-level=high` exits 0, clearing the CI audit gate.

## ✅ Acceptance

- [x] `npm audit --omit=dev --audit-level=high` exits 0
- [x] Lint, typecheck, test, and build all still pass

## 🧩 Subtasks

- [x] Run `npm update` to pull the whole Dependabot `patch-and-minor` group (bumps `next` 16.3.3 → 16.3.4, which raises its `sharp` optional pin to `^0.35.4`, plus `eslint-config-next`, `happy-dom`, `tailwindcss`, `@tailwindcss/postcss`, `@testing-library/react`, `@types/node`, `@types/react`, `@types/react-dom`, `vitest` minor/patch bumps); leaves `react`/`react-dom` (exact-pinned) and `typescript`/`eslint` majors (Dependabot-ignored, DEPLOY-004/DEPLOY-003) untouched
- [x] Verify `npm audit --omit=dev --audit-level=high` exits 0
- [x] Run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`

## 🔗 Related

- [[DEPLOY-EPIC-007]] — parent epic: restore the CI audit gate before pushing the 27-commit backlog

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `npm audit --omit=dev --audit-level=high` currently fails exactly as described (sharp <0.35.4, GHSA-rgj7-g3m4-5g8c). The fix (bump `next` to pull its `sharp` optional pin to `^0.35.4`) is confirmed available and correctly scoped.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  `N/A` — pure dependency-version bump via `npm update`; no source module boundaries touched.

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

  No drift. `next` is `16.3.3` in `package.json`/`package-lock.json` as claimed; `next@16.3.4`'s `optionalDependencies.sharp` is confirmed `^0.35.4` via `npm view`. Currently installed `sharp` resolves to `0.35.3` (the vulnerable version), pinned only transitively through `next`'s own `optionalDependencies` — no repo-owned `overrides`/`optionalDependencies` block exists (DEPLOY-002 deleted the old `overrides` at the Next 16 upgrade).

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Assumption: "the pending patch/minor group" means the Dependabot `patch-and-minor` group in `.github/dependabot.yml` — i.e. everything `npm outdated` shows a `Wanted` bump for within its existing `package.json` semver range. Confirmed via `npm outdated`: `@tailwindcss/postcss`, `@testing-library/react`, `@types/node`, `@types/react`, `@types/react-dom`, `eslint` (patch only — major held per DEPLOY-003), `eslint-config-next`, `happy-dom`, `next`, `tailwindcss`, `vitest` all have a `Wanted` > `Current`. `react`/`react-dom` are exact-pinned (`19.1.0`, no caret) and don't move; `typescript` stays at `5.9.3` (major held per DEPLOY-004, both documented in `.github/dependabot.yml`'s `ignore` block). `npm update` respects `package.json` ranges, so it lands exactly this set without touching the held majors.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive skim** (`archive/deployment/`, 4 notes — DEPLOY-001 through DEPLOY-004):

- **DEPLOY-002** (`next-16-and-override-drop`) — landed the Next 15→16 bump and deleted the `postcss`/`sharp` `overrides` block, since "Next 16 pins both safely on its own" (confirmed: no `overrides` block exists today). This task is a same-shape minor/patch follow-up on the tree DEPLOY-002 left behind.
- **DEPLOY-003** (`eslint-10-upgrade`) — De-scoped; ESLint major held at 9 via `.github/dependabot.yml` `ignore` (blocking: `eslint-plugin-react` doesn't support ESLint 10 yet). Confirms `npm outdated`'s `eslint` row (9.39.4→9.39.5 Wanted, 10.10.0 Latest) is a patch move only, not the held major.
- **DEPLOY-004** (`typescript-7-upgrade`) — De-scoped; TypeScript major held at 5 via the same `ignore` block (blocking: `typescript-eslint` doesn't support TS 7 yet). Confirms `typescript` staying at `5.9.3` (Wanted == Current) is correct, not a miss.
- **DEPLOY-001** — gitleaks secret-scan job only; no bearing on this task.

No superseded claims, no drift against these notes — this task extends their pattern (patch/minor bumps within Dependabot's grouped ignore posture) rather than reopening any of their De-scope verdicts.

**Confirmed current state:**

| Package | Current | Wanted (npm outdated) | Notes |
|---|---|---|---|
| `next` | 16.3.3 | 16.3.4 | raises optional `sharp` pin `^0.35.3` → `^0.35.4`, clearing the audit gate |
| `eslint-config-next` | 16.3.3 | 16.3.4 | paired with `next` |
| `@tailwindcss/postcss` | 4.3.0 | 4.3.3 | |
| `tailwindcss` | 4.3.0 | 4.3.3 | |
| `@testing-library/react` | 16.3.2 | 16.3.3 | |
| `@types/node` | 20.19.42 | 20.19.43 | Latest 22.20.2 is a major bump, not in scope |
| `@types/react` | 19.2.17 | 19.3.0 | |
| `@types/react-dom` | 19.2.3 | 19.3.0 | |
| `happy-dom` | 20.10.2 | 20.14.0 | |
| `vitest` | 4.1.8 | 4.1.11 | Latest 5.0.0 is a major bump, not in scope |
| `eslint` | 9.39.4 | 9.39.5 | major held at 9 (DEPLOY-003) |
| `typescript` | 5.9.3 | 5.9.3 | major held at 5 (DEPLOY-004); no move |
| `react` / `react-dom` | 19.1.0 | 19.1.0 | exact-pinned, no caret; no move |

CI (`.github/workflows/ci.yml`) runs `npm ci` then `typecheck` → `lint` → `test` → `build` → `Audit` (`npm audit --omit=dev --audit-level=high`), so `package-lock.json` must be regenerated and committed alongside `package.json`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

  `npm update` is the established shape for the Dependabot `patch-and-minor` group per DEPLOY-002/003/004's precedent (land the group, hold majors via `.github/dependabot.yml` `ignore`). No new pattern needed.

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

  No refactor. `package.json` needs no edit — its existing caret ranges already cover the target versions; only `package-lock.json` moves.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

  `N/A` — pure dependency-version bump; no new behavior to test.

**Implementation Notes:**

`npm update` (2026-09-09): 14 added, 10 removed, 83 changed packages; `package.json` unchanged (all bumps already fit existing caret ranges); `package-lock.json` rewritten (+1076/−741). Confirmed versions: `next` 16.3.3 → 16.3.4, `sharp` (next's optional dep) 0.35.3 → 0.35.4. `react`/`react-dom` (exact `19.1.0`) and `typescript` (`5.9.3`, major held) untouched, as expected.

`npm install-scripts` flagged two packages (`unrs-resolver`, `fsevents`) with install scripts not yet allow-listed under npm's newer install-scripts gate — pre-existing npm behavior surfaced by the lockfile refresh, not introduced by this task; no action needed, neither script ran (both no-ops on this platform/lockfile state) and the build/test/audit gates below are unaffected.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

  `N/A` — only `package-lock.json` changed (generated file); no source, no duplication/complexity/documentation surface to assess.

- [x] (frontend) `N/A` — no frontend surface changed; the diff is a lockfile regeneration only. Nothing renders differently.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

| Gate | Result |
|---|---|
| `npm audit --omit=dev --audit-level=high` | **exit 0, found 0 vulnerabilities** — the sharp `<0.35.4` GHSA-rgj7-g3m4-5g8c advisory is gone |
| `npm run typecheck` | exit 0 (TypeScript 5.9.3, unchanged) |
| `npm run lint` | exit 0 (ESLint 9.39.5) |
| `npm test` | **31 files, 563 tests passed**, 4.56s |
| `npm run build` (`next build --turbopack`) | exit 0 |

`npm test` surfaced one new deprecation notice from `vitest@4.1.11` ("Your Vite config uses features that are unsupported by `configLoader: 'native'`... ESM syntax in a file loaded as CommonJS (`vitest.config.ts`)") — a forward-looking Vite warning, not a failure. Out of scope for this dependency-bump task (touching `vitest.config.ts` is unrelated source work); left for a future task if it becomes load-bearing.

`npm run build`'s two "Dynamic filesystem access" warnings on `lib/imagegenServerFs.ts` are pre-existing (BI-045/046/047 imagegen server-`fs` surface), unrelated to this bump, and do not affect the build's exit code.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  | Doc | Verdict |
  |---|---|
  | `README.md` | no change — no shipped feature surface moved |
  | `AGENTS.md` | no change — no workflow/tooling contract moved |
  | `CLAUDE.md` | no change — Stack section names no dependency version this task touched |
  | `.flowtron/PLAN.md` | **updated** — DEPLOY-007.2 stubbed to `Completed 2026-09-09.` |

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed per SPEC/tasknote-selection.md §"`## Completed` archive convention" (standalone → top of `## Completed`; epic child → kept nested beneath its active parent), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

**What happened, plainly.** `npm update` pulled the whole Dependabot `patch-and-minor` group into `package-lock.json`, including `next` 16.3.3 → 16.3.4 — which raises `next`'s own `optionalDependencies.sharp` pin from `^0.35.3` to `^0.35.4`, resolving the installed `sharp` from the vulnerable `0.35.3` to `0.35.4` and clearing the GHSA-rgj7-g3m4-5g8c advisory. `npm audit --omit=dev --audit-level=high` now exits 0 with 0 vulnerabilities found. The exposure was already assessed as ~nil (`next/image` unused repo-wide), so this closes a red required CI gate rather than a live risk.

**Changed** — 1 file, no source: `package-lock.json` (+1076/−741, generated). `package.json` needed no edit — every bump already fit its existing caret range.

**Verification.** `npm audit --omit=dev --audit-level=high` exit 0 (0 vulnerabilities) · `npm run typecheck` exit 0 · `npm run lint` exit 0 · `npm test` 31 files / 563 tests passed · `npm run build` exit 0. Full gate suite green.

**Refactors made or deferred.** None made — pure lockfile regeneration. Deferred: a new `vitest@4.1.11` deprecation notice about `configLoader: 'native'` and CommonJS-loaded ESM in `vitest.config.ts` — cosmetic, unrelated to this task's scope, not a regression it introduced.

**Documentation verdict.** No AI-referenced doc drifted except `.flowtron/PLAN.md` (this task's own stub flip).

**Maintainability effect.** Restores the CI `Audit` step to green, which is the prerequisite the parent epic (DEPLOY-EPIC-007) needs before DEPLOY-007.3 can push the 27-commit backlog through a verifying gate.

**Archived:** 2026-09-09
