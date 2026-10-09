---
title: eslint-10-revisit
status: blocked
park-reason: drift — eslint-plugin-react@7.37.5 peer still stops at ESLint 9 (^9.7). Rechecked 2026-10-08.
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

# DEPLOY-005 | eslint-10-revisit

[← PLAN.md](../PLAN.md) · ⏸ Blocked · 🔗 [[DEPLOY-003]]

## 🎯 Goal

Upgrade ESLint from 9 to 10 once `eslint-plugin-react` allows it, and drop the ESLint major-ignore from Dependabot.

## ✅ Acceptance

- [ ] Unblock check passes before any bump: `npm view eslint-plugin-react peerDependencies` declares an ESLint 10 range on `latest` — `npm view eslint-plugin-react@latest peerDependencies --json`
- [ ] `package.json` pins `eslint` at `^10` and the lockfile resolves ESLint 10 — `node -e "const p=require('./package.json'); if(!String(p.devDependencies.eslint).includes('10')) process.exit(1)"` and `npm ls eslint --depth=0`
- [ ] Repo lint is clean on that install — `npx eslint .`
- [ ] Dependabot no longer ignores ESLint majors — `grep -q 'dependency-name: \"eslint\"' .github/dependabot.yml; test $? -ne 0`
- [ ] `eslint.config.mjs` no longer says ESLint stays on 9 — `grep -q 'ESLint stays on 9' eslint.config.mjs; test $? -ne 0`

## 🧩 Subtasks

- [x] Re-run the named unblock check (`npm view eslint-plugin-react peerDependencies`) and record the registry result
- [ ] When `latest` allows ESLint 10: set `eslint` to `^10`, regenerate `package-lock.json`, and re-run DEPLOY-003's install-and-lint probe (do not re-derive it)
- [ ] Fix only what the ESLint 10 lint run requires
- [ ] Delete the `eslint` semver-major ignore in `.github/dependabot.yml` (leave the `typescript` and `@types/node` ignores)
- [ ] Update the ESLint-9 sentence in `eslint.config.mjs`

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

**Plan cross-check.** The Future Opportunities line is still the same retry. SPEC §"Blocked tasks" wants `Blocked by [[ID]]` only for another task. None exists, so the line keeps its prose blocker and the refreshed check date. Phase 2 does not start.

## 🛠️ Phase 2: Execution

- [ ] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [ ] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [ ] Implemented the minimal solution

- [ ] Updated/added tests for non-trivial behavior

**Implementation Notes:**

## 🧪 Phase 3: Testing & Linting

- [ ] Ran targeted test suite for changed code

- [ ] Ran lint/type-check on changed code

- [ ] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [ ] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [ ] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

## 🚀 Phase 4: Closure

- [ ] **Doc-drift sweep** — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [ ] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [ ] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [ ] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

**Archived:** YYYY-MM-DD
