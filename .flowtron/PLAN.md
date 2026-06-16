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

- [ ] **BI-EPIC-022** [heavy] | hosted-webapp — A hosted, cloud-persistent personal-use variation of blastimage: OAuth login + Supabase backend (Postgres/RLS/storage) behind a persistence-adapter seam, generation kept on Grok Build, deployed to Cloudflare Pages — so workspaces sync across devices. Additive to the local/submodule mode, not a replacement. Scoped via deep pre-pass ([[BI-022.1]]).
  - [x] **BI-022.1** [heavy] | discovery — Completed 2026-06-15.
  - [ ] **BI-022.2** [heavy] | storage-adapter-seam — Extract a PersistenceAdapter interface from lib/storage.ts; make localStorage the default adapter and re-point useWorkspace at it. Enabling refactor, no backend, no UI change; local mode stays byte-identical (existing suite green).
  - [ ] **BI-022.3** [heavy] | supabase-auth-schema — Supabase OAuth (Google/GitHub) login + owner-scoped Postgres schema mirroring the domain model with RLS + a Supabase metadata adapter on the .2 seam. Local mode config-gated, unaffected. Blocked by [[BI-022.2]].
  - [ ] **BI-022.4** [heavy] | cloud-images-migration — Generated/reference images to Supabase storage buckets (replacing localStorage data URLs in hosted mode); DB holds object refs + provenance; in-app importer lands an existing local export into the account. Blocked by [[BI-022.3]].
  - [ ] **BI-022.5** [heavy] | grok-gen-cloudflare-deploy — Preserve Grok Build generation in hosted mode (wire the frontend onto Grok Build CLI auth so the provider seam resolves; spike-prone) + Cloudflare Pages (next-on-Cloudflare) + Supabase deploy/config. Blocked by [[BI-022.3]].
  - [ ] **BI-022.6** [heavy] | audit — Final-subtask audit per SPEC/epic.md (fixed doc-drift sweep acceptance line). Filed at filing time as highest `.N` child.

## Completed

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
