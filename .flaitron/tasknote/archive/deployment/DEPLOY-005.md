---
title: eslint-10-natabula-config
status: completed
tags: []
created: 2026-10-08
due:
related-tasks: [DEPLOY-003]
touches:
  - package.json
  - package-lock.json
  - .github/dependabot.yml
  - eslint.config.mjs
---

# DEPLOY-005 | eslint-10-natabula-config

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-003]]

## 🎯 Goal

Move ESLint from 9 to 10 by dropping `eslint-config-next` and composing natabula's Next template config (`@next/eslint-plugin-next` core-web-vitals + `typescript-eslint` + `react-hooks` + `jsx-a11y`), which removes `eslint-plugin-react` — the ESLint 10 blocker — from the tree. Then drop the Dependabot `eslint` major-ignore.

## ✅ Acceptance

- [x] `package.json` pins `eslint` at `^10`, has no `eslint-config-next`, and the lockfile resolves ESLint 10 — `node -e "const p=require('./package.json'); if(!String(p.devDependencies.eslint).includes('10')||p.devDependencies['eslint-config-next']) process.exit(1)"` and `npm ls eslint --depth=0`
- [x] `eslint-plugin-react` is gone from the tree — `npm ls eslint-plugin-react; test $? -ne 0`
- [x] Lint is clean — `npm run lint`
- [x] No new disables: no added `eslint-disable` comments and no rule newly turned off beyond natabula's template shape — `git diff -U0 -- . ':!.flaitron' | grep -E '^\+.*eslint-disable'; test $? -ne 0`, plus a read of the `eslint.config.mjs` diff (`judgment`)
- [x] Dependabot no longer ignores ESLint majors — `grep -q 'dependency-name: "eslint"' .github/dependabot.yml; test $? -ne 0`
- [x] `eslint.config.mjs` no longer says ESLint stays on 9 — `grep -q 'ESLint stays on 9' eslint.config.mjs; test $? -ne 0`
- [x] Type-check still clean on the new install — `npm run typecheck`

## 🧩 Subtasks

- [x] Re-run the old unblock check and record the registry result (done 2026-10-08; superseded by the 2026-10-19 re-point)
- [x] `package.json`: `eslint` → `^10`; drop `eslint-config-next`; add `@next/eslint-plugin-next` `^16`, `eslint-plugin-react-hooks` `^7`; add the `overrides` block for `eslint-plugin-jsx-a11y` (stale `^9` peer — natabula STACK-TENDENCIES §Frontend); regenerate `package-lock.json`
- [x] Rewrite `eslint.config.mjs` on natabula's `templates/nextjs/eslint.config.mjs` shape, keeping this repo's ignores, `--max-warnings 0`, test-file `require-await` carve-out and the BI-040 a11y promotion
- [x] Fix only what the ESLint 10 lint run requires, with no new disables
- [x] Delete the `eslint` semver-major ignore in `.github/dependabot.yml` (leave the `typescript` and `@types/node` ignores)

## 🔗 Related

- [[DEPLOY-003]] — predecessor; measured the ESLint 10 blocker (`eslint-plugin-react` crashes at rule load)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Re-scope
  **Rationale:** The named unblock check still fails. `eslint-plugin-react@latest` is 7.37.5 and its `eslint` peer is still `^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7`. There is no PLAN task to cite, so no `Blocked by [[ID]]` clause was added. The only plan edit is the check date (2026-09-10 → 2026-10-08).

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  N/A for a code-boundary review this session: Phase 2 does not start while the peer gate fails. When it does, the change extends DEPLOY-003's hold (drop that `eslint` ignore, bump the `^9` pin) and leaves the sibling `typescript` and `@types/node` ignores alone.

