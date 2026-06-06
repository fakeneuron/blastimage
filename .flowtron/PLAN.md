# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

- [ ] **BI-003** [opus] | layout — Build the main workspace layout: sidebar with task list + add-new-task, main detail pane showing prompt editor, reference selector, and generate controls.
- [ ] **BI-004** [opus] | ref-library — Create the reference library UI (drag-and-drop upload, thumbnail grid, per-task active selection limited to three) and wire it to the active task.
- [ ] **BI-005** [opus] | review-grid — Implement the batch review grid: responsive image cards with keep/discard, star rating, feedback button, and visual states for approved/discarded.
- [ ] **BI-006** [opus] | feedback — Build the feedback modal with textarea, "use as reference" checkbox, and quick-approve path; wire saving feedback back into the iteration and optionally promoting the image to current keeper.
- [ ] **BI-007** [opus] | generate — Implement the generation function (mock version using themed picsum images for immediate testing) plus the iteration path that can accept a primary reference image and updated prompt.
- [ ] **BI-009** [opus] | end-to-end — Wire the full end-to-end loop in the main page component so creating tasks, generating, reviewing, iterating, and exporting works without data loss.

## Medium

- [ ] **BI-008** [sonnet] | gallery — Add the approved gallery sidebar/panel that auto-collects keepers across tasks and provides per-item download + bulk export of images + JSON manifest.
- [ ] **BI-011** [opus] | api-prep — Prepare the real Grok Imagine API integration path (document the two endpoints, response shape, and proxy strategy) so swapping the mock is a single focused change later.

## Low

- [ ] **BI-010** [sonnet] | cost-ui — Add cost estimator display (per-batch and session total) and basic keyboard shortcuts (G to generate, etc.).
- [ ] **BI-012** [sonnet] | docs — Write the short user-facing README and update any inline comments so the first cut is self-documenting.

## Future Opportunities

- Hosted webapp variation (multi-user, accounts, cloud storage).

## Completed

- [x] **BI-001** [opus] | types — Completed 2026-06-06.
- [x] **BI-002** [opus] | persistence — Completed 2026-06-06.

