# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flaitron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

- [ ] **TEST-EPIC-012** [medium]🧩 | test-reach — extend the safety net to the daily-driver browser and to the handler layer of the routes that write into the linked repo. Discovery supplied by audit-repo 2026-10-18. Surfaced by audit-repo 2026-10-18 (Theme: Test reach stops short of Safari and the route handlers)
  - [x] **TEST-012.2** [medium]🧩 [unattended] | webkit-e2e — Completed 2026-10-18.
  - [ ] **TEST-012.3** [light]🔧 [unattended] | route-handler-tests — handler-level vitest coverage for `app/api/imagegen/{approved,browse,link,round,rounds}/route.ts` (20–42% lines today; the route-guard suite covers refusals only), mirroring `lib/imagegenFileRoute.test.ts`. `DELETE /approved` and `POST /approved` first. Done: each ≥80% lines under `vitest --coverage`.
  - [ ] **TEST-012.N** [medium]🧩 [unattended] | test-reach audit

## Medium

- [ ] **DEPLOY-EPIC-014** [light]🔧 | upkeep-honesty — make the repo's upkeep claims match what is configured and armed. Discovery supplied by audit-repo 2026-10-18. Surfaced by audit-repo 2026-10-18 (Theme: Upkeep claims outrun configuration)
  - [ ] **DEPLOY-014.2** [light]🔧 [unattended] | dependabot-claim-reconcile — README.md:25-28 claims weekly Dependabot npm/Actions PRs; `.github/dependabot.yml` sets `open-pull-requests-limit: 0` on both ecosystems (8c70e57), the natabula security-only policy (NAT-230, STACK-TENDENCIES §"Dependency updates"). Keep the config; rewrite the README sentence and the BI-037 comment to say version-update PRs are off by policy and security updates come from the repo setting. Done: no claim of weekly PRs remains.
  - [ ] **DEPLOY-014.3** [light]🔧 [unattended] | landing-dep-gates — `landing/` is outside `dependabot.yml` (directory `/` only) and the `landing` CI job runs no `npm audit`. Add a `/landing` npm entry carrying the same `open-pull-requests-limit: 0` and an `npm audit --omit=dev --audit-level=high` step to the landing job. Done: both present, landing job green.
  - [ ] **DEPLOY-014.4** [light]🔧 [unattended] | doc-comment-drift — README.md:65 glyphs (↓/↑ → ⤓/⤒ per `components/ProjectMenu.tsx:158,167`); `vitest.config.mts:37-39` claims tsconfig `jsx: "preserve"` but it is `react-jsx` — re-verify the `oxc.jsx` override and correct the comment. Done: grep `↓ Export` → 0; comment matches tsconfig.
  - [ ] **DEPLOY-014.5** [light]🔧 | arm-dependabot-security — operator step: turn on Dependabot alerts and Dependabot security updates in the GitHub repo settings (Settings → Code security). Checked 2026-10-18: `automated-security-fixes` `enabled: false`, `vulnerability-alerts` 404, so no Dependabot signal reaches the repo and the CI `npm audit` gate is the only dependency check. Done: both API reads report enabled.
  - [ ] **DEPLOY-014.6** [light]🔧 | landing-go-live — operator steps from landing/README.md §"Operator steps (not yet done)" (Cloudflare zone, wrangler deploy, custom domain, www → apex 301, `homepage_url`), untracked since DEPLOY-011 closed. Done: apex serves the page; checklist ticked.
  - [ ] **DEPLOY-014.N** [light]🔧 | upkeep-honesty audit
