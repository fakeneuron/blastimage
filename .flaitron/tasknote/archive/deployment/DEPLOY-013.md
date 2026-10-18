---
title: landing-ci
status: completed
tags: []
created: 2026-10-18
due:
related-tasks: [DEPLOY-011]
touches:
  - .github/workflows/ci.yml
  - landing/README.md
---

# DEPLOY-013 | landing-ci

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-011]]

## 🎯 Goal

Add a `landing` job to `.github/workflows/ci.yml` that runs `npm ci`, `npm run check`, and `npm run build` in `landing/`, so a broken `brand/BRAND.md` or a moved brand asset fails CI instead of surfacing at `wrangler` publish time.

## ✅ Acceptance

- [x] `ci.yml` has a `landing` job whose steps run `npm ci`, `npm run check`, and `npm run build` with `working-directory: landing` — `grep -nE 'working-directory: landing' .github/workflows/ci.yml`
- [x] The workflow file is valid YAML — `ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml")'` (or `python3 -I -c` equivalent)
- [x] The job's commands pass locally against the committed tree — `npm --prefix landing ci && npm --prefix landing run check && npm --prefix landing run build`
- [x] The job checks out the whole repo (the landing reads `../brand/`) and caches npm on `landing/package-lock.json` — `judgment` (read of the job in the diff)

## 🧩 Subtasks

- [x] Add a `landing` job to `.github/workflows/ci.yml` beside `ci` / `secrets` / `e2e`, matching their checkout / setup-node@v7 shape
- [x] Run the three landing commands locally and record the receipt
- [x] Update `landing/README.md` line 21 so it no longer implies CI never builds landing
- [x] Doc-drift sweep of the AI-referenced docs

## 🔗 Related

- [[DEPLOY-011]] — predecessor; created the `landing/` Astro page that CI never builds

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `ci.yml` has `ci`, `secrets`, `e2e` jobs and none touches `landing/`; DEPLOY-011's own Discovery Notes flagged "no CI job builds/checks landing". Landing reads `../brand/BRAND.md` and `brand/assets.json` at build time, so a brand-field edit can break it silently. Plan line matches the SPEC and current files; no blocker.

- [x] Read relevant source files — `.github/workflows/ci.yml`, `landing/package.json` (`check` = `astro check`, `build` = `astro build`, astro ^7.4.0), `landing/README.md`, `justfile` landing recipes, `.github/dependabot.yml`, `AGENTS.md` landing paragraph.

- [x] **Best Practices Review** — N/A beyond pattern fit: a new sibling job, no module boundaries touched.

- [x] **Archive skim** — `ls .flaitron/tasknote/archive/deployment/` (README maps `DEPLOY-*` → `archive/deployment/`); `grep -l 'ci.yml\|landing'` hits DEPLOY-003/004/011/012. Load-bearing: DEPLOY-011 (created `landing/`; its Discovery Notes name this gap, and it states the root gates skip landing). DEPLOY-003/004 only mention landing in dependabot-ignore context. No prior tasknote added a landing CI job.

- [x] **Drift check** — PLAN line matches `ci.yml` (no landing job) and `landing/package.json` scripts (`check`, `build`). `landing/package-lock.json` is tracked, so `npm ci` and `cache-dependency-path: landing/package-lock.json` are valid. `landing/README.md` line 21 says root gates "which CI runs" skip landing — still true, but incomplete once the job lands (doc drift to fix at Phase 2).

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed (--unattended). Assumptions: sibling job named `landing` in the existing style (checkout@v7, setup-node@v7 Node 22, npm cache); full checkout (not sparse) since landing imports `../brand/`; no `fetch-depth: 0` (the coverage gate is `ci`-only); no change to `ci`/`e2e`/`secrets`; dependabot `landing/` coverage is out of scope.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:**

Discovery surfaced no significant deviation, so the 🛠️ gate is skipped. Phase 1 Discovery is complete; entering Phase 2 Execution.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an existing pattern or justified a new shape

- [x] **Minimal refactor gate** — refactored only for Acceptance or touched-path coherence; deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

Pattern survey: extended the existing sibling-job shape (`secrets`, `e2e`) — checkout@v7, setup-node@v7 Node 22, npm cache keyed on the stack's own lockfile. Used `defaults.run.working-directory: landing` so the three steps stay plain `npm ci` / `npm run check` / `npm run build`. Full checkout (landing imports `../brand/`); no `fetch-depth: 0` (changed-line coverage gate is `ci`-only). `landing/README.md` line 21 now says CI's `landing` job runs `check` and `build`. No refactor; no tests (a workflow file has no unit surface — the job's commands are the verification).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) Asked the user for visual confirmation — N/A: no rendered surface changed (CI workflow + one README sentence)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Receipt (full validation set per `--unattended`; justfile recipes):

- `grep -nE 'working-directory: landing' .github/workflows/ci.yml` → exit 0 (line 139)
- `ruby -ryaml -e 'YAML.load_file(".github/workflows/ci.yml")'` → exit 0; jobs: ci, secrets, landing, e2e
- `npm --prefix landing ci && npm --prefix landing run check && npm --prefix landing run build` → exit 0
- `just test` → exit 0 (33 files, 687 tests)
- `just lint` → exit 0 (root eslint + `astro check`: 0 errors / 0 warnings / 0 hints)
- `just typecheck` → exit 0
- `npm --prefix landing run check` → exit 0; `npm --prefix landing run build` → exit 0

Not run locally: the GitHub Actions job itself (needs a push; push needs an explicit operator ask). Its three commands ran green locally from the same `landing/` working directory.

External review (`/code-review medium`, scoped to the working-tree diff) — no blockers; five notes, dispositions:

- No `permissions:` block on the job → note, not adopted: the sibling `ci` and `e2e` jobs set none either; consistency kept. Operator may tighten all three together.
- Brand inputs might be untracked/gitignored/LFS → checked: `git ls-files brand` lists BRAND.md, assets.json, logo.svg, favicon.svg, promo-16x9.webp; `git check-ignore` matches none. Not an issue.
- No `paths:` filter → note, not adopted: it would break a required-status check on skipped runs, and the job takes seconds.
- README claim that `just lint` might not run `astro check` → false; `justfile` `lint` recipe runs `cd landing && npm run check`. No change.
- No `timeout-minutes` → note, not adopted: `ci` has none either; only `e2e` (Chromium) does.

None reopens a phase; none filed (all are consistency or taste choices across the existing jobs, not defects this task introduced).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: "no change" or the update

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — anything the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

Added a `landing` job to `.github/workflows/ci.yml` (`npm ci` → `npm run check` → `npm run build` in `landing/`, full checkout, npm cache on `landing/package-lock.json`) and updated `landing/README.md` line 21 to say so. Full validation set green locally (`just test` / `lint` / `typecheck`, plus the landing check and build). Doc-drift sweep: AI-referenced docs — no change (`README.md` and `AGENTS.md` only describe landing as a separate stack, still true). `touches:` reconciliation: declared `.github/workflows/ci.yml`, `landing/README.md`; `git diff --name-only` matches. Learnings: N/A. Deferred operator steps: none. unattended-candidates: none.

**Archived:** 2026-10-18
