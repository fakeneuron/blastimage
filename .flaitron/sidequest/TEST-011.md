---
title: e2e-report-artifact
status: sidequest
priority: Low
pickup: next-chat
created: 2026-10-07
parent: TEST-010
---

# TEST-011 | e2e-report-artifact

[← PLAN.md](../PLAN.md) · 📌 Sidequest (filed 2026-10-07)

## Idea

TEST-010 added the html reporter (`open: "never"`) to `playwright.config.ts` for CI too. CI writes `playwright-report/` on every e2e run but never uploads it, so a failed CI run leaves nothing to inspect. Add an `actions/upload-artifact` step for `playwright-report/` with `if: failure()` to the `e2e` job in `.github/workflows/ci.yml`. Surfaced by TEST-010's external review (note-grade).

## Resume anchor

TEST-010 Phase 3 External review: recording the review findings, then Phase 4 closure.
