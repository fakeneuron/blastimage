---
title: vitest-config-esm
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: [DEPLOY-007.2, DEPLOY-007.N]
---

# TEST-006 | vitest-config-esm

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-007.2]] [[DEPLOY-007.N]]

## 🎯 Goal

Rename `vitest.config.ts` → `vitest.config.mts` so Vite's native config loader recognizes it as ESM, clearing the `configLoader: 'native'` deprecation warning `npm test` emits on every run.

## ✅ Acceptance

- [x] `npm test` no longer emits the `configLoader: 'native'` / CommonJS-loaded-ESM warning
- [x] All existing tests still pass (31 files / 563 tests, matching pre-change baseline)
- [x] The one prose reference to `vitest.config.ts` (`lib/imagegenRouteGuard.test.ts:25`) is updated to the new filename

## 🧩 Subtasks

- [x] `git mv vitest.config.ts vitest.config.mts`
- [x] Update the prose mention in `lib/imagegenRouteGuard.test.ts:25`
- [x] Run `npm test` and confirm the warning is gone and all tests pass
- [x] Run `npm run typecheck` and `npm run lint`

## 🔗 Related

- [[DEPLOY-007.2]] — first surfaced the warning (vitest bumped to 4.1.11), deferred as out of scope
- [[DEPLOY-007.N]] — re-confirmed the warning still present, cited this exact fix (rename to `.mts` or set `"type": "module"`) as a follow-up candidate, deliberately not filed there per its filing-discipline gate

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Ran `npm test` and confirmed the warning still fires verbatim: "ESM syntax in a file loaded as CommonJS (vitest.config.ts:1:1). Use a `.mjs` extension or set `"type": "module"` in the closest package.json." `package.json` has no `type` field (defaults to CommonJS) and `vitest.config.ts` uses `import`/`export default`. The task's fix (rename to `.mts`) is the minimal, standard remedy — renaming rather than adding `"type": "module"` avoids any risk of flipping module resolution for the rest of the CommonJS-authored repo.

- [x] Read relevant source files — `vitest.config.ts` (28 L, ESM import/export, no CommonJS interop needed), `package.json` (no `type` field), `lib/imagegenRouteGuard.test.ts` (confirmed its one `vitest.config.ts` mention is prose in a comment, not an import or path reference).

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  `N/A` — pure filename rename of a config file; no module boundary or abstraction touched. `.mts` is Vite/Node's standard extension for an explicitly-ESM TypeScript file and requires no content changes.

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task

  Grepped `archive/*/*.md` for `vitest.config`/`configLoader`: hits are `TEST-001.2` (unrelated — the `include` glob widening), `DEPLOY-007.2`, and `DEPLOY-007.N`. Read both directly (only 2 relevant, well under the probe threshold). Findings logged below.

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

  No drift. `npm test` reproduces the exact warning text cited. `lib/imagegenRouteGuard.test.ts:25` is confirmed (via `grep -n`) to be the one and only prose mention — no import or config-path reference anywhere else (`tsconfig.json`, `.gitignore`, `eslint.config.*`, `.github/workflows/*.yml`, `package.json` all clean).

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Assumption: rename to `.mts` (not adding `"type": "module"` to `package.json`) per the task's own stated remedy — the narrower fix, since the rest of the repo's `.ts` files stay CommonJS-loaded by Next/tsc and are unaffected either way.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Archive skim** (2 relevant hits):

- **DEPLOY-007.2** (`sharp-audit-gate`) — bumped `vitest` 4.1.8 → 4.1.11 as part of a Dependabot patch/minor sweep; that bump is what first surfaced this warning. Correctly deferred it as out of scope for a pure dependency-bump task.
- **DEPLOY-007.N** (`ci-gate-recovery` audit) — re-ran the suite, found the warning still present, and logged it as "Finding 2 — follow-up candidate" with the exact remedy this task now implements (`[light]🔧`, low priority). This task is that filed follow-up (`.flowtron/PLAN.md` cites both explicitly).

No contradiction with either note; this task simply executes the deferred fix both already diagnosed correctly.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

  `.mts` is Vite/Node's standard extension for an explicitly-ESM TypeScript config file — no new pattern, the conventional fix for this exact warning class.

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

  No refactor. `git mv` preserves file content and history; only the extension and the one prose reference to it change.

- [x] Implemented the minimal solution

  `git mv vitest.config.ts vitest.config.mts`; updated the prose reference at `lib/imagegenRouteGuard.test.ts:25` to match.

- [x] Updated/added tests for non-trivial behavior

  `N/A` — no behavior changed; this is a config-file extension rename.

**Implementation Notes:**

`git mv vitest.config.ts vitest.config.mts` (content unchanged, git tracks as a rename). Updated the one prose mention of the old filename in `lib/imagegenRouteGuard.test.ts:25`.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

  `N/A` — a file rename plus one comment-text update; no new code surface to assess.

- [x] (frontend) `N/A` — no frontend surface changed; config-file rename only, nothing renders differently.

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
| `npm test` | **31 files, 563 tests passed**, 4.80s — `configLoader: 'native'` warning no longer emitted (confirmed present before the rename, absent after) |
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  | Doc | Verdict |
  |---|---|
  | `README.md` | no change — grepped, no mention of `vitest.config` or `configLoader` |
  | `AGENTS.md` | no change — grepped, no mention of `vitest.config` or `configLoader` |
  | `CLAUDE.md` | no change — grepped, no mention of `vitest.config` or `configLoader`; the Testing section's `npm test` reference is filename-agnostic |
  | `.flowtron/PLAN.md` | **updated** — `TEST-006` stubbed to `Completed 2026-09-09.` |

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form, tasknote moved to `.flowtron/tasknote/archive/test/`

- [x] **Evidence-based recap** drafted — surfaces at the 📦 ready-to-commit gate

**Final Summary:**

**What happened, plainly.** `vitest.config.ts` used ESM `import`/`export default` syntax but had no `"type": "module"` in `package.json`, so Vite's `configLoader: 'native'` (a planned future default) loaded it as CommonJS and warned on every `npm test` run. Renaming the file to `vitest.config.mts` tells Node/Vite unambiguously it's ESM, which clears the warning with zero content changes. Deferred by [[DEPLOY-007.2]], re-confirmed and cited as a follow-up candidate by [[DEPLOY-007.N]] — this task executes that already-diagnosed fix.

**Changed** — 2 files: `vitest.config.ts` → `vitest.config.mts` (renamed, content unchanged) and `lib/imagegenRouteGuard.test.ts` (1 line, comment-text update to match the new filename).

**Verification.** `npm test`: warning confirmed present before the rename, confirmed absent after — 31 files / 563 tests passed both times (no regression). `npm run typecheck` exit 0. `npm run lint` exit 0.

**Refactors made or deferred.** None — pure rename plus one comment-text update; nothing else referenced the old filename by path.

**Documentation verdict.** No AI-referenced doc drifted except `.flowtron/PLAN.md` (this task's own stub flip).

**Maintainability effect.** Removes a warning from every local and CI test run, and pre-empts it becoming a hard failure once Vite flips `configLoader: 'native'` to the default in a future major version.

**Archived:** 2026-09-09
