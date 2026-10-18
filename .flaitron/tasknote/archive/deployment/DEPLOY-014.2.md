---
title: dependabot-claim-reconcile
status: completed
tags: []
created: 2026-10-18
due:
related-tasks: [DEPLOY-EPIC-014, BI-037, DEPLOY-009.3]
touches:
  - README.md
  - .github/dependabot.yml
---

# DEPLOY-014.2 | dependabot-claim-reconcile

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-014]]

## 🎯 Goal

Make the README and the `dependabot.yml` BI-037 comment say what the config does: version-update PRs are off by policy (`open-pull-requests-limit: 0`), and security updates come from the repo setting, not from this file.

## ✅ Acceptance

- [x] No claim of weekly Dependabot PRs remains in README.md — `! grep -n -i 'weekly' README.md`
- [x] README states version-update PRs are off by policy and security updates come from the repo setting — `grep -q 'off by policy' README.md && grep -q 'security updates, once enabled' README.md`
- [x] The BI-037 comment in `.github/dependabot.yml` no longer describes PRs Dependabot raises — `! grep -n 'nearly every update Dependabot raises' .github/dependabot.yml`
- [x] The config is unchanged apart from comments — `git diff -U0 .github/dependabot.yml | grep -E '^[+-]' | grep -vE '^(\+\+\+|---)' | grep -vE '^[+-] *#'` prints nothing
- [x] Doc-drift sweep across README §"AI-referenced docs" recorded — `judgment` (no command decides which docs drifted)

## 🧩 Subtasks

- [x] Rewrite the README.md:25-28 sentence (version-update PRs off by policy; security updates from the repo setting)
- [x] Rewrite the BI-037 comment on the github-actions entry in `.github/dependabot.yml`
- [x] Run the repo's full validation set and record the receipt

## 🔗 Related

- [[DEPLOY-EPIC-014]] — parent epic (upkeep-honesty)
- [[DEPLOY-014.5]] — operator step that arms the security-update repo setting this wording relies on
- [[BI-037]] — added the github-actions ecosystem and its comment
- [[DEPLOY-009.3]] — dependabot-backlog-triage; last touched the config

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** `.github/dependabot.yml` sets `open-pull-requests-limit: 0` on both ecosystems (commit 8c70e57), while README.md:25-28 still said "weekly npm and GitHub Actions PRs" and the BI-037 comment said "nearly every update Dependabot raises here is a major". Both claims were false.

- [x] Read relevant source files — `README.md` 15-40, `.github/dependabot.yml`, natabula `docs/STACK-TENDENCIES.md` §"Dependency updates" (the policy the PLAN row cites)

- [x] **Best Practices Review** — N/A: docs and comment text only, no code or module boundary touched

