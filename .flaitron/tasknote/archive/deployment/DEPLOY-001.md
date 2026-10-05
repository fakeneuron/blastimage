---
title: ci-secret-scan
status: completed
tags: []
created: 2026-08-09
due:
related-tasks: [BI-034.5]
---

# DEPLOY-001 | ci-secret-scan

[← PLAN.md](../../PLAN.md) · 🟢 In progress · 🔗 [[BI-034.5]]

## 🎯 Goal

Add a pinned gitleaks secret-scan step to `.github/workflows/ci.yml` as the CI backstop for commits made without the per-clone pre-commit hook, ordered so `.next/` never produces false positives.

## ✅ Acceptance

- [x] `.github/workflows/ci.yml` runs gitleaks against the working tree with `.gitleaks.toml`, using a pinned gitleaks version
- [x] Secret scan cannot see Build-produced `.next/` (separate job and/or step before `Build`)
- [x] Negative control: clean HEAD tree → 0 leaks
- [x] Positive control: `ghp_`-shaped PAT (ruleset-confirmed) → leak found / non-zero exit
- [x] README notes that CI runs the secret-scan backstop (not only the per-clone hook)

## 🧩 Subtasks

- [x] Add gitleaks install + scan to `ci.yml` (pinned version, `--config .gitleaks.toml`)
- [x] Place scan so it never scans Build output (separate job preferred)
- [x] Negative + positive control verification
- [x] Light README update for CI backstop

## 🔗 Related

- [[BI-034.5]] — adopted `.gitleaks.toml` + pre-commit; recorded CI gap + `.next/` trap

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** PLAN premise holds. `ci.yml` has no secret-scan step; pre-commit arming is per-clone (untracked hook); BI-034.5 deliberately deferred CI and documented the `.next/` false-positive trap. `.gitleaks.toml` header already lists CI as a consumer.

- [x] Read relevant source files

- [x] **Best Practices Review**

- [x] **Archive skim**

- [x] **Drift check**

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Sources read:** `.github/workflows/ci.yml`; `.gitleaks.toml`; `.pre-commit-config.yaml`; `README.md`; archive `bi/BI-034.5.md`; marscharts `ci.yml` secrets job; natabula spine step; local gitleaks 8.30.1.

**Best Practices:** Do not fork base-stable `.gitleaks.toml` / pre-commit. Prefer separate job (marscharts) so Build reordering cannot reintroduce `.next/` FPs. Pin 8.30.1.

**Archive skim:** `archive/deployment/` was empty. BI-034.5 is the load-bearing prior note (positive-control shapes; per-clone arming; CI gap + 6× `.next/` FPs).

**Drift check:** No drift. Local `.next/` scan → 6 `generic-api-key` hits; `git archive HEAD` → 0; entropy-rich `ghp_` + JWT → 2 leaks.

**Clarifications:** No clarifications needed. Assumptions: pin 8.30.1; separate `secrets` job; no repo-local allowlist; light README CI mention.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended marscharts separate-job + natabula pinned curl install; DRY with existing `.gitleaks.toml`; single responsibility (scan only)

- [x] **Minimal refactor gate** — no refactor; additive YAML + three README lines only

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A (workflow YAML + docs; verification is gitleaks controls, not vitest)

**Implementation Notes:**

Added `secrets` job to `.github/workflows/ci.yml`: checkout → install gitleaks 8.30.1 → `gitleaks dir . --config .gitleaks.toml --no-banner --redact`. Parallel to main `ci` job; never runs Build. README Install & Run now documents the CI backstop.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A for app tests; ran gitleaks negative/positive controls instead

- [x] Ran lint/type-check on changed code — YAML parse ok (`yaml.safe_load`); no TS/app surface

- [x] **Quality assertions** — no duplication, no dead code, no public surface growth; README stays aligned with CI

- [x] (frontend) N/A — no frontend files

**Testing Notes:**

- Negative: `git archive HEAD` + gitleaks → `no leaks found`, exit 0
- Positive: temp file with `ghp_…` + JWT → `leaks found: 2`, exit 1
- Local tree with `.next/` still shows 6 FPs — why separate job is required

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep**
  - `README.md` — **updated** (CI gitleaks backstop under Install & Run)
  - `AGENTS.md` — no change (workflow contract only)
  - `CLAUDE.md` — no change (stack/test conventions; hook already out of scope per BI-034.5)
  - `.flowtron/PLAN.md` — flipped this task at closure

- [x] Closed — acceptance ticked; YAML `status: completed`; PLAN stub; archived under `archive/deployment/`

- [x] **Evidence-based recap** drafted

**Final Summary:**

Added a parallel gitleaks `secrets` job to CI (pinned 8.30.1, `.gitleaks.toml`) so clones without pre-commit still get a working-tree secret scan, without ever seeing Next's `.next/` false positives. README documents the backstop. Verified clean HEAD (0 leaks) and positive control (exit 1).

**Archived:** 2026-08-09
