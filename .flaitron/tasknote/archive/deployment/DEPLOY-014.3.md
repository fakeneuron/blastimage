---
title: landing-dep-gates
status: completed
tags: []
created: 2026-10-18
due:
related-tasks: [DEPLOY-EPIC-014, DEPLOY-014.2, DEPLOY-011, DEPLOY-013]
touches:
  - .github/dependabot.yml
  - .github/workflows/ci.yml
  - README.md
---

# DEPLOY-014.3 | landing-dep-gates

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-014]]

## 🎯 Goal

Give `landing/` the same dependency gates the root app has: a `/landing` npm entry in `dependabot.yml` with `open-pull-requests-limit: 0`, and an `npm audit --omit=dev --audit-level=high` step in the CI landing job.

## ✅ Acceptance

- [x] `dependabot.yml` has an npm entry for directory `/landing` with `open-pull-requests-limit: 0` — `ruby -ryaml -e 'u=YAML.load_file(".github/dependabot.yml")["updates"].find{|e| e["directory"]=="/landing"}; exit(u && u["package-ecosystem"]=="npm" && u["open-pull-requests-limit"]==0 ? 0 : 1)'`
- [x] The CI landing job runs `npm audit --omit=dev --audit-level=high` — `ruby -ryaml -e 's=YAML.load_file(".github/workflows/ci.yml")["jobs"]["landing"]["steps"]; exit(s.any?{|x| x["run"]=="npm audit --omit=dev --audit-level=high"} ? 0 : 1)'`
- [x] The audit command passes against `landing/`'s lockfile — `npm --prefix /Users/fakeneuron/Code/blastimage/landing audit --omit=dev --audit-level=high`
- [x] Both YAML files still parse and the landing job's other steps are untouched — `git diff -U0 .github/workflows/ci.yml` shows additions only
- [ ] "landing job green" — not met: `judgment`; a CI run needs a push, which is never done without an explicit ask. The local audit (0 vulnerabilities) and YAML checks stand in; the first CI run after the operator pushes is the confirmation
- [x] README.md claims match the new config — `grep -q 'landing/. included' README.md`

## 🧩 Subtasks

- [x] Add the `/landing` npm entry to `.github/dependabot.yml` (limit 0, weekly, comment pointing at the root entry's policy)
- [x] Add an Audit step to the `landing` job in `.github/workflows/ci.yml`
- [x] Update the README.md:25-29 sentence that said "both ecosystems" and named only the main job
- [x] Run the full validation set and record the receipt

## 🔗 Related

- [[DEPLOY-EPIC-014]] — parent epic (upkeep-honesty)
- [[DEPLOY-014.2]] — reconciled the version-update-PR-off policy this entry repeats
- [[DEPLOY-011]] — added the `landing/` stack
- [[DEPLOY-013]] — added the CI landing job

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `.github/dependabot.yml` has only `directory: "/"` entries (npm + github-actions) and the `landing` job in `ci.yml` runs only Check and Build. `landing/package.json` + `package-lock.json` exist, so a `/landing` npm entry and an audit step both apply.

- [x] Read relevant source files — read `.github/dependabot.yml`, `.github/workflows/ci.yml`, `landing/package.json`, `justfile`.

- [x] **Best Practices Review** — `N/A`: config-only change, no module boundaries.

- [x] **Archive skim** — `archive/deployment/` (area per README table: `DEPLOY-*` → `deployment/`). Hits for `dependabot.yml`: DEPLOY-014.2 (comment reconcile; its "config unchanged apart from comments" criterion applied to that task only), DEPLOY-009.3. Load-bearing: the policy is version-update PRs off (`open-pull-requests-limit: 0`), security updates come from the repo setting; DEPLOY-014.5 arms that setting separately.

- [x] **Drift check** — PLAN line matches current files: `landing/` absent from `dependabot.yml`, no `npm audit` in the landing job. `npm audit --omit=dev --audit-level=high` against `landing/` currently reports 0 vulnerabilities, so adding the step will not turn the job red.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed (--unattended). Assumptions: the entry mirrors the root npm entry's `schedule: weekly` and limit 0 but not its `groups`/`ignore` (those are root-specific holds and PRs are off anyway); the audit step uses the job's existing `working-directory: landing` default and the same flags as the root job.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:** Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an existing pattern or justified a new shape

- [x] **Minimal refactor gate** — refactored only for Acceptance or touched-path coherence; deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — `N/A`: config only, verified by parsing the YAML

**Implementation Notes:** Pattern survey: mirrored the root npm entry's `schedule`/`open-pull-requests-limit`, and the root `ci` job's Audit step (same flags). No refactor. Added `/landing` npm entry to `.github/dependabot.yml`; Audit step after Build in the `landing` job (uses the job's `working-directory: landing`). README.md:25-29 said limit 0 "on both ecosystems" and named only the main job, which this change made stale, so it was updated.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) Visual confirmation — `N/A`: no rendered surface changed (CI/Dependabot config and a README sentence)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:** (`--unattended`: full validation set)
- `ruby -ryaml … /landing entry` → 0
- `ruby -ryaml … landing job audit step` → 0
- `npm --prefix landing audit --omit=dev --audit-level=high` → 0 (0 vulnerabilities)
- `git diff -U0 .github/workflows/ci.yml | grep -E '^-[^-]'` → 1 (no removed lines)
- `just test` → 0 (759 passed)
- `just lint` → 0 (astro check 0 errors; root eslint clean)
- `just typecheck` → 0
- `npm run build` not run: no source touched; CI Build step unchanged.
- External review: `N/A` — 13 additive config lines plus one README sentence, too small to grade; Acceptance verify commands decide each criterion mechanically.


## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: README.md updated (CI audit + Dependabot sentence); AGENTS.md, CLAUDE.md, PLAN.md, VISION.md, docs/* no change

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — `N/A`

**Final Summary:** Added a `/landing` npm entry (limit 0, weekly) to `.github/dependabot.yml` and an `npm audit --omit=dev --audit-level=high` step to the CI `landing` job; corrected the README sentence they made stale. `touches:` reconciled: diff = dependabot.yml, ci.yml, README.md (declared). Full validation set green locally. Not verified: the CI landing job itself has not run (needs a push, which was not asked for).
unattended-candidates: none (no deferred operator steps filed; DEPLOY-014.5 already covers arming Dependabot)


**Archived:** 2026-10-18
