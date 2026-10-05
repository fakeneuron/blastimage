---
title: next-16-and-override-drop
status: completed
tags: []
created: 2026-08-30
due:
related-tasks: [BI-034.3, BI-034.4, CORE-003, DEPLOY-001, BI-050]
# Optional planning keys — omit when absent (SPEC.md §Tasknote frontmatter).
# Omitted means undeclared, not "touches nothing" / "safe with everyone".
# touches:
#   - path/or/glob
# blocked-by:
#   - TASK-ID
# parallel-safe-with:
#   - TASK-ID
# supersedes:
#   - TASK-ID
---

# DEPLOY-002 | next-16-and-override-drop

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[BI-034.3]] · 🔗 [[BI-034.4]] · 🔗 [[CORE-003]] · 🔗 [[DEPLOY-001]]

## 🎯 Goal

Take the Next 15→16 upgrade and, with it, drop the `postcss`/`sharp` `overrides` block that `.github/workflows/ci.yml`'s audit-step comment marks as droppable at Next 16 — moving that cleanup instruction out of a CI comment and into the actual dependency tree.

## ✅ Acceptance

- [x] `package.json` resolves `next` and `eslint-config-next` at `^16.3.3`, and the `postcss`/`sharp` `overrides` block is deleted
- [x] `npm audit --omit=dev --audit-level=high` exits `0` **without** the overrides — i.e. CI's existing gate passes on the upstream tree, not on a local pin
- [x] `.github/workflows/ci.yml`'s Audit-step comment no longer carries a cleanup instruction for a future reader; it describes the post-Next-16 state
- [x] Full gate suite green at Next 16: `npm run typecheck`, `npm run lint`, `npm test`, `npm run build:verify`
- [x] Dependabot PR #6 (`bump next 15.5.23 → 16.3.0`) closed as superseded by this commit
- [x] ESLint 9→10 and TypeScript 5→7 assessed, the finding recorded here, and follow-up entries filed in `PLAN.md`

## 🧩 Subtasks

- [x] Bump `next` + `eslint-config-next` to `^16.3.3` and delete the `overrides` block from `package.json`; regenerate `package-lock.json`
- [x] Rewrite the `ci.yml` Audit-step comment so it documents the current state rather than a pending cleanup
- [x] Run the full gate suite plus the audit gate at Next 16
- [x] File ESLint 9→10 and TypeScript 5→7 follow-up entries under `## Future Opportunities` in `PLAN.md`
- [x] Close Dependabot PR #6 with a note pointing at the superseding commit

## 🔗 Related

- [[BI-034.3]] — `related-decision:` authored the `overrides` block and the CI Audit step; its recap explicitly instructs that **both** overrides be deleted when Next 16 lands. This task discharges that instruction.
- [[BI-034.4]] — `related-decision:` added `.github/dependabot.yml` and deliberately left majors ungrouped so `next@16` would surface as its own PR. PR #6 is that PR.
- [[CORE-003]] — `depends-on:` moved lint off `next lint` to a bare `eslint` invocation, which is what makes the Next 16 upgrade a non-event for the lint script (Next 16 removed `next lint`).
- [[DEPLOY-001]] — predecessor in this area; added the gitleaks secret-scan job to the same workflow file.

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Every premise of the PLAN line holds. Next 16 is `latest` on npm (16.3.3), Dependabot PR #6 exists exactly as BI-034.4 designed for, the `overrides` block is still in `package.json`, and the `ci.yml` Audit-step comment still carries the droppable-at-Next-16 instruction. A scratch probe confirms the overrides are now genuinely redundant rather than merely believed to be.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Upstream state.** `next` `latest` on npm is **16.3.3**; Next 16 is stable, not a preview. Dependabot PR **#6** (`chore(deps): bump next from 15.5.23 to 16.3.0`, opened 2026-08-10) is the PR the PLAN line anticipated. It touches only `package.json` + `package-lock.json` and bumps **only** `next` — it does not move `eslint-config-next` and does not touch the `overrides` block, so "riding it" was never a merge-and-done.

**The overrides are genuinely redundant at Next 16 — measured, not assumed.** Next 16.3.3 declares `dependencies.postcss: "8.5.23"` and `optionalDependencies.sharp: "^0.35.3"`. Note that `8.5.23` is *below* the override's `^8.5.26` floor, so "Next 16 fixes it upstream" needed proof rather than inference. A scratch probe (`package.json` + `package-lock.json` copied out, `next`/`eslint-config-next` set to `^16.3.3`, `overrides` deleted, `npm install --package-lock-only`) resolves:

