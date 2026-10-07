---
title: e2e-report-artifact
status: completed
tags: [ci, e2e]
created: 2026-10-07
due:
related-tasks: [TEST-010]
touches:
  - .github/workflows/ci.yml
---

# TEST-011 | e2e-report-artifact

[← PLAN.md](../PLAN.md) · ✅ Completed

## 🎯 Goal

Upload `playwright-report/` from the CI e2e job when it fails, so a red run leaves a report to open.

## ⚡ Notes

**Relevance:** Proceed — TEST-010's html reporter writes `playwright-report/` in CI and nothing uploads it.
**Best Practices Review:** N/A — one added workflow step in the existing `e2e` job; no code responsibilities or dependencies touched.
**Drift check:** no drift — `playwright.config.ts:25-28` still has the html reporter with `open: "never"`; `.gitignore` already ignores `playwright-report*/`; the e2e job is the last job in `ci.yml` with no existing upload.
**Archive skim:** TEST-010 (filed this) — confirms html reporter kept in CI by operator choice and the upload was deliberately parked here. TEST-007.2 created the e2e job; no conflicting decisions.
**Declared scope:** `touches: .github/workflows/ci.yml` (frontmatter).
**Pattern survey:** extends the e2e job's step list and the file's comment-above-step style; `upload-artifact@v7` matches the file's major-version pins (`actions/checkout@v7`; latest release is v7.0.2).
**Implementation:** added `Upload Playwright report` as the last step of the `e2e` job: `if: failure()`, `actions/upload-artifact@v7`, name `playwright-report`, path `playwright-report/`, `retention-days: 7`. `failure()` is true only when a prior step failed, so green runs upload nothing. The 7-day retention is my choice, not in the PLAN line; the repo default is 90 days, which is more than a failure report needs. Verification receipt: `ruby -ryaml` parse of ci.yml → 0. Not run on real CI (the workflow only executes on push), so the first failing e2e run is the live check.
**Docs touched:** no change — README / tasknote README reference `npm run test:e2e`, not CI artifacts.

## ✅ Recap

Added a failure-only `actions/upload-artifact@v7` step to the CI `e2e` job in `.github/workflows/ci.yml` (+10 lines) uploading `playwright-report/` as `playwright-report` with 7-day retention. YAML parses; the step has not run on real CI, since it needs a failing e2e run to trigger. The declared `touches:` matches `git diff --name-only` (plus the sidequest stub deletion, PLAN and this tasknote). No refactor, no docs change.

**Archived:** 2026-10-07
