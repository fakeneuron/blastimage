# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flaitron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

(none)

## Medium

(none)

## Low

## Future Opportunities

- [ ] **DEPLOY-005** [light]🔧 [unattended] | eslint-10-revisit — retry ESLint 9→10 once `eslint-plugin-react` supports ESLint 10. DEPLOY-003 measured the blocker: that plugin (transitive via `eslint-config-next`) crashes at rule load on ESLint 10 — `context.getFilename is not a function` — and 7.37.5 is `latest`, so there is nothing to bump to. Everything else in the tree is already 10-ready; with `react/*` off, ESLint 10 lint this repo clean. Unblock check: `npm view eslint-plugin-react peerDependencies`. On landing, also drop the `eslint` major-ignore from `.github/dependabot.yml`. Checked 2026-10-08: still 7.37.5, peer still `^9.7`.
- [ ] **DEPLOY-006** [light]🔧 [unattended] | typescript-7-revisit — retry TypeScript 5→7 once `typescript-eslint` supports TS 7 (7.1 compiler API). DEPLOY-004 measured: `tsc` and `next build` already clean on 7.0.2; eslint-config-next's typescript-eslint throws at config load; Microsoft dual-install breaks Next 16.3.3. Unblock check: `npm view typescript-eslint peerDependencies`. On landing, drop the `typescript` major-ignore from `.github/dependabot.yml`. Checked 2026-10-19: typescript-eslint 8.72.0, peer still `>=4.8.4 <6.1.0`; no stable TS 7.1.

## Completed

- [x] **DEPLOY-EPIC-014** [light]🔧 | upkeep-honesty — Completed 2026-10-19.
  - [x] **DEPLOY-014.2** [light]🔧 [unattended] | dependabot-claim-reconcile — Completed 2026-10-18.
  - [x] **DEPLOY-014.3** [light]🔧 [unattended] | landing-dep-gates — Completed 2026-10-18.
  - [x] **DEPLOY-014.4** [light]🔧 [unattended] | doc-comment-drift — Completed 2026-10-18.
  - [x] **DEPLOY-014.5** [light]🔧 | arm-dependabot-security — Completed 2026-10-18.
  - [x] **DEPLOY-014.6** [light]🔧 | landing-go-live — Completed 2026-10-19.
  - [x] **DEPLOY-014.N** [light]🔧 | upkeep-honesty audit — Completed 2026-10-19.

- [x] **BI-070** [light] [unattended] | link-late-shift — Completed 2026-10-18.

- [x] **BI-071** [light] [unattended] | approve-teardown-race — Completed 2026-10-18.

- [x] **BI-069** [light] [unattended] | webkit-link-flake — Completed 2026-10-18.

- [x] **BI-068** [light] | safari-focus-restore — Completed 2026-10-18.

- [x] **TEST-EPIC-012** [medium]🧩 | test-reach — Completed 2026-10-18.
  - [x] **TEST-012.2** [medium]🧩 [unattended] | webkit-e2e — Completed 2026-10-18.
  - [x] **TEST-012.3** [light]🔧 [unattended] | route-handler-tests — Completed 2026-10-18.
  - [x] **TEST-012.N** [medium]🧩 [unattended] | test-reach audit — Completed 2026-10-18.

- [x] **DEPLOY-013** [light] [unattended] | landing-ci — Completed 2026-10-18.

- [x] **DEPLOY-012** [light] [unattended] | personal-config-audit — Completed 2026-10-17.

- [x] **DEPLOY-011** [medium]🧩 | landing-page — Completed 2026-10-17.

- [x] **CORE-012** [medium] | brand-chamber-reference — Completed 2026-10-17.

- [x] **BI-EPIC-067** [medium]🧩 | sidebar-split — Completed 2026-10-16.
  - [x] **BI-067.2** [light]🔧 | sidebar-pin-draft — Completed 2026-10-15.
  - [x] **BI-067.3** [medium]🧩 | sidebar-draft-input — Completed 2026-10-15.
  - [x] **BI-067.4** [medium]🧩 | sidebar-project-menu — Completed 2026-10-16.
  - [x] **BI-067.N** [medium]🧩 | sidebar-split audit — Completed 2026-10-16.

- [x] **CORE-011** [heavy] | brand-pilot-manifest — Completed 2026-10-14.

- [x] **DEPLOY-EPIC-010** [light]🔧 | gates-green — Completed 2026-10-08.
  - [x] **DEPLOY-010.2** [light]🔧 [unattended] | runtime-advisories — Completed 2026-10-08.
  - [x] **DEPLOY-010.3** [light]🔧 [unattended] | setup-node-align — Completed 2026-10-08.
  - [x] **DEPLOY-010.4** [light]🔧 [unattended] | readme-doctrine-pointer — Completed 2026-10-08.
  - [x] **DEPLOY-010.5** [light]🔧 | push-and-ci-green — Completed 2026-10-08.
  - [x] **DEPLOY-010.N** [light]🔧 [unattended] | gates-green audit — Completed 2026-10-08.

- [x] **CORE-010** [light]🔧 | ci-setup-node-pin — Completed 2026-10-08.

- [x] **BI-066** [light] | docs-layering — Completed 2026-10-07.

- [x] **TEST-011** [light] | e2e-report-artifact — Completed 2026-10-07.

- [x] **TEST-010** [light] | playwright-spine — Completed 2026-10-07.

- [x] **CORE-009** [medium] | flaitron rename review — Completed 2026-10-05.

- [x] **CORE-7** [light]🔧 [unattended] | shared-result-and-strings — Completed 2026-09-25.

- [x] **BI-065** [light]🔧 [unattended] | orphan-sweep — Completed 2026-09-25.

- [x] **BI-064** [light]🔧 [unattended] | adopter-docs-disk-era — Completed 2026-09-25.

- [x] **BI-010** [sonnet] | cost-ui — Won't do: SuperGrok is a flat subscription; per-image cost display is not applicable.
