# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flaitron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

## Medium

- [ ] **BI-073** [light]🔧 [unattended] | dev-url-origin — docs name `http://localhost:3003` but `next dev -H 127.0.0.1` prints `http://127.0.0.1:3003`, a separate localStorage origin; make `127.0.0.1:3003` canonical in `README.md:9`, `docs/ADOPT.md:58`, `docs/ADOPT.md:214`, `.grok/skills/blast-generate/SKILL.md:123`, and add one sentence to ADOPT's Clearing-state note that `localhost:3003` stores sessions separately and that sessions made there move over with ⤓ Export / ⤒ Import. The fleet sets no URL rule (natabula `docs/PORT-REGISTRY.md` registers ports only); this repo's own `AGENTS.md` dev-port line (`next dev -H 127.0.0.1 -p 3003`, BI-058) is the source the docs follow. Surfaced by audit-docs 2026-10-19 (Finding #1, Medium).

## Low

- [ ] **DEPLOY-005** [light]🔧 [unattended] | eslint-10-natabula-config — move to ESLint 10 on natabula's Next template config instead of waiting for upstream (re-pointed natabula NAT-441, ruled 2026-10-19): drop `eslint-config-next`, compose `@next/eslint-plugin-next` (`configs['core-web-vitals']`) with `typescript-eslint`, `react-hooks` and `jsx-a11y` (natabula `templates/nextjs/eslint.config.mjs`, STACK §Frontend), then `eslint ^10` — that removes `eslint-plugin-react` from the tree. Gate: `npm run lint` clean with no new disables. On landing, drop the `eslint` major-ignore from `.github/dependabot.yml`. History: DEPLOY-003 measured the upstream blocker — `eslint-plugin-react` 7.37.5 (transitive via `eslint-config-next`) crashes at rule load on ESLint 10 (`context.getFilename is not a function`); checked 2026-10-08, still 7.37.5, peer `^9.7`.
- [ ] **CORE-013** [medium]🧩 | audit-overlay-deltas — fill `.claude/skills/audit/SKILL.md` `## Deltas` for all eight claimed domains so `/audit` stops tripping `scaffold-bootstrap.md` on every run — a scope glob and gate set keyed per domain, per-pass stack examples, and extra hard rules. Decide the values in Discovery, checking peer overlays that are already filled (13 of 15 fleet repos) for how they shaped theirs. Inputs from the 2026-10-19 run-once: CI's security commands (`.github/workflows/ci.yml:100` npm audit, `:127` gitleaks) — note that `gitleaks dir .` run locally scans the gitignored `.next*/` build output and reports 20 Next.js-generated keys, so pick a local form that matches what CI actually scans; the docs set had no doc tooling; a candidate hard rule is "every `fs` read or write under the linked root goes through `resolveUnderRoot`" (BI-072). Verify with `/audit security` and `/audit docs` both reaching pass 1 without the scaffold prompt. Surfaced by audit-security 2026-10-19 (scaffold-bootstrap run-once).

## Future Opportunities

- [ ] **DEPLOY-006** [light]🔧 [unattended] | typescript-7-revisit — retry TypeScript 5→7 once `typescript-eslint` supports TS 7 (7.1 compiler API). DEPLOY-004 measured: `tsc` and `next build` already clean on 7.0.2; eslint-config-next's typescript-eslint throws at config load; Microsoft dual-install breaks Next 16.3.3. Unblock check: `npm view typescript-eslint peerDependencies`. On landing, drop the `typescript` major-ignore from `.github/dependabot.yml`. Checked 2026-10-19: typescript-eslint 8.72.0, peer still `>=4.8.4 <6.1.0`; no stable TS 7.1.

## Completed

- [x] **BI-072** [!critical] [medium]🧩 | imagegen-symlink-confinement — Completed 2026-10-19.
- [x] **BI-074** [light] | adopt-stale-prereq — deleted the bootstrap-era "blastimage must be pushed to GitHub first" prerequisite from `docs/ADOPT.md` §Prerequisites (`origin/main` exists; Troubleshooting still covers an aborted add). Surfaced by audit-docs 2026-10-19 (Finding #2, Low), fixed inline.
- [x] **BI-075** [light] | readme-vision-link — added `VISION.md` to `README.md` §Docs, the only doc index that omitted it. Surfaced by audit-docs 2026-10-19 (Finding #3, Low), fixed inline.
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
