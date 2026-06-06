# blastimage — PLAN.md

## Active

- [ ] **BI-001** — [opus] Define the complete TypeScript data model (Session, PromptTask, Iteration, GeneratedImage, RefImage, FeedbackState) and document it in lib/types.ts.
- [ ] **BI-002** — [opus] Implement local persistence layer using localStorage + structured export/import helpers so a full workspace survives refresh and can be backed up.
- [ ] **BI-003** — [opus] Build the main workspace layout: sidebar with task list + add-new-task, main detail pane showing prompt editor, reference selector, and generate controls.
- [ ] **BI-004** — [opus] Create the reference library UI (drag-and-drop upload, thumbnail grid, per-task active selection limited to three) and wire it to the active task.
- [ ] **BI-005** — [opus] Implement the batch review grid: responsive image cards with keep/discard, star rating, feedback button, and visual states for approved/discarded.
- [ ] **BI-006** — [opus] Build the feedback modal with textarea, “use as reference” checkbox, and quick-approve path; wire saving feedback back into the iteration and optionally promoting the image to current keeper.
- [ ] **BI-007** — [opus] Implement the generation function (mock version using themed picsum images for immediate testing) plus the iteration path that can accept a primary reference image and updated prompt.
- [ ] **BI-008** — [sonnet] Add the approved gallery sidebar/panel that auto-collects keepers across tasks and provides per-item download + bulk export of images + JSON manifest.
- [ ] **BI-009** — [opus] Wire the full end-to-end loop in the main page component so creating tasks, generating, reviewing, iterating, and exporting works without data loss.
- [ ] **BI-010** — [sonnet] Add cost estimator display (per-batch and session total) and basic keyboard shortcuts (G to generate, etc.).
- [ ] **BI-011** — [opus] Prepare the real Grok Imagine API integration path (document the two endpoints, response shape, and proxy strategy) so swapping the mock is a single focused change later.
- [ ] **BI-012** — [sonnet] Write the short user-facing README and update any inline comments so the first cut is self-documenting.

## Completed