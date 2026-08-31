---
title: typescript-7-upgrade
status: completed
tags: []
created: 2026-08-31
due:
related-tasks: [DEPLOY-003, DEPLOY-002, DEPLOY-005, DEPLOY-006, BI-036]
touches:
  - package.json
  - tsconfig.json
  - .github/dependabot.yml
  - .flowtron/PLAN.md
# blocked-by:
#   - TASK-ID
# parallel-safe-with:
#   - TASK-ID
# supersedes:
#   - TASK-ID
---

# DEPLOY-004 | typescript-7-upgrade

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-003]] [[DEPLOY-002]] [[DEPLOY-005]] [[DEPLOY-006]] [[BI-036]]

## 🎯 Goal

Assess and land TypeScript 5→7 (Dependabot PR #5; latest 7.0.2) against this repo's `strict` + `noUncheckedIndexedAccess` posture, resolving diagnostic differences rather than treating it as a clean swap.

## ✅ Acceptance

- [x] TypeScript 7 assessed against the *actual* dependency tree, not against peer-range inference — a probe that installs `typescript@7` and runs `tsc`, `eslint`, and `next build` over this repo's real sources with this repo's real config
- [x] The blocking package, the exact failure, and its upstream availability identified by name and version
- [x] Official dual-install workaround measured, not just read — Microsoft's alias setup *and* a Next-first override setup both tried
- [x] Verdict recorded durably in this tasknote (not in the PLAN long description, which Phase 4 collapses to a stub)
- [x] `PLAN.md` reflects the verdict, and Dependabot PR #5's disposition is stated
- [x] Repo left on TypeScript 5 with the full gate suite still green, **or** moved to TypeScript 7 with it green — no half-landed upgrade

## 🧩 Subtasks

- [x] Read `package.json` + `tsconfig.json`; enumerate every package that declares a `typescript` peer
- [x] Read the TypeScript 7 announcement for 6.0-default changes, hard errors, and the missing compiler API
- [x] Probe `npm install` resolution with `typescript@^7.0.2`
- [x] Probe **runtime**: full install + `tsc --noEmit`, `eslint`, and `next build` over `app/`, `components/`, `lib/` with the repo's config
- [x] Probe the official dual-install (`typescript` → `@typescript/typescript6`, plus a TS 7 alias) against this Next 16.3.3 tree
- [x] Check upstream for typescript-eslint TS 7 / 7.1 support
- [x] Record the verdict and apply the `PLAN.md` disposition

## 🔗 Related

- [[DEPLOY-003]] — `related-decision:` sibling major (eslint 9→10 parked); this task copies its assess-and-de-scope disposition playbook
- [[DEPLOY-002]] — predecessor; filed this line after assessing TS 5→7 as decoupled. Its "not forced by any peer" claim looked only at `eslint-config-next`
- [[DEPLOY-005]] — remaining eslint-10 revisit; independent of this one
- [[DEPLOY-006]] — follow-up filed at closure; the `[light]` revisit once typescript-eslint supports TS 7
- [[BI-036]] — `noUncheckedIndexedAccess` posture the PLAN line called highest-risk against; empirically a non-event on this tree

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** De-scope
  **Rationale:** The task reads "assess **and land**". The assess half ran to a
  definitive answer; the land half is impossible today without breaking a CI
  gate. Putting `typescript@7.0.2` in the `typescript` package name (which
  Next 16.3.3 requires for `next build`) makes `eslint-config-next`'s
  `typescript-eslint` throw at config load. The official dual-install that
  keeps a TS 6 API under the `typescript` name makes `next build` refuse to
  type-check ("required package(s) installed"). Those two constraints are
  currently mutually exclusive. Landing anyway would mean dropping
  typescript-eslint rules or re-adding an `overrides` pin DEPLOY-002 just
  deleted. The assessment is the deliverable, and it is complete.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Upstream state.** `typescript` `latest` is **7.0.2** (native Go port, shipped
2026-07-08; 7.0.2 on 2026-08-20). The repo is on `typescript@5.9.3` via `^5`.
Dependabot PR **#5** is `chore(deps-dev): bump typescript from 5.9.3 to 7.0.2`
— `package.json` + `package-lock.json` only. TypeScript 7.1 (the compiler-API
release typescript-eslint is waiting on) is still `7.1.0-dev.*`; no stable 7.1.

**tsconfig is already 7-ready.** `strict: true`, `module: esnext`,
`moduleResolution: bundler`, `target: ES2017` (floor is now ES2015, not ES5),
no `baseUrl`, no `node10`/`classic`, `esModuleInterop: true` (cannot be
`false` in 7). `noUncheckedIndexedAccess` is extra and orthogonal. `allowJs`
is on but `include` is `*.ts`/`*.tsx` only, so the JS-analysis rewrite does
not reach this repo.

**The PLAN line's "not forced by any peer" claim is incomplete.** It inherited
DEPLOY-002's look at `eslint-config-next@16.3.3` (`typescript: ">=3.3.1"`).
The actual peer that binds:

| Package | How it arrives | `typescript` peer | Declares 7? |
|---|---|---|---|
| `eslint-config-next@16.3.3` | direct devDep | `>=3.3.1` | ✅ |
| **`typescript-eslint@8.68.0`** (tree) / **`8.69.0`** (`latest`) | via config-next | `>=4.8.4 <6.1.0` | ❌ |
| `next@16.3.3` | direct dep | *(none — Next 16.3 invokes `tsc` CLI)* | n/a |
| `vitest@4.1.8` | direct devDep | *(none)* | n/a |

`typescript-eslint` `latest` is 8.69.0; `canary` is 8.69.1-alpha.0 — same
peer range. Tracking: [typescript-eslint#10940](https://github.com/typescript-eslint/typescript-eslint/issues/10940).
8.65.0 added a TS 7 warning; current `latest` **throws at config load**.

**Runtime probe — sole `typescript@7.0.2`** (scratch copy of this repo's
`package.json` / lock / `tsconfig.json` / `eslint.config.mjs` / `next.config.ts`
plus `app/`, `components/`, `lib/`; `npm install --legacy-peer-deps`):

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | **exit 0** — zero diagnostics. The PLAN line's "expect diagnostic differences rather than a clean swap" is **false for this tree**. `strict` + `noUncheckedIndexedAccess` did not move. |
| `npx next build --turbopack` | **exit 0** — Next 16.3.3's default CLI checker (`experimental.useTypeScriptCli`) type-checks via `tsc` in 372ms. Confirmed by Next's own docs. |
| `npx eslint .` | **exit 2**, config-load throw: `typescript-eslint does not support TS 7.0.` (points at the dual-install blog section and #10940). `require('typescript')` on 7.0.2 exports only `version` / `versionMajorMinor` — no `createProgram`. |

Peer-range ERESOLVE is a warning on npm 11.19.0 (`ERESOLVE overriding peer
dependency`), not a hard install failure. The lint crash is the real blocker,
and it is at **config load**, not on any source line — nothing in this repo
can be written around it.

**Dual-install probes — both official-shaped setups fail a CI gate.**

*Setup A (Microsoft's published aliases):*
`typescript: npm:@typescript/typescript6@^6.0.2` +
`@typescript/native: npm:typescript@^7.0.2`.
`require('typescript').version` is 6.0.3 with `createProgram`. `npx tsc`
resolves to **7.0.2**. `eslint` **clean** (exit 0). `next build` **fails**:
`It looks like you're trying to use TypeScript but do not have the required
package(s) installed.` Next 16.3.3 then tries to `npm install --save-dev
typescript` itself. This is [vercel/next.js#96589](https://github.com/vercel/next.js/issues/96589)
on this tree, not a hypothetical.

*Setup B (Next-first):* `typescript: ^7.0.2` plus `overrides` pinning
`typescript-eslint` / `@typescript-eslint/{parser,typescript-estree}` to
`npm:@typescript/typescript6@^6.0.2`. `tsc` and `next build` **clean**.
`eslint` **still throws** — `require('typescript')` from
`typescript-eslint/dist/index.js` walks to the root `typescript@7` (no
`createProgram`). The override does not change that resolution. And it would
re-introduce the `overrides` block DEPLOY-002 just deleted.

Those two constraints are currently **mutually exclusive**: Next 16.3.3
demands the package named `typescript` be a real TypeScript 7 install;
typescript-eslint demands the package named `typescript` still ship the 6.x
JS compiler API. No third package-json shape lands all three CI gates
(`typecheck` / `lint` / `build`).

**Workarounds rejected rather than attempted in-tree.**

- Sole `typescript@7` — breaks `npm run lint` (measured).
- Microsoft dual-install — breaks `next build` on Next 16.3.3 (measured).
- `overrides` to nest typescript6 under eslint — does not actually rebind
  `require('typescript')` (measured), and would re-open the pin DEPLOY-002
  closed.
- Drop `eslint-config-next/typescript` — silently drops the typescript-eslint
  recommended layer to gain a version number. Same class of "weaken a gate
  for a version" DEPLOY-003 rejected for `react/*`.
- Land TypeScript 6 instead — fits `typescript-eslint`'s `<6.1.0` peer, but
  it is not this task (filed as 5→7, the native port). A consolation bump
  to the last JS compiler is a different filing.

**Drift check.** Two PLAN-line claims need recording:

1. *"Not forced by any peer — `eslint-config-next@16` declares
   `typescript: >=3.3.1`."* True of that one package, false of the tree.
   `typescript-eslint`'s `<6.1.0` is the binding peer. This is the same
   class of forecast-overtaken-by-measurement DEPLOY-003 recorded against
   DEPLOY-002's "really a question about that shim" line — a superseded
   *decision/forecast*, not a factual-false claim about the repo at the
   time, so no ⚠️ pointer on DEPLOY-002 (SPEC §"Tasknote frontmatter"
   carve-out excludes superseded decisions).
2. *"Highest-risk of the three majors against this repo's `strict` +
   `noUncheckedIndexedAccess` posture (BI-036); expect diagnostic
   differences rather than a clean swap."* Empirically false: `tsc --noEmit`
   on 7.0.2 is a clean swap. The risk sat in the **tooling** gap (no
   compiler API → eslint), not in the type checker. Worth keeping so the
   revisit does not re-audit BI-036 sites.

Against the flowtron SPEC: nothing here contradicts a settled contract.
De-scope of an assess-and-land whose land half is blocked is the
DEPLOY-003 precedent in this same area.

**Archive skim** (`archive/deployment/`, plus `tsconfig.json` / `package.json`
hits across areas):

- **`deployment/DEPLOY-003.md`** — load-bearing playbook. Assess-and-land
  whose land half was blocked by a transitive `eslint-config-next` plugin;
  de-scoped; filed a `[light]` revisit; added a Dependabot major-ignore
  with a named deletion condition; closed the Dependabot PR. This task is
  the TypeScript twin of that disposition. Its rejection of `overrides` as
  "re-opening the debt DEPLOY-002 closed" applies verbatim to Setup B.
- **`deployment/DEPLOY-002.md`** — filed this PLAN line. Next 16.3.3 is
  what makes TS 7's CLI checker work (`useTypeScriptCli` default) *and*
  what rejects Microsoft's alias. The "not forced by any peer" assessment
  only looked at `eslint-config-next`. `tsconfig.json` was last touched
  here (jsx `preserve` → `react-jsx`, `.next/dev/types` include); those
  changes stay 7-compatible.
- **`bi/BI-036.md`** — enabled `noUncheckedIndexedAccess`. The flag is
  still on; TS 7 did not re-open any of its 113-error set. Forward-looking
  value of the flag is unchanged.
- **`core/CORE-003.md`**, **`bi/BI-040.md`** — lint-script / jsx-a11y
  posture; neither is at risk here. The typescript-eslint layer that
  *would* be at risk is exactly the one we refuse to drop.
- **`deployment/DEPLOY-001.md`** — gitleaks only; no bearing.

**Best Practices Review.** No module boundary or abstraction in play — a
De-scope writes a Dependabot ignore + a PLAN follow-up, same three-file
shape as DEPLOY-003. The pattern to extend is that note's ignore-comment
convention: name the blocker, the exact failure, why there is nothing to
bump to, where the measurement lives, and the condition under which the
entry should be deleted. Deferred: nothing in-tree. Specifically *not*
pre-adapting `tsconfig.json` for 6.0 defaults this repo already satisfies
(`types: []` would be the one surprising 7.0 default, but `tsc` was clean
without listing `@types/node`/`react`, so don't touch it speculatively).

**Clarifying questions.** One, and it is the whole decision this task
turns on — what to do with an "assess and land" task whose assessment
says *don't land*. Raised at the Phase 1→2 gate rather than assumed,
since De-scope always fires it.

**Assumptions made explicit:** the repo stays on `typescript: "^5"`
(5.9.3); the full gate suite is expected to remain green because nothing
in the working tree's source changes; Dependabot PR #5 needs a
disposition either way, since left alone it will keep reappearing; we do
not land TypeScript 6 as a consolation bump (different task); we do not
re-add `overrides`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

The De-scope verdict makes the deliverable a recorded finding plus a disposition,
not a dependency bump. Three changes, no source touched.

**1. `.github/dependabot.yml`** (+11). A second `ignore` entry holding
`typescript` at major 5, sibling to DEPLOY-003's `eslint` entry:

```yaml
      - dependency-name: "typescript"
        update-types:
          - "version-update:semver-major"
```

**Pattern survey:** this file already carries the repo's convention of
*explaining a Dependabot decision in a comment at the site of the decision*
— BI-037's note on why `github-actions` is ungrouped, and DEPLOY-003's
eslint-major ignore. The new entry extends that shape rather than inventing
one: the comment names the blocking package, the exact failure, why the
official dual-install is not a land path here, where the measurement lives,
and the condition under which the entry should be deleted (DEPLOY-006
landing). An ignore rule with no removal condition is how a temporary hold
silently becomes permanent, and DEPLOY-002 had just finished removing a
different hand-maintained pin for exactly that reason.

Scoped to `typescript` alone and to majors alone: minors and patches on
TypeScript 5 still flow through the `patch-and-minor` group untouched.

**2. `.flowtron/PLAN.md`.** DEPLOY-004 collapsed to the `Completed 2026-08-31.`
stub; **DEPLOY-006** filed in its place under `## Future Opportunities` as
`[light]🔧 typescript-7-revisit`. The follow-up line carries the unblock
*check* (`npm view typescript-eslint peerDependencies`) rather than a date,
since the gate is an upstream release with no announced schedule — and it
reminds the next runner to drop the dependabot ignore. Re-graded
`[heavy]🧠` → `[light]🔧`: the assessment is done and recorded, so what
remains is a bump-and-verify once upstream moves. The type-checker half is
already proven clean; the revisit does not re-audit BI-036 sites.

**3. Dependabot PR #5** — commented with the measured finding and the
rejected dual-install, then closed. Closed rather than left open so the PR
list reflects reality; the ignore entry is what stops it re-raising weekly.

**Minimal refactor gate.** No refactor. `tsconfig.json` was read closely
during Discovery and deliberately **not** touched — it is already 7-ready
(`strict`, `module: esnext`, `moduleResolution: bundler`, `target: ES2017`,
no `baseUrl`), and `tsc --noEmit` on 7.0.2 was clean without listing
`types`. Speculatively pre-adapting a config for a version that cannot be
installed would be exactly the future-proofing this project avoids.

**Tests.** No test added, and deliberately so — the finding is about a
third-party package's behavior under a version this repo does not install,
which no test in this suite could observe. The evidence that belongs in
version control is the reproducible probe recipe, and it is recorded in
Discovery Notes above: copy `package.json` / `package-lock.json` /
`tsconfig.json` / `eslint.config.mjs` / `next.config.ts` and the source
dirs to a scratch dir, set `typescript` to `^7`, `npm install
--legacy-peer-deps`, run `tsc` / `eslint` / `next build`. DEPLOY-006
re-runs that, it does not re-derive it.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] (frontend) `N/A` — no frontend surface changed; the diff is one CI config file and two workflow markdown files. Nothing renders differently.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

Full gate suite, all green on an unchanged working tree:

| Gate | Result |
|---|---|
| `npm run lint` | exit 0 (ESLint 9.39.4) |
| `npm run typecheck` | exit 0 (TypeScript 5.9.3) |
| `npm test` | **31 files, 563 tests passed**, 4.54s |

Expected to be green — no source changed — and run anyway to prove the tree was
left in the state this task claims, not merely assumed to be.

**`dependabot.yml` structurally verified.** The new `typescript` ignore sits
as a sibling of the existing `eslint` ignore, same 6-space indent on
`dependency-name` / `update-types`, same `"version-update:semver-major"`
value. GitHub validates Dependabot config server-side; the entry's real
effect (no further TypeScript-major PRs) shows up on the next weekly run.

**The probe results are the substantive verification here**, and they are
recorded in Discovery Notes rather than repeated: `tsc` and `next build`
clean on 7.0.2; eslint config-load throw; Microsoft dual-install green on
eslint and red on `next build`; Next-first override green on `next build`
and red on eslint.

**Quality assertions.** No duplication (one new config block, sibling of
DEPLOY-003's); no dead code; the added comment explains a non-obvious
constraint at its site with its removal condition, matching this file's
existing comment style; public surface unchanged; no stale code-facing
documentation — `tsconfig.json` and `package.json` still truthfully
describe the tree that is installed.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed per SPEC/tasknote-selection.md §"`## Completed` archive convention" (standalone → top of `## Completed`; epic child → kept nested beneath its active parent), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

**Doc-drift sweep** — `.flowtron/tasknote/README.md` §"AI-referenced docs", all four entries:

| Doc | Verdict |
|---|---|
| `README.md` | no change — no shipped feature surface moved |
| `AGENTS.md` | no change — no workflow or tooling contract moved; grepped, it names no TypeScript version |
| `CLAUDE.md` | no change — its Stack section names the `strict` + `noUncheckedIndexedAccess` posture, neither of which this task touched; it makes no TypeScript version claim |
| `.flowtron/PLAN.md` | **updated** — DEPLOY-004 stubbed to `Completed 2026-08-31.`, DEPLOY-006 filed under `## Future Opportunities` |

None of the three prose docs pins a TypeScript version, so a held major creates no
drift in them. `.github/dependabot.yml` is not in the AI-referenced set but is
self-documenting at the change site.

---

**What happened, plainly.** DEPLOY-004 asked to assess and land TypeScript 5→7.
The assessment came back **don't land** — and, unusually, with a pair of
mutually exclusive constraints rather than a risk estimate. Putting
`typescript@7.0.2` in the package named `typescript` (which Next 16.3.3
requires for `next build`) makes `eslint-config-next`'s `typescript-eslint`
throw at config load (`does not support TS 7.0`; no `createProgram`).
Microsoft's official dual-install that keeps a TS 6 API under that name then
makes `next build` refuse ("required package(s) installed"). No
package.json shape lands all three CI gates today. `typescript-eslint`
`latest` is 8.69.0, peer still `>=4.8.4 <6.1.0`; TypeScript 7.1 (the
compiler-API release) is still `dev`.

**The part worth keeping.** The PLAN line called this the highest-risk of
the three majors against `strict` + `noUncheckedIndexedAccess` and expected
diagnostic differences. Empirically `tsc --noEmit` and `next build` are a
**clean swap** on 7.0.2. The risk sat in the tooling gap, not the type
checker. DEPLOY-006 does not re-audit BI-036 sites.

**Changed** — 3 files, no source. `.github/dependabot.yml` (+11, a
`typescript` major-ignore whose comment names the blocker, the failed
dual-install, and its own deletion condition) · `.flowtron/PLAN.md` (+1/−1,
DEPLOY-004 → `Completed` stub, DEPLOY-006 filed) · this tasknote. Plus one
out-of-tree action: Dependabot PR #5 commented with the finding and closed.

**Verification.** `npm run lint` exit 0 · `npm run typecheck` exit 0 · `npm test`
31 files / 563 tests passed. Run despite the untouched source to prove the tree
was left where this task says it was. `dependabot.yml` structurally verified
(indentation and key placement); GitHub validates the semantics server-side.

**Refactors made or deferred.** None made. `tsconfig.json` was read closely
and deliberately left alone — it is already 7-ready, and `tsc` on 7.0.2 was
clean without a `types` array. Pre-adapting a config for a version that
cannot be installed is speculative work this project doesn't do.

**Two land paths rejected, with reasons.** Sole `typescript@7` breaks
`npm run lint` (measured). Microsoft dual-install breaks `next build` on
Next 16.3.3 (measured, [vercel/next.js#96589](https://github.com/vercel/next.js/issues/96589)).
A Next-first `overrides` nest of typescript6 under eslint still
`require('typescript')`s the root 7 package (measured) and would re-open
the pin DEPLOY-002 closed. Dropping `eslint-config-next/typescript` would
weaken the lint gate to gain a version number — the same class of
workaround DEPLOY-003 rejected for `react/*`. Landing TypeScript 6 as a
consolation bump is a different filing.

**One forecast corrected.** The PLAN line inherited DEPLOY-002's claim that
TS 5→7 is "not forced by any peer" because `eslint-config-next` declares
`typescript: >=3.3.1`. True of that one package, false of the tree —
`typescript-eslint`'s `<6.1.0` is the binding peer. Same neighbourhood as
DEPLOY-003's correction of DEPLOY-002's "really a question about that shim"
forecast: a superseded *decision*, not a factual-false claim about the
repo at the time, so no ⚠️ pointer on DEPLOY-002.

**Maintainability effect.** A Dependabot ignore with a named removal
condition is cheaper than an open PR that goes red on lint every week, and
cheaper than a dual-typescript pin this repo would then own until 7.1.
The probe recipe in Discovery Notes is the unblock check; DEPLOY-006's
PLAN line points at `npm view typescript-eslint peerDependencies`.

**Archived:** 2026-08-31