| package | resolved |
|---|---|
| `next` | 16.3.3 |
| `eslint-config-next` | 16.3.3 |
| `next/node_modules/postcss` | 8.5.23 |
| `postcss` (root, via Tailwind) | 8.5.26 |
| `nanoid` | 3.3.18 |
| `sharp` | 0.35.3 |

`npm audit --omit=dev --audit-level=high` on that tree → **`found 0 vulnerabilities`, exit 0**. The mechanism BI-034.3 relied on still holds by a different route: `postcss@8.5.23` requires `nanoid: ^3.3.16`, a *range*, which resolves to 3.3.18 and clears the `<=3.3.16` advisory — whereas Next 15's `postcss` was an exact `8.4.31` pin that could not float. That exact-pin-vs-range difference is the whole reason the override was needed then and is not needed now.

**Next 16 breaking-change surface is near-nil here.** No dynamic route segments anywhere under `app/` (so no sync→async `params` migration), no `next/image` or `next/legacy/image`, no middleware, no AMP. `next.config.ts` sets only a conditional `distDir`. The only `next` imports in source are `Metadata` + `next/font/google` (`app/layout.tsx`) and `NextResponse` (`app/api/imagegen/{file,link}/route.ts`, `lib/imagegenRoute.ts`) — all unchanged in 16. Scripts already pass `--turbopack`, which 16 defaults to anyway, and CI runs Node 22 (16 requires ≥20.9).

**Archive skim** (`grep -l` over `archive/{bi,core,test,deployment}/*.md` for `overrides|postcss|sharp|npm audit`; 22 hits, the load-bearing ones read in full):

- **`bi/BI-034.3.md`** — authored both the `overrides` block and the CI Audit step. Two findings that directly govern this task. (1) Its recap states outright: *"when Next 16 eventually lands and fixes these upstream, **both overrides should be deleted**; leaving them pins the repo to floors it no longer needs."* This task is the discharge of that instruction, so the work is pre-authorized by the note that created the debt. (2) Its ⚠️ warning — the `postcss` override *deliberately overrode Next 15's exact `8.4.31` pin* — is exactly the risk that disappears here: dropping the override returns `postcss` resolution to Vercel's own choice instead of forcing a minor bump past it. Deleting the block is therefore risk-*reducing*, not merely tidying.
- **`bi/BI-034.4.md`** — added `.github/dependabot.yml` and left majors ungrouped *specifically* so `next@16` would arrive as its own PR. PR #6 is that design working as intended.
- **`core/CORE-003.md`** — moved lint off `next lint` to a bare `eslint` invocation. Load-bearing: Next 16 **removes** `next lint`, so had CORE-003 not already landed, this upgrade would have broken `npm run lint`. It did land, so the lint script needs no change.
- Remaining hits (`BI-023`, `BI-026`, `BI-029.3`, `BI-035.3`, `BI-037`, `BI-042.3`, `TEST-*`) are dependency-add or test-config edits; none touch resolution behavior. `deployment/DEPLOY-001.md` is the only prior note in this area and touches only the gitleaks job, not the audit step.

**Drift check.** No drift. `.github/workflows/ci.yml`'s Audit-step comment reads verbatim as the PLAN line describes it ("Drop those overrides when the tree moves to Next 16, which fixes them upstream — Dependabot surfaces that major as its own PR"), and `package.json` still carries `overrides: { postcss: ^8.5.26, sharp: ^0.35.3 }`. The PLAN line's own claim — that the cleanup instruction "lives only in the comment" — is confirmed: `grep` finds no other mention of the overrides in `README.md`, `AGENTS.md`, or `CLAUDE.md`. Against the flowtron SPEC: nothing here touches a settled contract; this is an ordinary single-commit implementation task.

**Best Practices Review.** No module boundary or abstraction in play — the change is three declarative files (`package.json`, `package-lock.json`, `ci.yml`). The one judgment call is the CI comment, which is the repo's mechanism for carrying a conditional-on-upstream decision that BI-034.3 deliberately chose *not* to file as a task. Once the condition fires, the comment must stop reading as a pending instruction or it becomes a stale directive pointing at a block that no longer exists — so rewriting it is part of the work, not adjacent cleanup. Deferred: nothing.