- [x] **Archive skim** — `archive/deployment/` is the README row for `DEPLOY-*`; `grep -il dependabot` over the archive hits DEPLOY-002, DEPLOY-009.3, DEPLOY-010.3, DEPLOY-013, TEST-006. None restates the weekly-PR claim as a contract. DEPLOY-009.3 triaged the backlog and DEPLOY-002 closed a Dependabot PR; nothing there conflicts with a wording change. BI-037 / BI-034.4 sit in PLAN-ARCHIVE.md (the comment's origin).

- [x] **Drift check** — PLAN row cites README.md:25-28; the sentence was at README.md:25-28 as cited. `dependabot.yml` has `open-pull-requests-limit: 0` on both entries as cited. STACK-TENDENCIES §"Dependency updates" confirms security-only policy (NAT-230) and that security updates are a per-repo GitHub setting. No drift. Other files mentioning Dependabot: only the ignore-hold comments in `dependabot.yml` (about majors held, still true as config) and DEPLOY-005/006 rows; left alone.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed (--unattended). Assumptions: the grouping and ignore entries stay as config (the PLAN row says keep the config); the README says security updates come from the repo setting without claiming it is on, since DEPLOY-014.5 (open, operator) is what arms it; wording stays in the README's existing sentence style.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared

**Discovery Notes:** Discovery surfaced no significant deviation → skip 🛠️. The BI-037 comment is the one above the github-actions entry (`# Workflow action pins …`). The two ignore-hold comment blocks above it describe majors held back and are not claims of weekly PRs, so they stay.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an existing pattern: edited the existing README paragraph and the existing comment in place; no new file or shape.

- [x] **Minimal refactor gate** — no refactor; the README paragraph was re-wrapped only because the edit changed its line lengths.

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A: docs and YAML comments only, no behavior.

**Implementation Notes:** README now says version-update PRs are off by policy (`open-pull-requests-limit: 0` on both ecosystems) and that security updates, once enabled, come from the repo's Dependabot setting (Settings → Code security), not from `dependabot.yml`. The BI-037 comment now says the same and notes the weekly schedule opens nothing at limit 0. The `interval: "weekly"` config line stays, per "keep the config". After the external review the README gained "once enabled" (the setting is still off until DEPLOY-014.5), and the comment now names the key instead of "as above".

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A: no code changed; the full set ran instead (below).

- [x] Ran lint/type-check on changed code — full set under `--unattended`, below.

- [x] **Verification receipt** — see Testing Notes. Changed text free of duplication, dead code, and stale docs.

- [x] **External review** — `/code-review medium` on the working-tree diff; five findings graded in Testing Notes.

- [x] (frontend) Asked the user for visual confirmation — N/A: no rendered surface changed (README and YAML comments only).

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Verification receipt (`--unattended` runs the full set: `justfile` recipes exist):

- `just test → 0` (35 files, 759 tests passed)
- `just lint → 0` (root eslint; landing `astro check` 0 errors)
- `just typecheck → 0`
- `! grep -n -i 'weekly' README.md → 0`
- `grep -q 'off by policy' README.md && grep -q 'security updates, once enabled' README.md → 0`
- `! grep -n 'nearly every update Dependabot raises' .github/dependabot.yml → 0`
- non-comment diff lines in `.github/dependabot.yml` → none (config unchanged)

External review (`/code-review medium`, scoped to the working-tree diff), dispositions:

- README said security updates "come from the repo setting" without saying it may be off (note) — fixed: "once enabled".
- `dependabot.yml` comment kept `interval: weekly` unexplained (note) — fixed: comment says the weekly schedule opens nothing at limit 0.
- "limit 0, as above" pointed at a distant entry (note) — fixed: names `open-pull-requests-limit: 0` on both entries. The reviewer did not read the npm-section comments; I did: they describe majors held back and make no claim about PRs raised.
- Acceptance 2's grep was weak (note) — fixed: now requires both 'off by policy' and 'security updates, once enabled'.
- Acceptance 5 and the receipt were unrecorded at review time (note) — a timing artifact of reviewing mid-run; recorded here and in Phase 4.

No blockers.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: README.md updated (the task itself); AGENTS.md, CLAUDE.md, `.flaitron/PLAN.md`, VISION.md, docs/ADOPT.md, docs/WORKFLOW.md, docs/REVIEW-LOOP.md, docs/GROK-AGENT.md: no change (`grep -i dependabot` finds no Dependabot claim in them; PLAN.md rows DEPLOY-005/006 describe the ignore entries, which still exist).

- [x] Closed — Acceptance ticked, YAML `status: completed`, PLAN.md line → `Completed 2026-10-18.` stub (epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/deployment/`

- [x] **Evidence-based recap** drafted — changed files: `README.md`, `.github/dependabot.yml` (comments only). Verification: full suite green, all Acceptance commands exit 0. No refactors. Doc verdict as above. `touches:` reconciliation: `git diff --name-only` = `.github/dependabot.yml`, `README.md` = declared set (plus this tasknote, PLAN.md, and the archive move, workflow files). Maintainability effect: the README and config comment no longer promise PRs the config suppresses.

- [x] **Learnings** — N/A: the policy lives in natabula STACK-TENDENCIES §"Dependency updates"; nothing for the always-loaded layer.

**Final Summary:** README.md:25-29 and the BI-037 comment in `.github/dependabot.yml` now state that Dependabot version-update PRs are off by policy and that security updates come from the repo's Dependabot setting once enabled. The config is unchanged. Full validation set green; external review's five notes fixed. Deferred operator step (arming the setting) is already filed as DEPLOY-014.5, so nothing new to file. unattended-candidates: none

**Archived:** 2026-10-18
