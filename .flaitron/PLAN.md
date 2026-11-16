# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flaitron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

## Medium

- [ ] **BI-EPIC-078** [heavy]🧠 | video-support — Batch-generate 16:9 MP4 promo clips beside still batches, reusing the round/review/export pipeline (new `/blast-animate` skill, media-aware review, MP4 export + manifest). Related cloutomaton CORE-EPIC-054.
  - [x] **BI-078.1** [heavy]🧠 | video-support discovery — Completed 2026-11-12.
  - [x] **BI-078.2** [moderate]🧩 [unattended] | video-round-contract — Completed 2026-11-12.
  - [x] **BI-078.3** [moderate]🧩 [unattended] | file-route-video — Completed 2026-11-12.
  - [x] **BI-078.4** [heavy]🧠 | media-aware-review — Completed 2026-11-12.
  - [x] **BI-078.5** [moderate]🧩 | video-export — Completed 2026-11-13.
  - [ ] **BI-078.6** [moderate]🧩 | blast-animate-skill — New `.grok/skills/blast-animate/SKILL.md`: source still from `approved/`, `reference_to_video` with both frame pins, 3 takes, encode and `ffprobe` check per natabula STACK-TENDENCIES §"Promo clips", subscription-pool-only guard, re-animate from a clip-round `selection.json`. `/blast-iterate` refuses clip rounds. ADOPT §5.1 and §7. Ends with an attended first run in Grok Build recording time per take and usage. Decisions in [[BI-078.1]].
  - [ ] **BI-078.N** [heavy]🧠 | video-support audit — Final-subtask audit per SPEC/epic.md.
- [ ] **BI-081** [light] | landing-hsts-promotion — From BI-077: step the apex's host-only HSTS in `landing/public/_headers` 300 → 86400 → 31536000 per natabula NAT-478 §"HSTS scope", one rung per deploy, each only after the previous rung's full max-age has elapsed; before each rung record dated `curl -sI` evidence for the apex, a 404 path, `http://` → `https://`, and www → apex. Never add `includeSubDomains`/`preload` here.


## Low
- [ ] **BI-079** [light] [unattended] | seo-intent — From natabula NAT-506 (fleet audit 2026-10-31, @b036f6a): `blastimage.com` now exists, so declare SEO intent by committing `seo/sites.json` per natabula `docs/SEO-EVIDENCE.md`: one site `landing`, `base_url` `https://blastimage.com/`, `intent` `prelaunch` (the noindex state `landing/README.md` records), owner `fakeneuron` (per `LICENSE`).
- [ ] **BI-082** [light] | cf-account-pin-and-mail — From natabula fleet audit 2026-11-05 (@397b732; natabula FLEET-CLOUDFLARE graded 2026-10-27, re-confirmed 2026-11-01): DEPLOY-014.6 fixed the apex route, `www`, HTTPS, `workers_dev` and `preview_urls`, but not two cells. Pin `account_id` in the wrangler config, and enable Email Routing with the fleet aliases (or record why the zone takes no mail).
- [ ] **BI-085** [light] | round-chip-clip-label — From BI-078.2 review: the Sidebar round chip (`components/Sidebar.tsx`) labels every take from `RoundSummary.imageCount` as "images", so a clip round reads "2 images". Count or label `.mp4` takes as clips (`mediaKindFromPath`). Blocked by [[BI-078.4]].

## Future Opportunities

- [ ] **DEPLOY-006** [light]🔧 [unattended] | typescript-7-revisit — retry TypeScript 5→7 once `typescript-eslint` supports TS 7 (7.1 compiler API). DEPLOY-004 measured: `tsc` and `next build` already clean on 7.0.2; eslint-config-next's typescript-eslint throws at config load; Microsoft dual-install breaks Next 16.3.3. Unblock check: `npm view typescript-eslint peerDependencies`. On landing, drop the `typescript` major-ignore from `.github/dependabot.yml`. Checked 2026-10-19: typescript-eslint 8.72.0, peer still `>=4.8.4 <6.1.0`; no stable TS 7.1.

## Completed

- [x] **BI-084** [light] | ci-coverage-last-green — Completed 2026-11-15.
- [x] **BI-086** [moderate] | webkit-clip-playback-e2e — not a codec limit: Linux WebKit loaded the clip's metadata (assertions passed); only the spec's `waitForResponse` for the `<video>`'s 206 timed out, since WebKitGTK fetches media via GStreamer outside Playwright's network events. `e2e/clip-playback.spec.ts` now asserts the range directly (`page.request` with `Range: bytes=0-1` → 206 + `Content-Range`); no tasknote. Completed 2026-11-15.
- [x] **CORE-016** [moderate] | grok-block-adoption — Grok block v3 public installed by natabula NAT-595.3 wave (`5fc9544`), no markers (public); duplicate CLAUDE.md prose link to AGENTS.md unlinked so one import remains; no tasknote. Completed 2026-11-11.
- [x] **BI-083** [light] [unattended] | port-registry-citation — Completed 2026-11-10.
- [x] **BI-077** [moderate] | landing-baseline-security-headers — Completed 2026-11-06.
- [x] **BI-80** [light] | ci-job-timeouts — set `timeout-minutes` on every `.github/workflows/ci.yml` job to the NAT-528 defaults: `ci` 30 (unit plus build), `secrets` 15, `landing` 30 (astro check plus build), `e2e` 20→30; no tasknote. Completed 2026-11-05.
- [x] **CORE-015** [light]🔧 [unattended] | dev-vars-ignores — landed in CORE-014's commit (split from CORE-014 by 8f4f290 after that run had already made the edit): root `.gitignore` `.dev.vars*` / `!.dev.vars.example`; operator-run `git check-ignore -q --no-index` gave 0/0/0/1 at root and `landing/`. Completed 2026-10-29.
- [x] **CORE-014** [moderate] | secrets-posture — Completed 2026-10-29.
- [x] **BI-076** [moderate] | narrow-viewport-decision — Completed 2026-10-26.
- [x] **DEPLOY-005** [light]🔧 [unattended] | eslint-10-natabula-config — Completed 2026-10-19.
- [x] **BI-073** [light]🔧 [unattended] | dev-url-origin — Completed 2026-10-19.
- [x] **CORE-013** [medium]🧩 | audit-overlay-deltas — Completed 2026-10-19.
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