**Clarifications asked** — three, all answered by the operator, all ratifying the recommended option:

1. **Landing mechanism → local upgrade, one commit.** Upgrade locally to `^16.3.3` (rather than merging PR #6's staler 16.3.0), drop the overrides, and land it as one atomic commit; then close PR #6 as superseded. Matches the repo's solo/commit-to-main workflow and flowtron's atomic-closure guard, and avoids an intermediate `main` carrying Next 16 *plus* a now-redundant overrides block.
2. **`eslint-config-next` 15→16 → include.** Not named in the PLAN line, but leaving it at `^15` would mismatch `@next/eslint-plugin-next@15` against a Next 16 framework. Its peers are `eslint: >=9.0.0` and `typescript: >=3.3.1`, so it forces neither of the other two majors. This is the configuration the probe validated.
3. **ESLint 9→10 and TS 5→7 → assess here, file as PLAN follow-ups.** See the assessment below.

**Assessment of the two adjacent majors (the PLAN line's "assess separately").** Both are genuinely decoupled from this task and stay out of scope:

- **ESLint 9→10** (`latest` 10.9.1; Dependabot PR #4). Not forced: `eslint-config-next@16.3.3` declares `eslint: >=9.0.0`. The real risk sits elsewhere — `eslint.config.mjs` drives `next/core-web-vitals`, `next/typescript`, and `plugin:jsx-a11y/recommended` through `FlatCompat` from `@eslint/eslintrc@^3`, an eslintrc-compatibility shim. An ESLint 10 bump is really a question about that shim, and it deserves its own task.
- **TypeScript 5→7** (`latest` 7.0.2; Dependabot PR #5). Not forced: peer is `typescript: >=3.3.1`. This is the native-port compiler rewrite and the highest-risk of the three majors, especially against this repo's `strict` + `noUncheckedIndexedAccess` posture (BI-036). Squarely its own task.

Neither PR is touched by this task; both are filed as `## Future Opportunities` entries at closure so the majors are tracked in PLAN.md rather than living only as open PRs.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Nine files (plus the lockfile). The manifest change the task was filed for is three lines; the other six files are what the Next 16 tree turned out to *require* to keep the existing gates green — each one traced to a specific upstream breaking change, none of it discretionary cleanup.

**1. The filed change — `package.json`.** `next` `^15.5.23` → `^16.3.3`, `eslint-config-next` `^15.5.23` → `^16.3.3`, and the `overrides` block deleted. `@eslint/eslintrc` also removed: the FlatCompat rewrite below is what made it unused, so it falls under "remove what your own change orphaned" rather than adjacent cleanup.

**2. `.github/workflows/ci.yml`** — the Audit-step comment rewritten from a *pending instruction* into a *statement of state*. This was the point of the task: the cleanup directive lived only in that comment, so leaving it would have left a stale note pointing at a block that no longer exists. The `--omit=dev` prod-only rationale (BI-034.3's deliberate boundary) is preserved verbatim in substance; the new closing line states what a failure now means ("a genuinely new advisory, not a local pin that fell behind"), which is the property dropping the overrides actually buys.

**3. `lib/imagegenRouteGuard.test.ts`** — Next 16 ships its own **non-generic** `ImportMeta.glob` overloads in `next/types/global.d.ts` (Turbopack's glob support). Those merge with Vite's generic `glob<T>()` and win at the call site, so `import.meta.glob<Record<string, unknown>>(…)` became `TS2558: Expected 0 type arguments, but got 1`, and the downstream `mod` degraded to `unknown` (`TS18046`). Fixed by dropping the type argument and asserting the module shape at the point of use — which is also where `noUncheckedIndexedAccess` already forces a narrow, so no type safety is lost. `skipLibCheck: true` is why this surfaces as two call-site errors rather than a duplicate-identifier error inside the `.d.ts` pair.

**4. `eslint.config.mjs`** — `eslint-config-next@16` ships **native flat config**; routing it through `@eslint/eslintrc`'s `FlatCompat` crashes outright (`TypeError: Converting circular structure to JSON` inside eslintrc's schema validator). Rewritten to spread `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript` directly. Verified the composition is equivalent, not merely similar: `core-web-vitals` resolves to 4 entries carrying the base `next` config (67 rules) plus `next/core-web-vitals` (22), and `typescript` adds typescript-eslint's recommended layers — the same two configs the old `compat.extends()` named.

`plugin:jsx-a11y/recommended` needed a different treatment. Spreading `jsxA11y.flatConfigs.recommended` wholesale fails with `Cannot redefine plugin "jsx-a11y"`, because `eslint-config-next` already registers that namespace. Applying **only its `rules`** avoids the collision, and it is safe: there is exactly one hoisted `eslint-plugin-jsx-a11y@6.10.2` in the tree (checked — no nested copy under `eslint-config-next`), so both configs point at the same plugin. BI-040's intent is preserved *exactly*, not approximately — `flatConfigs.recommended.rules` and the old `configs.recommended.rules` are the same 34 rules with the same 31-error/3-off severity split.

**5. The five `react-hooks` disables.** `eslint-config-next@16` pulls `eslint-plugin-react-hooks` 5 → **7.1.1**, whose React-Compiler-era rules (`set-state-in-effect`, `refs`) fail on five pre-existing, deliberate, individually-commented patterns. Per the operator's decision, both rules stay at **error** — so any *new* violation still fails CI — and each of the five known sites carries an `eslint-disable-next-line` with a rationale naming the task that engineered it and the follow-up that will revisit it. Zero behavior change; no effect logic was touched. This deliberately did **not** become an effect-refactoring task: the sites live in exactly the components BI-042 (blob-URL lifetime) and BI-007 (unsaved prompt draft) tuned, and one is in `lib/useWorkspace.ts`, which BI-049 decided last week to leave whole.

A placement detail worth recording: the first attempt put the rationale *inside* the disable comment, which silently broke all five — `eslint-disable-next-line` only covers the immediately following line, so the directive landed on prose and ESLint reported 5 errors **plus** 5 `Unused eslint-disable directive` warnings. Rationale now sits above a bare directive line. The absence of those warnings in the final run is the proof each disable is load-bearing and precisely placed.

**6. `next.config.ts` — `agentRules: false`.** Next 16 appends a delimited `<!-- BEGIN:nextjs-agent-rules -->` block to `AGENTS.md` on every `next dev`. `AGENTS.md` is this repo's hand-authored agent-neutral SSOT and a declared AI-referenced doc, and an uncommitted re-appearing block would trip flowtron's own foreign-dirt gate at the start of every future task. Disabled at the source per the operator's decision, and `AGENTS.md` reverted. Verified by restarting `next dev` and confirming the file stays clean with no config warning (i.e. the key is valid in Next 16's schema, not silently ignored).

**7. `tsconfig.json`** — Next 16 auto-patched this during the first build. Two changes kept as semantic (`jsx: "preserve"` → `"react-jsx"`, and `include` gaining `.next/dev/types/**/*.ts` + `.next-verify/dev/types/**/*.ts`, one per `distDir`, preserving CORE-002's pair symmetry). Next's writer had also expanded every array to multi-line; that formatting churn was reverted, following **CORE-002's explicit precedent** for this exact situation ("kept the semantic addition but reformatted back to the repo's original compact array style"). Diff went from 25 changed lines to 4. Confirmed Next accepts the compact form and does not re-expand it on a subsequent `next dev`.

**Deferred (not done here, by decision):** the five `react-hooks@7` violations → filed as BI-050. ESLint 9→10 and TypeScript 5→7 → assessed as decoupled, filed as follow-ups. Dependabot PR #6 → closed as superseded rather than merged (it bumps only `next`, to the staler 16.3.0).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line) — asked against the live dev server on :3003; operator confirmed

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

Full suite, all green on the final tree:

| Gate | Command | Result |
|---|---|---|
| Type check | `npm run typecheck` | exit 0 |
| Lint | `npm run lint` | exit 0 — no errors, **and no unused-directive warnings** |
| Tests | `npm test` | **560 passed / 31 files**, exit 0 |
| Audit (the CI gate) | `npm audit --omit=dev --audit-level=high` | `found 0 vulnerabilities`, exit 0 |
| Build | `npm run build:verify` | exit 0, 9 routes |
| CI install path | `npm ci` | exit 0 — lockfile is in sync, no resolution drift |

Test count is unchanged from the pre-upgrade baseline (560/31), which is the signal that matters: the Next 16 upgrade changed no runtime behavior the suite observes. `npm ci` was run deliberately rather than trusting `npm install`, mirroring BI-034.3's verification discipline — it is the install path CI actually uses.

**The acceptance measurement.** `npm audit --omit=dev --audit-level=high` returns `found 0 vulnerabilities` with **no `overrides` block present**. Resolved tree: `next@16.3.3`, `next/node_modules/postcss@8.5.23`, root `postcss@8.5.26` (via Tailwind), `nanoid@3.3.18`, `sharp@0.35.3`. The mechanism is worth recording because it is not the one BI-034.3 assumed: Next 16 pins `postcss` at `8.5.23`, which is *below* the old override's `^8.5.26` floor, so "Next 16 fixes it upstream" is true for a different reason — `8.5.23` depends on `nanoid: ^3.3.16` as a **range** that resolves to 3.3.18, clearing the `<=3.3.16` advisory, whereas Next 15's exact `postcss@8.4.31` pin could not float at all.

**Live verification.** Ran `npm run dev` on :3003 (three times across the change): HTTP 200 on `/` serving `<title>blastimage</title>`, and `/api/imagegen/browse` returning 200 — so both the RSC page and the Node-`fs` route surface work under Next 16. Also incidentally re-confirmed CORE-002's isolation still holds: `npm run build:verify` ran to completion while the dev server stayed live and kept serving 200, which is the exact scenario that 500'd under plain `npm run build` in BI-046/BI-047.

**Quality assertions.** No duplication introduced; no dead code (`@eslint/eslintrc` removed precisely because the FlatCompat rewrite orphaned it). Every non-obvious constraint is commented at its site with the task ID that explains it, matching the repo's prevailing style. Public surface unchanged — no exported API moved. No stale code-facing docs: the one comment that *was* about to go stale (`ci.yml`'s cleanup instruction) is the thing this task rewrote.

**Known non-blocking observation.** `npm run build:verify` emits a Turbopack warning about dynamic `path.join` usage traced to `lib/imagegenServerFs.ts` ← `app/api/imagegen/rounds/route.ts`. This is inherent to BI-045's design — the adapter reads an operator-chosen root that cannot be statically scoped — and it is a warning, not an error; the build succeeds. Not filed: it is a correct description of a deliberate architecture, and the guard bounding those paths (`lib/imagegenGuard.ts`) is the actual safety mechanism.

**Frontend visual confirmation:** 👁️ **CONFIRM** asked of the operator against the live dev server on :3003 — see the ask in-session. Automated evidence (200s, correct title, API route reachable) is recorded above, but per the operator's standing convention a live-view confirmation is the acceptance mechanism for rendered surfaces, not a screenshot.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed per SPEC/tasknote-selection.md §"`## Completed` archive convention" (standalone → top of `## Completed`; epic child → kept nested beneath its active parent), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

Moved the repo to Next 16.3.3 and deleted the `postcss`/`sharp` `overrides` block, which was the whole point: BI-034.3 added that block as a local floor to get the CI audit gate passing on Next 15, and left the instruction to remove it in a code comment rather than a task. `npm audit --omit=dev --audit-level=high` now returns `found 0 vulnerabilities` against the **unmodified** resolved tree, so the gate has real teeth instead of resting on a pin that would silently rot.

The measurement mattered more than the assumption. Next 16 pins `postcss` at `8.5.23` — *below* the old override's `^8.5.26` floor — so "Next 16 fixes it upstream" is true by a different mechanism than BI-034.3 predicted: `8.5.23` requires `nanoid: ^3.3.16` as a **range** that resolves to 3.3.18 and clears the `<=3.3.16` advisory, whereas Next 15's exact `postcss@8.4.31` pin could not float at all. That was verified in a throwaway probe before any repo file was touched.

**Changed** — 15 files. `package.json` (`next` + `eslint-config-next` → `^16.3.3`, `overrides` deleted, `@eslint/eslintrc` removed as orphaned) · `package-lock.json` · `.github/workflows/ci.yml` (+7/−5, audit comment rewritten from pending instruction to statement of state) · `eslint.config.mjs` (rewritten, +14/−13) · `next.config.ts` (+6, `agentRules: false`) · `tsconfig.json` (+2/−2) · `lib/imagegenRouteGuard.test.ts` (+11/−4) · 4 comment-only edits in `components/{ResolvedImage,ResolvedImage.test,TaskDetail,ImagegenLinkModal}` and `lib/useWorkspace.ts` · 3 doc corrections in `CLAUDE.md`, `docs/GROK-AGENT.md`, `docs/ADOPT.md`.

The filed change was three manifest lines; six more files were required by the upgrade, each traceable to a specific upstream break rather than to discretionary cleanup:

1. **`import.meta.glob`** — Next 16 ships non-generic `ImportMeta.glob` overloads (`next/types/global.d.ts`) that merge with and beat Vite's generic `glob<T>()`, breaking TEST-004.3's route-discovery suite with `TS2558`/`TS18046`. Dropped the type argument, asserted the shape at point of use.
2. **`eslint.config.mjs`** — `eslint-config-next@16` is native flat config; `FlatCompat` crashes on it (`Converting circular structure to JSON`). Rewrote to direct imports and *verified* equivalence rather than assuming it (base `next` 67 rules + `core-web-vitals` 22 + typescript-eslint layers). jsx-a11y needed rules-only application, since spreading its flat config re-registers a plugin namespace `eslint-config-next` already owns; BI-040's intent is preserved exactly — same 34 rules, same 31-error/3-off split.
3. **`react-hooks` 5→7.1.1** — new React-Compiler-era rules flag 5 pre-existing deliberate patterns. Per operator decision the rules stay at **error** (new violations still fail CI) with five documented per-site disables; filed as **BI-050**.
4. **`agentRules: false`** — Next 16 appends its own block to `AGENTS.md`, this repo's hand-authored SSOT, on every `next dev`; left uncommitted it would trip flowtron's foreign-dirt gate at the start of every future task. Disabled at source per operator decision, verified across restarts.
5. **`tsconfig.json`** — kept Next's two semantic changes, reverted its array-expansion churn following **CORE-002's explicit precedent** for this exact situation; 25-line diff reduced to 4.

**Refactors made / deferred.** Made: only the two the upgrade forced (the eslint config rewrite, the glob typing) plus removing `@eslint/eslintrc`, which those changes orphaned. Deferred deliberately: the 5 react-hooks violations. Fixing them means `key`-prop / derive-during-render rewrites in precisely the components BI-042 (blob-URL lifetime) and BI-007 (unsaved prompt draft) engineered, plus `lib/useWorkspace.ts` — which BI-049 decided *one day earlier* to leave whole. That is characterization-test work, not dependency-upgrade work, and it is filed rather than smuggled in here.

**Verified** — typecheck ✅ · lint ✅ (no errors **and** no unused-directive warnings, proving all 5 disables are load-bearing and correctly placed) · **560 tests / 31 files ✅, unchanged from the pre-upgrade baseline** · `npm audit --omit=dev` → 0 vulnerabilities ✅ · `npm run build:verify` ✅ (9 routes) · `npm ci` ✅ (run deliberately, mirroring BI-034.3's discipline — it is the path CI actually uses). Live: dev server on :3003 served 200 with the correct title and a working `/api/imagegen/browse`; operator confirmed visually. Incidentally re-confirmed CORE-002's isolation — `build:verify` ran to completion while the dev server stayed live, the exact scenario that 500'd in BI-046/BI-047.

**Documentation verdict.** `README.md` — no change (no framework-version or dependency references). `AGENTS.md` — no change (flowtron workflow prose only; deliberately protected from Next's writer). `CLAUDE.md` — **updated**, "Next.js 15" → "Next.js 16". `.flowtron/PLAN.md` — this line flipped, three follow-ups filed. Beyond the declared set, two docs my own change falsified were corrected: `docs/GROK-AGENT.md` (Next.js 15 → 16) and `docs/ADOPT.md` (Node ≥18 "Next.js 15 requirement" → Node ≥20.9 for Next 16; CI's Node 22 already satisfies it).

**Known non-blocking observation.** `build:verify` emits a Turbopack warning about dynamic `path.join` in `lib/imagegenServerFs.ts`. Not filed: it is an accurate description of BI-045's deliberate design (an operator-chosen root cannot be statically scoped), the build succeeds, and `lib/imagegenGuard.ts` is the actual safety mechanism.

**Maintainability effect.** Net positive, and specifically it closes a debt that only a comment was tracking. The CI gate now runs against the real dependency tree rather than a hand-maintained floor, so a failure means a genuinely new advisory. `eslint.config.mjs` shed an eslintrc-compatibility shim and is now pure flat config, which makes DEPLOY-003 (ESLint 10) materially easier than it would have been. Against that, the task adds one new debt it is honest about: five `eslint-disable` sites, each annotated with the task that created the pattern and the task that will revisit it, with the rules left at error so the debt cannot silently grow.

**Archived:** 2026-08-30
