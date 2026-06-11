# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

(none)

## Medium

- [ ] **BI-014** [sonnet] | submodule-adopt — Adopt blastimage as a git submodule in a real project, follow the integration guide end-to-end, and document any friction points for guide refinement.
- [ ] **BI-015** [opus] | batch-generate — Add a "Generate All" action that fires generation across all session tasks simultaneously, producing a cross-task batch for one-pass bulk review. Depends on CORE-001.2 (stale-session race fix) landing first.

## Low

- [ ] **BI-017** [sonnet] | generated-quota — Add a localStorage quota guard for accumulated generated images (analogous to the existing 2 MB per-ref guard in ReferenceLibrary) to surface a warning before hitting the storage cliff.

## Future Opportunities

- Hosted webapp variation (multi-user, accounts, cloud storage).

## Completed

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
