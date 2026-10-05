---
title: eslint-10-upgrade
status: completed
tags: [deps, tooling, lint]
created: 2026-08-30
due:
related-tasks: [DEPLOY-002, CORE-003, BI-050]
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

# DEPLOY-003 | eslint-10-upgrade

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-002]]

## 🎯 Goal

Assess and land the ESLint 9→10 major upgrade (Dependabot PR #4) so `npm run lint` passes clean on ESLint 10 with the repo's existing flat config and rule posture intact.

## ✅ Acceptance

- [x] ESLint 10 assessed against the *actual* dependency tree, not against peer-range inference — a probe that installs `eslint@10` and runs it over this repo's real sources with this repo's real config
- [x] The blocking package, the exact failure, and its upstream availability identified by name and version
- [x] Verdict recorded durably in this tasknote (not in the PLAN long description, which Phase 4 collapses to a stub)
- [x] `PLAN.md` reflects the verdict, and Dependabot PR #4's disposition is stated
- [x] Repo left on ESLint 9 with the full gate suite still green, **or** moved to ESLint 10 with it green — no half-landed upgrade

## 🧩 Subtasks

- [x] Read `package.json` + `eslint.config.mjs`; enumerate every ESLint plugin in the resolved tree and its declared `eslint` peer range
- [x] Read the ESLint 10 migration guide for the breaking changes that reach plugins
- [x] Probe `npm install` resolution with `eslint@^10.9.1`
- [x] Probe **runtime**: full install + real lint run over `app/`, `components/`, `lib/` with the repo's config
- [x] Isolate which plugin(s) actually fail, versus which merely carry stale peer ranges
- [x] Check upstream for a fixed release of the blocking plugin
- [x] Record the verdict and apply the `PLAN.md` disposition

## 🔗 Related

- [[DEPLOY-002]] — predecessor; Next 16 upgrade removed `@eslint/eslintrc`/FlatCompat, leaving `eslint.config.mjs` pure flat config (`depends-on:`)
- [[CORE-003]] — established the `.next-verify/` lint ignore in `eslint.config.mjs`
- [[BI-050]] — resolved the five `react-hooks@7` violations DEPLOY-002 suppressed
- [[DEPLOY-004]] — sibling Dependabot major (TypeScript 5→7); independent of this one

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** De-scope
  **Rationale:** The task reads "assess **and land**". The assess half ran to a
  definitive answer; the land half is impossible today for a reason wholly
  outside this repo. `eslint-plugin-react@7.37.5` — `latest`, and a transitive
  dependency of `eslint-config-next@16.3.3`, not a package this repo chose —
  hard-crashes under ESLint 10. Landing anyway would mean either a
  `patch-package` fork of a third-party plugin or switching off the whole
  `react/*` rule family; both trade a working lint gate for a version number.
  The assessment is the deliverable, and it is complete.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Upstream state.** `eslint` `latest` is **10.9.1** (10.0.0 shipped 2026-02-06;
10.9.1 on 2026-08-24). The repo is on `eslint@9.39.4` via `^9`. Dependabot PR
**#4** is `bump eslint from 9.39.4 to 10.8.0` — `package.json` +
`package-lock.json` only. Node here is v26.7.0, comfortably inside ESLint 10's
`^20.19.0 || ^22.13.0 || >=24` engines, so the runtime floor is a non-issue.

**Peer ranges — three plugins do not declare ESLint 10.** Enumerated across the
resolved tree:

| Package | How it arrives | `eslint` peer | Declares 10? |
|---|---|---|---|
| `eslint-config-next@16.3.3` | direct devDep | `>=9.0.0` | ✅ |
| `typescript-eslint@8.68.0` (+ `@typescript-eslint/*`) | via config-next | `^8.57.0 \|\| ^9 \|\| ^10` | ✅ |
| `eslint-plugin-react-hooks@7.1.1` | via config-next | `… \|\| ^9.0.0 \|\| ^10.0.0` | ✅ |
| `@next/eslint-plugin-next@16.3.3` | via config-next | *(none)* | n/a |
| `eslint-import-resolver-typescript@3.10.1` | via config-next | `*` | n/a |
| **`eslint-plugin-jsx-a11y@6.10.2`** | direct devDep **+** via config-next | `^3 … ^9` | ❌ |
| **`eslint-plugin-react@7.37.5`** | via config-next | `^3 … ^9.7` | ❌ |
| **`eslint-plugin-import@2.32.0`** | via config-next | `^2 … ^9` | ❌ |

For all three, the installed version **is** `latest` — there is no newer release
to move to. `npm install --package-lock-only` with `eslint@^10.9.1` therefore
fails hard: `ERESOLVE`, first blocker `eslint-plugin-jsx-a11y`.

**Peer ranges are not the finding, though — a runtime probe is.** A stale peer
range is a claim about what an author tested, not proof of breakage, so the
assessment was run empirically rather than inferred. Scratch probe: this repo's
`package.json` / `package-lock.json` / `eslint.config.mjs` / `tsconfig.json`
plus real copies of `app/`, `components/`, `lib/`, installed with
`--legacy-peer-deps` to force `eslint@10.9.1` in, then linted. Result:

```text
TypeError: Error while loading rule 'react/display-name':
  contextOrFilename.getFilename is not a function
    at resolveBasedir (eslint-plugin-react/lib/util/version.js:31:100)
    at detectReactVersion (…/version.js:85:19)
```

ESLint 10 removed the deprecated `context.getFilename()` (→ `context.filename`),
along with `getCwd`/`getSourceCode`/`getPhysicalFilename`/`parserOptions`/
`parserPath` and several `SourceCode` methods. `eslint-plugin-react`'s React
version detection calls the removed one unguarded, so the crash is at **rule
load**, not on any particular source line — nothing in this repo can be written
around it.

**The blocker is exactly one plugin, and it is not one of ours.** A second probe
re-ran the same install with every `react/*` rule programmatically set to `off`
(the crash is in that plugin's loader, so disabling its rules isolates it). ESLint
10 then linted the **entire repo clean** — 0 errors, 1 warning, and that warning
was `import/no-anonymous-default-export` firing correctly on the probe's own
config file. So:

- `eslint-plugin-jsx-a11y@6.10.2` — stale peer range, **works fine** on ESLint 10.
- `eslint-plugin-import@2.32.0` — stale peer range, **works fine** (demonstrably: it emitted a correct diagnostic).
- `eslint-plugin-react@7.37.5` — **genuinely broken**, sole blocker.

Two of the three ERESOLVE conflicts are false alarms. The third is real.

**No upstream fix exists.** `eslint-plugin-react` `latest` is 7.37.5 — the
installed version. Its only other dist-tag is `next: 7.8.0-rc.0`, which is
*older* than latest and not a candidate. And it is not a dependency this repo
elected: `eslint-config-next@16.3.3` declares
`eslint-plugin-react: "^7.37.0"`, so it arrives with the Next config, and
`eslint-config-next@canary` (16.4.0-canary.12) has not moved off it either.
Nothing to bump, nothing to wait a day for.

**Why the two workarounds were rejected rather than attempted.**
`--legacy-peer-deps` / `overrides` gets past `npm install` but not past the
crash — the probe proves the install succeeds and the lint run still dies. That
leaves (a) `patch-package` on a third-party plugin's internals, or (b) turning
off the whole `react/*` family. (a) is a fork this project would then own and
re-apply on every install; (b) silently drops real rules — the same
`react/*` set BI-040 and the `core-web-vitals` config deliberately rely on — to
gain a version number. Both make the lint gate weaker than it is today, which
inverts the point of upgrading the linter.

**Drift check.** The PLAN.md line's stated premise is accurate but turns out to
be beside the point. It reads: *"DEPLOY-002 already removed
`@eslint/eslintrc`/FlatCompat, so `eslint.config.mjs` is now pure flat config,
which should make this materially simpler."* True — `eslint.config.mjs` is
pure flat config, verified by reading it, and ESLint 10's total removal of
eslintrc would have been a blocker had DEPLOY-002 not landed first. But the
actual obstacle is a transitive plugin's use of a removed `context` method,
which the shim removal does not touch. The prediction inherited from
DEPLOY-002's assessment (archived note, line 113: *"An ESLint 10 bump is really
a question about that shim"*) is superseded by this task's measurement — the
same note's own §Maintainability effect had already narrowed it, and DEPLOY-002
could not have known, so this is a forecast overtaken by events rather than a
false factual claim about the repo. Per SPEC §"Tasknote frontmatter" that is
the *spec-evolution / superseded-decision* neighbourhood, **not** the ⚠️
superseded-claim carve-out — no pointer written into DEPLOY-002.

`eslint.config.mjs` otherwise needs no ESLint-10 work of its own: no
`/* eslint-env */` comments anywhere in the repo, no `radix` / `func-names` /
`no-invalid-regexp` options in play, and the config never spreads
`js.configs.recommended`, so ESLint 10's three new recommended rules
(`no-unassigned-vars`, `no-useless-assignment`, `preserve-caught-error`) do not
reach this repo.

**Archive skim** (`archive/deployment/`, plus `eslint.config.mjs` /
`package.json` hits across all areas):

- **`deployment/DEPLOY-002.md`** — load-bearing. Rewrote `eslint.config.mjs` off
  FlatCompat to native flat config, removed `@eslint/eslintrc`, and *deleted* an
  `overrides` block it characterised as a hand-maintained local pin standing in
  for a real dependency tree. That verdict is directly relevant: re-adding
  `overrides` here to force peers would re-open the debt DEPLOY-002 closed, for
  a workaround that does not even work.
- **`bi/BI-040.md`** — established `jsx-a11y/recommended` at error (34 rules,
  31-error/3-off). Unaffected: jsx-a11y runs clean on ESLint 10.
- **`core/CORE-003.md`** — moved lint off `next lint` to a bare `eslint`
  invocation. Means `npm run lint` is version-agnostic; no script change either way.
- **`bi/BI-050.md`** — resolved the five `react-hooks@7` disables DEPLOY-002 left.
  `eslint-plugin-react-hooks@7.1.1` already declares `^10.0.0`, so that work is
  not at risk here.
- **`bi/BI-001.md`** — origin of the explicit `.next/**` ignores (flat config does
  not auto-ignore dot-dirs). Still correct under 10.

**Clarifying questions.** One, and it is the whole decision this task turns on —
what to do with a "assess and land" task whose assessment says *don't land*.
Raised at the Phase 1→2 gate rather than assumed, since De-scope always fires it.

**Assumptions made explicit:** the repo stays on `eslint: "^9"`; the full gate
suite is expected to remain green because nothing in the working tree changes;
Dependabot PR #4 needs a disposition either way, since left alone it will keep
reappearing.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

The De-scope verdict makes the deliverable a recorded finding plus a disposition,
not a dependency bump. Three changes, no source touched.

**1. `.github/dependabot.yml`** (+10). An `ignore` entry holding `eslint` at
major 9:

```yaml
    ignore:
      - dependency-name: "eslint"
        update-types:
          - "version-update:semver-major"
```

**Pattern survey:** this file already carries the repo's convention of
*explaining a Dependabot decision in a comment at the site of the decision* —
BI-037's note on why the `github-actions` ecosystem is deliberately ungrouped.
The new entry extends that shape rather than inventing one: the comment names
the blocking package, the exact reason, why there is nothing to bump to, where
the measurement lives, and — critically — **the condition under which the entry
should be deleted** (DEPLOY-005 landing). An ignore rule with no removal
condition is how a temporary hold silently becomes permanent, and DEPLOY-002
had just finished removing a different hand-maintained pin for exactly that
reason.

Scoped to `eslint` alone and to majors alone: minors and patches on ESLint 9
still flow through the `patch-and-minor` group untouched, so the repo keeps
getting security and bugfix updates on its current major.

**2. `.flowtron/PLAN.md`.** DEPLOY-003 collapsed to the `Completed 2026-08-30.`
stub; **DEPLOY-005** filed in its place under `## Future Opportunities` as
`[light]🔧 eslint-10-revisit`. The follow-up line carries the unblock *check*
(`npm view eslint-plugin-react peerDependencies`) rather than a date, since the
gate is an upstream release with no announced schedule — and it reminds the
next runner to drop the dependabot ignore. Re-graded `[medium]🧩` → `[light]🔧`:
the assessment is done and recorded, so what remains is a bump-and-verify once
upstream moves.

**3. Dependabot PR #4** — commented with the measured finding and the two
rejected workarounds, then closed
([#4 comment](https://github.com/fakeneuron/blastimage/pull/4#issuecomment-5471806826)).
Closed rather than left open so the PR list reflects reality; the ignore entry
is what stops it re-raising weekly.

**Minimal refactor gate.** No refactor. `eslint.config.mjs` was read closely
during Discovery and deliberately **not** touched — it needs no ESLint-10
preparation (no `/* eslint-env */` anywhere in the repo, no affected rule
options, and it never spreads `js.configs.recommended`, so ESLint 10's three
new recommended rules do not reach it). Speculatively pre-adapting a config for
a version that cannot be installed would be exactly the future-proofing this
project avoids.

**Tests.** No test added, and deliberately so — the finding is about a third-party
package's behavior under a version this repo does not install, which no test in
this suite could observe. The evidence that belongs in version control is the
reproducible probe recipe, and it is recorded in Discovery Notes above: copy
`package.json` / `package-lock.json` / `eslint.config.mjs` / `tsconfig.json` and
the source dirs to a scratch dir, set `eslint` to `^10`, `npm install
--legacy-peer-deps`, run `eslint`. DEPLOY-005 re-runs that, it does not re-derive it.

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
| `npm run typecheck` | exit 0 |
| `npm test` | **31 files, 563 tests passed**, 6.21s |

Expected to be green — no source changed — and run anyway to prove the tree was
left in the state this task claims, not merely assumed to be.

**`dependabot.yml` structurally verified.** PyYAML is not available in this
environment, so the file was checked structurally instead of hand-waved: the new
`ignore:` key sits at the same 4-space indent as the existing `groups:` key
inside the same first update entry, and both the `dependency-name: "eslint"` and
`"version-update:semver-major"` lines match their expected indentation. This is
a syntax check, not a semantic one — GitHub validates Dependabot config
server-side, and the entry's real effect (no further ESLint-major PRs) shows up
on the next weekly run.

**The probe results are the substantive verification here**, and they are
recorded in Discovery Notes rather than repeated: ERESOLVE on
`npm install --package-lock-only`; the `react/display-name` crash on a forced
`eslint@10.9.1` install; and the clean full-repo lint once `react/*` is disabled,
which is what promotes "one plugin is broken" from a guess to a measurement.

**Quality assertions.** No duplication (one new config block, no analogue
elsewhere); no dead code; the added comment explains a non-obvious constraint at
its site with its removal condition, matching this file's existing BI-037
comment style; public surface unchanged; no stale code-facing documentation —
`eslint.config.mjs`'s DEPLOY-002 comments remain accurate, since nothing about
the flat-config rewrite was invalidated.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed per SPEC/tasknote-selection.md §"`## Completed` archive convention" (standalone → top of `## Completed`; epic child → kept nested beneath its active parent), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

**Doc-drift sweep** — `.flowtron/tasknote/README.md` §"AI-referenced docs", all four entries:

| Doc | Verdict |
|---|---|
| `README.md` | no change — no shipped feature surface moved |
| `AGENTS.md` | no change — no workflow or tooling contract moved; grepped, it names no ESLint version |
| `CLAUDE.md` | no change — its Stack section names Next 16 and the type-safety posture, neither of which this task touched; it makes no ESLint version claim |
| `.flowtron/PLAN.md` | **updated** — DEPLOY-003 stubbed to `Completed 2026-08-30.`, DEPLOY-005 filed under `## Future Opportunities` |

None of the three prose docs pins an ESLint version, so a held major creates no
drift in them. `.github/dependabot.yml` is not in the AI-referenced set but is
self-documenting at the change site.

---

**What happened, plainly.** DEPLOY-003 asked to assess and land ESLint 9→10. The
assessment came back **don't land** — and, unusually, with a single named cause
rather than a risk estimate. `eslint-plugin-react@7.37.5` crashes at rule load
under ESLint 10 (`contextOrFilename.getFilename is not a function`, in its React
version detection), because ESLint 10 removed the long-deprecated
`context.getFilename()`. That plugin is not one this repo chose: it arrives with
`eslint-config-next@16.3.3`, which declares `eslint-plugin-react: "^7.37.0"`.
7.37.5 **is** `latest`, and `eslint-config-next@canary` hasn't moved off it, so
there is nothing to bump to and nothing to wait a day for.

**The part worth keeping.** `npm` reports three peer conflicts, which reads like
a broad ecosystem lag. It isn't. A probe that force-installed `eslint@10.9.1`
over this repo's real config and sources, then disabled only the `react/*`
rules, linted the **entire repo clean** — 0 errors, and the one warning was
`import/no-anonymous-default-export` firing correctly. So
`eslint-plugin-jsx-a11y@6.10.2` and `eslint-plugin-import@2.32.0` carry stale
peer ranges but work fine; `eslint-plugin-react` is the sole real blocker. That
distinction is the difference between "ESLint 10 is far off" and "ESLint 10 is
one upstream release away", and it only shows up if you run it instead of
reading peer ranges.

**Changed** — 3 files, no source. `.github/dependabot.yml` (+10, an `eslint`
major-ignore whose comment names the blocker and its own deletion condition) ·
`.flowtron/PLAN.md` (+1/−1, DEPLOY-003 → `Completed` stub, DEPLOY-005 filed) ·
this tasknote. Plus one out-of-tree action: Dependabot PR #4 commented with the
finding and closed.

**Verification.** `npm run lint` exit 0 · `npm run typecheck` exit 0 · `npm test`
31 files / 563 tests passed. Run despite the untouched source to prove the tree
was left where this task says it was. `dependabot.yml` structurally verified
(indentation and key placement) since PyYAML wasn't available; GitHub validates
the semantics server-side.

**Refactors made or deferred.** None made. `eslint.config.mjs` was read closely
and deliberately left alone — it needs no ESLint-10 preparation (no
`/* eslint-env */` in the repo, no affected rule options, and it never spreads
`js.configs.recommended`, so ESLint 10's three new recommended rules don't reach
it). Pre-adapting a config for a version that cannot be installed is
speculative work this project doesn't do.

**Two workarounds rejected, with reasons.** `--legacy-peer-deps` / `overrides`
clears `npm install` but not the crash — proven, since the probe installed
successfully and the lint run still died. That leaves `patch-package` on a
third-party plugin's internals (a fork this project would then own and re-apply
forever) or disabling the whole `react/*` family (dropping real rules that
`core-web-vitals` and BI-040's posture rely on). Both trade a working lint gate
for a version number. Also declined: re-adding an `overrides` block, which
DEPLOY-002 had just deleted as precisely the kind of hand-maintained local pin
that hides the real dependency tree — reintroducing one for a workaround that
doesn't even work would have been the worst of both.

**One forecast corrected.** The PLAN line inherited DEPLOY-002's prediction that
an ESLint 10 bump was "really a question about that shim" (`FlatCompat`). The
shim removal was genuinely load-bearing — ESLint 10 deletes eslintrc support
entirely, so this would have been blocked twice over without it — but it wasn't
the obstacle. Recorded here rather than as a ⚠️ pointer on DEPLOY-002: that was
a forecast overtaken by events, not a false claim about the repo, which SPEC
§"Tasknote frontmatter" explicitly excludes from the superseded-claim carve-out.

**Maintainability effect.** Net positive despite shipping no upgrade. Before:
a weekly Dependabot PR nobody could merge and nobody could explain without
re-deriving why, against an open PLAN line whose stated premise was wrong. After:
the PR is closed with the measurement attached, the weekly noise is stopped by
an ignore rule that names its own removal condition, and DEPLOY-005 carries a
one-command unblock check (`npm view eslint-plugin-react peerDependencies`)
instead of a research task. The next runner bumps and verifies; they don't
repeat this investigation. The one debt added is the ignore entry itself — and
unlike the `overrides` block DEPLOY-002 removed, it suppresses a notification
rather than pinning a version, so it cannot silently distort the dependency tree.

**Archived:** 2026-08-30
