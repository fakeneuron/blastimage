---
title: typescript-7-revisit
status: blocked
park-reason: drift — typescript-eslint@8.72.0 peer still stops below TS 6.1 (>=4.8.4 <6.1.0) and no stable TS 7.1 exists. Rechecked 2026-10-19.
tags: []
created: 2026-10-19
due:
related-tasks: [DEPLOY-004, DEPLOY-005]
touches:
  - package.json
  - package-lock.json
  - .github/dependabot.yml
---

# DEPLOY-006 | typescript-7-revisit

[← PLAN.md](../PLAN.md) · ⏸ Blocked · 🔗 [[DEPLOY-004]] · [[DEPLOY-005]]

## 🎯 Goal

Upgrade TypeScript from 5 to 7 once `typescript-eslint` supports TS 7 (the 7.1 compiler API), and drop the TypeScript major-ignore from Dependabot.

## ✅ Acceptance

- [ ] Unblock check passes before any bump: `typescript-eslint@latest` declares a TS 7 range — `npm view typescript-eslint@latest peerDependencies --json`
- [ ] `package.json` pins `typescript` at `^7` and the lockfile resolves TS 7 — `node -e "const p=require('./package.json'); if(!String(p.devDependencies.typescript).includes('7')) process.exit(1)"` and `npm ls typescript --depth=0`
- [ ] Repo lint is clean on that install (config loads, no `does not support TS 7.0`) — `npx eslint .`
- [ ] Type-check and build are clean — `npx tsc --noEmit` and `npm run build`
- [ ] Dependabot no longer ignores TypeScript majors — `grep -q 'dependency-name: "typescript"' .github/dependabot.yml; test $? -ne 0`

## 🧩 Subtasks

- [x] Re-run the named unblock check (`npm view typescript-eslint peerDependencies`) and record the registry result
- [ ] When `latest` allows TS 7: set `typescript` to `^7`, regenerate `package-lock.json`, and re-run DEPLOY-004's install/lint/build probe (do not re-derive it)
- [ ] Fix only what the TS 7 lint, type-check, and build runs require
- [ ] Delete the `typescript` semver-major ignore in `.github/dependabot.yml` (leave the `eslint` and `@types/node` ignores unless DEPLOY-005 has already removed the first)

## 🔗 Related

- [[DEPLOY-004]] — predecessor; measured the TS 7 blockers (`tsc` / `next build` clean on 7.0.2; typescript-eslint config-load throw; dual-install vs Next 16.3.3)
- [[DEPLOY-005]] — sibling revisit with the same shape (ESLint 9→10); both edit the same Dependabot `ignore` block

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Re-scope
  **Rationale:** The named unblock check still fails. `typescript-eslint@latest` is 8.72.0 and its `typescript` peer is still `>=4.8.4 <6.1.0`. There is no PLAN task to cite, so no `Blocked by [[ID]]` clause was added. The only plan edit is the check date (2026-09-10 → 2026-10-19). Parked as `drift` rather than deleted, matching DEPLOY-005, so the acceptance list and the blocker facts survive for the next recheck.

- [x] Read relevant source files

  `package.json` (`typescript ^5`, `typescript-eslint ^8.70.1`), `.github/dependabot.yml`, `eslint.config.mjs` (imports `typescript-eslint` and `eslint-config-next/typescript`; no TS-version sentence to update).

- [x] **Best Practices Review**

  N/A: Phase 2 does not start while the peer gate fails. When it does, the change extends DEPLOY-004's hold (bump the `^5` pin, drop that `typescript` ignore) and leaves the sibling ignores alone.

- [x] **Archive skim**

  `archive/deployment/` confirmed against the README table (`DEPLOY-*` → `archive/deployment/`). Load-bearing hit: DEPLOY-004 (measured the blockers, added the Dependabot hold, filed this row). No supersede pointer.

- [x] **Drift check**

  `package.json`, `.github/dependabot.yml`, and the PLAN.md line all match what the PLAN row describes. The Dependabot comment still says "Drop this entry when DEPLOY-006 lands."

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed (--fast). Assumptions: do not force TS 7 with `--legacy-peer-deps` or the dual-install workaround — DEPLOY-004 already measured both and filed this task to wait for a real typescript-eslint release. The unblock signal is `latest`'s peer range, not a canary or `next` dist-tag. No `Blocked by [[ID]]`, because the blocker is an upstream package, not a PLAN task.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:**

**Unblock check (2026-10-19).** `npm view typescript-eslint version peerDependencies` → `8.72.0`, peer `typescript: >=4.8.4 <6.1.0`. Dist-tags: `latest` 8.72.0, `canary` 8.71.3-alpha.17, `rc-v8` 8.0.0-alpha.62 (an old alpha, not a TS 7 build). `typescript` dist-tags: `latest` 7.0.2, `rc` 7.0.1-rc, `next` 7.1.0-dev.20261019.1 — still no stable 7.1. Installed tree: `typescript@5.9.3`, `typescript-eslint@8.70.1`, `eslint-config-next@16.3.5` (`latest` is 16.4.2, which depends on `typescript-eslint@^8.56.0`), `next@16.3.8`.

**Drift.** Same blocker as the 2026-09-10 check. Non-material movement: typescript-eslint 8.70.0 → 8.72.0, TS 7.1 now has a nightly (`7.1.0-dev.20261019.1`) but no stable release. The config-load throw and Next dual-install failure were not re-run: the peer gate failed first, and DEPLOY-004 is the probe to re-run when it opens.

**Plan cross-check.** The Future Opportunities line is still the same retry. SPEC §"Blocked tasks" wants `Blocked by [[ID]]` only for another task. None exists, so the line keeps its prose blocker and the refreshed check date. Phase 2 does not start.

## 🛠️ Phase 2: Execution

- [ ] **Pattern survey** — extended an existing pattern or justified a new shape

- [ ] **Minimal refactor gate** — refactored only for Acceptance or touched-path coherence; deferred unrelated cleanup

- [ ] Implemented the minimal solution

- [ ] Updated/added tests for non-trivial behavior

**Implementation Notes:**

## 🧪 Phase 3: Testing & Linting

- [ ] Ran targeted test suite for changed code

- [ ] Ran lint/type-check on changed code

- [ ] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [ ] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [ ] (frontend) Asked the user for visual confirmation (`👁️ **CONFIRM**` on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

## 🚀 Phase 4: Closure

- [ ] **Doc-drift sweep** — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: "no change" or the update

- [ ] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [ ] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [ ] **Learnings** — anything the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

**Archived:** YYYY-MM-DD
