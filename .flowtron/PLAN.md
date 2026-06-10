# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

- [ ] **CORE-EPIC-001** [opus] | code-quality-sweep — Code-quality sweep of blastimage's app surface (app/, components/, lib/, root configs). Discovery found a clean baseline (tsc/lint/tests green) with 5 medium findings — stale-session race in generate(), as-any provider cast, triplicated download logic, .jpg filename mislabel, batch-size duplicate — fixed across .2..4, verified by the .5 audit.
  - [x] **CORE-001.1** [opus] | code-quality-sweep discovery — Completed 2026-06-10.
  - [ ] **CORE-001.2** [opus] | lib-quality — Fix medium lib/ findings: generate()'s stale-session race in useWorkspace (commits the pre-await session, dropping concurrent edits), the as-any provider cast in generate.ts, and the triplicated blob-download/slugify idiom (consolidate into storage.ts). Lows stay logged. Tests extended; suite/tsc/lint green.
  - [ ] **CORE-001.3** [opus] | component-quality — Fix medium component findings: GalleryPanel's download filename hardcodes .jpg regardless of image mime; TaskDetail's generating-skeleton hardcodes 4 placeholders duplicating DEFAULT_BATCH_SIZE. Low nits fixed only where already touched. Visual confirmation that the e2e flow is unchanged.
  - [ ] **CORE-001.4** [opus] | config-docs-strays — Cross-cutting cleanup: delete superseded PLAN.legacy.md (per-file confirm), verify .gitignore covers *.tsbuildinfo, align npm test watch-vs-run script intent with docs, and verify README/AGENTS claims against code after .2/.3 land.
  - [ ] **CORE-001.5** [opus] | audit — Final-subtask audit per SPEC/epic.md (fixed doc-drift sweep acceptance line). Filed at filing time as highest .5 child.

## Medium

- [ ] **BI-014** [sonnet] | submodule-adopt — Adopt blastimage as a git submodule in a real project, follow the integration guide end-to-end, and document any friction points for guide refinement.
- [ ] **BI-015** [opus] | batch-generate — Add a "Generate All" action that fires generation across all session tasks simultaneously, producing a cross-task batch for one-pass bulk review. Depends on CORE-001.2 (stale-session race fix) landing first.

## Low

- [ ] **BI-017** [sonnet] | generated-quota — Add a localStorage quota guard for accumulated generated images (analogous to the existing 2 MB per-ref guard in ReferenceLibrary) to surface a warning before hitting the storage cliff.

## Future Opportunities

- Hosted webapp variation (multi-user, accounts, cloud storage).

## Completed

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
