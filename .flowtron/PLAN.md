# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

(none)

## Medium

- [ ] **BI-EPIC-030** [heavy]🧠 | silent-drift-surfacing — three load-bearing contracts fail without any user-visible signal: `slugify(name)` joins app state to on-disk round state in both directions, `schemaVersion` gates every session load, and approve is a one-way write into the user's repo. Make the drift visible; do not re-architect the joins. Discovery supplied by audit-repo 2026-08-06. Surfaced by audit-repo 2026-08-06 (Theme: Load-bearing joins fail silently)
  - [ ] **BI-030.2** [medium]🧩 | reversible-approve — clearing an `approved` decision must remove the file from `imagegen/approved/` and rewrite its `selection.json` entry; today the toggle is one-way and a mis-click needs manual cleanup.
  - [ ] **BI-030.3** [medium]🧩 | rename-slug-guard — warn when a task rename breaks a loaded round's slug join (currently orphans the task: next Load round mints a duplicate, and `requestNextRound` writes a slug `/blast-iterate` won't match).
  - [ ] **BI-030.4** [medium]🧩 | schema-mismatch-banner — distinguish "absent" from "version-mismatched" in `loadSession`; name the affected session in a banner instead of silently bootstrapping a fresh one and leaving a dead switcher entry.
  - [ ] **BI-030.N** [light]🔧 | audit

- [ ] **BI-EPIC-031** [medium]🧩 | generation-mode-clarity — in-app generation is Grok-Build-only by deliberate decision (BI-023: "generation stays local-only (Grok Build)"), and BI-EPIC-024 preserved it on purpose while migrating only the iterate action off `generateBatch`. Nothing in the UI or README says which mode you are in, and the one diagnostic that would explain it is swallowed. Clarify, do not remove. Discovery supplied by audit-repo 2026-08-06. Surfaced by audit-repo 2026-08-06 (Theme: The adopter path is the product)
  - [ ] **BI-031.2** [light]🔧 | provider-absent-ux — surface the caught error's own message instead of `'Generation failed. Please try again.'`; disable Generate / ⚡ Generate All with a stated reason when `globalThis.__grokImagineProvider` is absent.
  - [ ] **BI-031.3** [light]🔧 | readme-mode-labels — label the README "In-app loop" section Grok-Build-only; reconcile with `docs/REVIEW-LOOP.md` §2 ("the browser never generates") and CLAUDE.md.
  - [ ] **BI-031.4** [light]🔧 | orphan-config-cleanup — drop the `BUILD_TARGET=cloudflare` branch from `next.config.ts` (orphaned by BI-028, which deleted the `docs/DEPLOY.md` it cites but never touched the config); rewrite `lib/generate.ts`'s BI-013-era error copy as operator-facing text.
  - [ ] **BI-031.N** [light]🔧 | audit

## Low

(none)

## Future Opportunities

(none)

## Completed

- [x] **BI-EPIC-029** [heavy]🧠 | imagegen-byte-resolution — Completed 2026-08-08.
  - [x] **BI-029.2** [heavy]🧠 | resolve-image-blob-seam — Completed 2026-08-07.
  - [x] **BI-029.3** [medium]🧩 | export-imagegen-regression — Completed 2026-08-08.
  - [x] **BI-029.4** [light]🔧 | blob-cache-bounds — Completed 2026-08-08.
  - [x] **BI-029.N** [light]🔧 | audit — Completed 2026-08-08.
- [x] **TEST-EPIC-001** [heavy] | test-gate-coverage — Completed 2026-08-07.
  - [x] **TEST-001.2** [light] | vitest-include-tsx — Completed 2026-08-06.
  - [x] **TEST-001.3** [medium] | workspace-autoload-test — Completed 2026-08-06.
  - [x] **TEST-001.N** [light] | audit — Completed 2026-08-07.
- [x] **BI-028** [medium] | supabase-to-r2-neon — Completed 2026-07-07.
- [x] **BI-027** [light] | image-lightbox — Completed 2026-06-24.
- [x] **BI-026** [light] | autoload-round — Completed 2026-06-18.
- [x] **BI-025** [light] | workflow-terminal-xref — Completed 2026-06-18.
- [x] **BI-EPIC-024** [heavy] | review-loop — Completed 2026-06-18.
  - [x] **BI-024.1** [heavy] | load-round-ingest — Completed 2026-06-18.
  - [x] **BI-024.2** [heavy] | next-round-request — Completed 2026-06-18.
  - [x] **BI-024.3** [heavy] | gen-iterate-skills — Completed 2026-06-18.
  - [x] **BI-024.4** [heavy] | audit — Completed 2026-06-18.
