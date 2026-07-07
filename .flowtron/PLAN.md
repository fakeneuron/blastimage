# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

(none)

## Medium

(none)

## Low

(none)

## Future Opportunities

(none)

## Completed

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