- [x] **Archive skim** — skim `.flaitron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed. Assumptions: do not force ESLint 10 with `--legacy-peer-deps` or by turning `react/*` off — DEPLOY-003 already measured that workaround and filed this task to wait for a real plugin release. The unblock signal is the `latest` peer range, not the `next` dist-tag. No `Blocked by [[ID]]`, because the blocker is an upstream package, not a PLAN task.

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

Area confirmed against `.flaitron/tasknote/README.md`: `DEPLOY-*` → `archive/deployment/` (18 prior notes; this ID is not among them).

**Unblock check (2026-10-08).** `npm view eslint-plugin-react version peerDependencies` → `7.37.5`, peer `eslint: ^3 || ^4 || ^5 || ^6 || ^7 || ^8 || ^9.7`. `eslint` `latest` is `10.12.0`. Installed tree: `eslint@9.39.5`, `eslint-plugin-react@7.37.5` via `eslint-config-next@16.3.5`. `eslint-config-next@16.4.0` (`latest`) and `16.5.0-canary.3` both still depend on `eslint-plugin-react@^7.37.0`. The `next` dist-tag `7.8.0-rc.0` is an old release candidate whose peer is `^3.0.0 || ^4.0.0` — not an ESLint 10 preview.

**Drift.** `package.json` still has `"eslint": "^9"`. `.github/dependabot.yml` still ignores `eslint` semver-majors and points at `archive/deployment/DEPLOY-003.md` and "Drop this entry when DEPLOY-005 lands." `eslint.config.mjs:16` still says "ESLint stays on 9: DEPLOY-005". The `context.getFilename` crash was not re-run: the peer gate failed first, and DEPLOY-003 says this task re-runs that probe when the gate opens rather than re-deriving it. Non-material movement since the 2026-09-10 check: installed ESLint 9.39.4 → 9.39.5, registry ESLint 10.9.1 → 10.12.0, `eslint-config-next` in tree 16.3.3 → 16.3.5. Same blocker.

**Archive (load-bearing).** DEPLOY-003 de-scoped the upgrade, added the Dependabot ignore, and filed this row. Its probe: `eslint-plugin-jsx-a11y` and `eslint-plugin-import` have stale peers but run on ESLint 10; `eslint-plugin-react@7.37.5` crashes at rule load; with `react/*` off, ESLint 10 lints this repo clean. DEPLOY-002 already moved `eslint.config.mjs` to native flat config. DEPLOY-004 copied the hold shape for TypeScript (DEPLOY-006). DEPLOY-009.3 added the `@types/node` ignore in the same shape and left the eslint/typescript holds in place. No supersede pointer on those notes.

**Plan cross-check (2026-10-08).** The Future Opportunities line is still the same retry. SPEC §"Blocked tasks" wants `Blocked by [[ID]]` only for another task. None exists, so the line keeps its prose blocker and the refreshed check date. Phase 2 does not start.

**Resume reconcile (2026-10-19).** The PLAN row was re-pointed (natabula NAT-441 ruling, STACK-TENDENCIES §Frontend "`eslint-config-next` still holds a repo at ESLint 9"): stop waiting for upstream and compose `@next/eslint-plugin-next` directly, as natabula's `templates/nextjs/eslint.config.mjs` does. Goal, Acceptance and Subtasks above are rewritten to match; the 2026-10-08 Discovery stands as history. Park cleared (`drift`); resumed at Phase 2. Registry facts at resume: `eslint-plugin-react-hooks@7.1.1` and `typescript-eslint@8.72.0` already allow ESLint 10; `eslint-plugin-jsx-a11y@6.10.2` still caps at `^9` (hence natabula's `overrides` block); `@next/eslint-plugin-next` is already in the tree transitively (16.3.5). ESLint 10 needs Node `^20.19 || ^22.13 || >=24`; CI uses Node 22 and this machine 26, while `engines.node` stays `>=20.9` (runtime floor for Next — left alone).

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Pattern: natabula `templates/nextjs/eslint.config.mjs` (sibling repo, STACK-TENDENCIES §Frontend) taken as the shape, keeping this repo's ignores, test-file `require-await` carve-out, `caughtErrors` pin and `--max-warnings 0`. `package.json`: `eslint ^10`, `-eslint-config-next`, `+@next/eslint-plugin-next ^16`, `+eslint-plugin-react-hooks ^7`, plus natabula's `overrides` for `eslint-plugin-jsx-a11y` (its `^9` peer is stale metadata). `typescript-eslint` `recommendedTypeChecked` replaces next's `typescript` preset + `recommendedTypeCheckedOnly`; `jsxA11y.flatConfigs.recommended` is now registered whole instead of rules-only. No `globals` dep added (lint needs none). Dependabot `eslint` ignore deleted. No code changes were required — lint was clean on first run. Tests: none added; the change is tooling config, verified by running the linter.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Verification receipt (Acceptance commands):
- package.json check (`eslint` ^10, no `eslint-config-next`) → exit 0; `npm ls eslint --depth=0` → `eslint@10.13.0`, exit 0
- `npm ls eslint-plugin-react; test $? -ne 0` → empty tree, exit 0
- `npm run lint` → exit 0 (baseline on ESLint 9 was also exit 0)
- `git diff -U0 -- . ':!.flaitron' | grep -E '^\+.*eslint-disable'; test $? -ne 0` → exit 0; config diff read: nothing turned off, no new disables
- dependabot `eslint` ignore grep / `ESLint stays on 9` grep (both `test $? -ne 0`) → exit 0
- `npm run typecheck` → exit 0; `npm test` → 764 passed
- Rules are live: a seeded probe file (since deleted) fired `@typescript-eslint/no-floating-promises`, `no-unsafe-*`, `react-hooks/rules-of-hooks`, `jsx-a11y/alt-text`, `@next/next/no-img-element`, `@next/next/no-sync-scripts`.
- 👁️ CONFIRM: N/A — no rendered surface (tooling config only).

External review (`/code-review medium`, scoped to this diff) — 8 findings, 0 blockers, all notes:
- Lost `eslint-plugin-react` rules (`react/jsx-key`, `no-unescaped-entities`, `jsx-no-target-blank`, …) → accepted: removing that plugin is the point of the NAT-441 ruling and natabula's template carries none of them either. Recorded here as the cost.
- Lost `import/*` rules and the non-TS parser setup; hooks/a11y now scoped to `**/*.{ts,tsx}` → no impact: the only non-TS lintable files are `eslint.config.mjs` and `postcss.config.mjs` (`git ls-files`); scoping matches the template.
- `recommended-latest` react-hooks brings the React Compiler rules → matches the template; repo lints clean under them with no disables.
- `overrides` block undocumented in `package.json` (JSON has no comments) → rationale is in this note and natabula STACK-TENDENCIES §Frontend; delete it once `eslint-plugin-jsx-a11y` widens its peer past `^9`.
- `^16` / `^7` floors looser than neighbours → matches the template; the lockfile pins the installed versions.
- Stale `eslint-config-next` wording in the retained `typescript` Dependabot comment → left for DEPLOY-006, which owns re-measuring that hold.
- Preset applies to the `.mjs` configs → same as the template; harmless under the App Router.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** (no change: README, AGENTS.md, VISION.md and the `docs/` set name no ESLint config; PLAN.md updated below) — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — N/A: the lasting facts (natabula template shape, jsx-a11y `overrides` removal condition) live in natabula STACK-TENDENCIES §Frontend and this note.

**Final Summary:**

ESLint is now 10.13.0. `eslint-config-next` is dropped and `eslint.config.mjs` composes `@next/eslint-plugin-next` (core-web-vitals), `typescript-eslint` `recommendedTypeChecked`, `eslint-plugin-react-hooks` and `eslint-plugin-jsx-a11y` on natabula's Next template shape, which removes `eslint-plugin-react` from the tree. `npm run lint` is clean with no new disables and no source changes were needed; typecheck and the 764 tests pass. The Dependabot `eslint` major-ignore is gone. Cost: the `react/*` and `import/*` rules that came with `eslint-config-next` no longer run. DEPLOY-006's retained Dependabot comment still names `eslint-config-next` and should be re-measured there.

**Archived:** 2026-10-19