- [x] **BI-023** [heavy] | grok-hosted-gen — Completed 2026-06-16.
- [x] **BI-EPIC-022** [heavy] | hosted-webapp — Completed 2026-06-16.
  - [x] **BI-022.1** [heavy] | discovery — Completed 2026-06-15.
  - [x] **BI-022.2** [heavy] | storage-adapter-seam — Completed 2026-06-15.
  - [x] **BI-022.3** [heavy] | supabase-auth-schema — Completed 2026-06-16.
  - [x] **BI-022.4** [heavy] | cloud-images-buckets — Completed 2026-06-16.
  - [x] **BI-022.5** [heavy] | cloudflare-deploy — Completed 2026-06-16.
  - [x] **BI-022.6** [heavy] | oauth-login — Completed 2026-06-16.
  - [x] **BI-022.7** [heavy] | session-importer — Completed 2026-06-16.
  - [x] **BI-022.8** [heavy] | audit — Completed 2026-06-16.
- [x] **BI-EPIC-021** [heavy] | adopter-workflow-ux — Completed 2026-06-14.
  - [x] **BI-021.1** [heavy] | discovery — Completed 2026-06-14.
  - [x] **BI-021.2** [heavy] | export-folder-write — Completed 2026-06-14.
  - [x] **BI-021.3** [heavy] | import-builder — Completed 2026-06-14.
  - [x] **BI-021.4** [heavy] | review-sheet — Completed 2026-06-14.
  - [x] **BI-021.5** [heavy] | adopter-playbook — Completed 2026-06-14.
  - [x] **BI-021.6** [heavy] | audit — Completed 2026-06-14.
- [x] **BI-020** [light] | adopter-repo-layout — Completed 2026-06-11.
- [x] **BI-019** [heavy] | task-import — Completed 2026-06-11.
- [x] **BI-018** [sonnet] | adopter-usage-guide — Completed 2026-06-11.
- [x] **BI-017** [sonnet] | generated-quota — Completed 2026-06-10.
- [x] **BI-014** [sonnet] | submodule-adopt — Completed 2026-06-10.
- [x] **CORE-EPIC-001** [opus] | code-quality-sweep — Completed 2026-06-10.
  - [x] **CORE-001.1** [opus] | code-quality-sweep discovery — Completed 2026-06-10.
  - [x] **CORE-001.2** [opus] | lib-quality — Completed 2026-06-10.
  - [x] **CORE-001.3** [opus] | component-quality — Completed 2026-06-10.
  - [x] **CORE-001.4** [opus] | config-docs-strays — Completed 2026-06-10.
  - [x] **CORE-001.5** [opus] | audit — Completed 2026-06-10.
- [x] **BI-001** [opus] | types — Completed 2026-06-06.
- [x] **BI-002** [opus] | persistence — Completed 2026-06-06.
- [x] **BI-003** [opus] | layout — Completed 2026-06-06.
- [x] **BI-004** [opus] | ref-library — Completed 2026-06-06.
- [x] **BI-007** [opus] | generate — Completed 2026-06-06.
- [x] **BI-005** [opus] | review-grid — Completed 2026-06-06.
- [x] **BI-006** [opus] | feedback — Completed 2026-06-06.
- [x] **BI-009** [opus] | end-to-end — Completed 2026-06-06.
- [x] **BI-008** [sonnet] | gallery — Completed 2026-06-06.
- [x] **BI-010** [sonnet] | cost-ui — Won't do: SuperGrok is a flat subscription; per-image cost display is not applicable.
- [x] **BI-011** [sonnet] | grok-handoff — Completed 2026-06-07.
- [x] **BI-012** [sonnet] | docs — Completed 2026-06-07.
- [x] **BI-013** [grok] | grok-live-test — Completed 2026-06-07.
- [x] **BI-016** [light] | docs-refresh — Completed 2026-06-08.
- [x] **BI-015** [opus] | batch-generate — Completed 2026-06-10.