- [ ] **BI-068** [light] | safari-focus-restore — mouse-opened dialogs lose focus restore in Safari (clicks don't focus buttons); capture opener from pointer target, then add a mouse-open restore e2e.

## Low

(none)

## Future Opportunities

- [ ] **DEPLOY-005** [light]🔧 | eslint-10-revisit — retry ESLint 9→10 once `eslint-plugin-react` supports ESLint 10. DEPLOY-003 measured the blocker: that plugin (transitive via `eslint-config-next`) crashes at rule load on ESLint 10 — `context.getFilename is not a function` — and 7.37.5 is `latest`, so there is nothing to bump to. Everything else in the tree is already 10-ready; with `react/*` off, ESLint 10 lint this repo clean. Unblock check: `npm view eslint-plugin-react peerDependencies`. On landing, also drop the `eslint` major-ignore from `.github/dependabot.yml`. Checked 2026-10-08: still 7.37.5, peer still `^9.7`.
- [ ] **DEPLOY-006** [light]🔧 | typescript-7-revisit — retry TypeScript 5→7 once `typescript-eslint` supports TS 7 (7.1 compiler API). DEPLOY-004 measured: `tsc` and `next build` already clean on 7.0.2; eslint-config-next's typescript-eslint throws at config load; Microsoft dual-install breaks Next 16.3.3. Unblock check: `npm view typescript-eslint peerDependencies`. On landing, drop the `typescript` major-ignore from `.github/dependabot.yml`. Checked 2026-09-10: typescript-eslint 8.70.0, peer still `>=4.8.4 <6.1.0`; no stable TS 7.1.

## Completed

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

- [x] **BI-063** [light]🔧 [unattended] | approve-promote-rollback — Completed 2026-09-25.

- [x] **BI-062** [medium]🧩 [unattended] | selection-write-integrity — Completed 2026-09-25.

- [x] **BI-061** [heavy]🧠 | link-race-ownership — Completed 2026-09-25.

- [x] **CORE-8** [light] | doc-drift-inline — ADOPT.md:149/199/201 now say blastimage reads/writes the linked imagegen/ folder (localhost only) with session metadata in localStorage; "⟳ Iterate" → "Iterate →" in REVIEW-LOOP.md:91 and lib/useWorkspace.ts:151; GROK-AGENT.md line-number refs → "inside generate()" and error surfacing → "error banner"; REVIEW-LOOP.md:99 "undo above" → "approve undo below (BI-030.2)". Surfaced by audit 2026-09-25 (Finding #11, Medium; Findings #14–#16, Low), fixed inline.

- [x] **BI-EPIC-060** [heavy]🧠 | review-ux-speed — Completed 2026-09-25.
  - [x] **BI-060.1** [heavy]🧠 | review-ux-speed discovery — Completed 2026-09-24.
  - [x] **BI-060.2** [medium]🧩 | review-progress-status — Completed 2026-09-24.
  - [x] **BI-060.3** [heavy]🧠 | lightbox-review-surface — Completed 2026-09-24.
  - [x] **BI-060.4** [light]🔧 | viewer-mode-layout — Completed 2026-09-25.
  - [x] **BI-060.5** [light]🔧 | kept-badge-e2e-collision — Completed 2026-09-25.
  - [x] **BI-060.N** [heavy]🧠 | review-ux-speed audit — Completed 2026-09-25.

- [x] **BI-059** [light]🔧 | browse-comment-boundary — Completed 2026-09-24.

- [x] **DEPLOY-EPIC-009** [light]🔧 | upkeep-drift — Completed 2026-09-24.
  - [x] **DEPLOY-009.2** [light]🔧 [unattended] | useworkspace-size-fossil — Completed 2026-09-24.
  - [x] **DEPLOY-009.3** [light]🔧 | dependabot-backlog-triage — Completed 2026-09-24.
  - [x] **DEPLOY-009.N** [light]🔧 | upkeep-drift audit — Completed 2026-09-24.

- [x] **DEPLOY-EPIC-008** [medium]🧩 | verification-gate-reach — Completed 2026-09-24.
  - [x] **DEPLOY-008.2** [light]🔧 | push-backlog-ci-verify — Completed 2026-09-24.
  - [x] **DEPLOY-008.3** [light]🔧 | e2e-dev-coexistence — Completed 2026-09-24.
  - [x] **DEPLOY-008.N** [light]🔧 | verification-gate-reach audit — Completed 2026-09-24.

- [x] **BI-EPIC-058** [medium]🧩 | loopback-bind — Completed 2026-09-24.
  - [x] **BI-058.2** [light]🔧 [unattended] | loopback-bind-scripts — Completed 2026-09-24.
  - [x] **BI-058.3** [light]🔧 [unattended] | guard-threat-model-doc — Completed 2026-09-24.
  - [x] **BI-058.N** [light]🔧 | loopback-bind audit — Completed 2026-09-24.

- [x] **BI-010** [sonnet] | cost-ui — Won't do: SuperGrok is a flat subscription; per-image cost display is not applicable.
