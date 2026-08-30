# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

- [ ] **TEST-EPIC-004** [medium]🧩 | imagegen-server-surface-tests — the BI-045/046/047 server surface writes to the operator's repo and has no tests on the layer that invokes its guard. Discovery supplied by audit-repo 2026-08-30. Surfaced by audit-repo 2026-08-30 (Theme: newest surface is the least tested)
  - [x] **TEST-004.2** [medium]🧩 | imagegen-route-tests — Completed 2026-08-30.
  - [ ] **TEST-004.3** [medium]🧩 | route-guard-coverage — table-driven test importing every exported handler in `app/api/imagegen/**`, asserting 403 on a cross-origin `Request`, so a new route added without `refuseUnguarded` fails CI.
  - [ ] **TEST-004.4** [light]🔧 | imagegen-client-tests — cover `lib/imagegenClient.ts` (URL/query construction, `Result` unwrapping, stored-root handling) via `vi.stubGlobal('fetch', ...)`.
  - [ ] **TEST-004.N** [light]🔧 | audit

## Medium

- [ ] **BI-048** [light]🔧 | file-route-hardening — in `app/api/imagegen/file/route.ts`, reject extensions outside `CONTENT_TYPES` instead of defaulting to `application/octet-stream`, and add `X-Content-Type-Options: nosniff` beside the existing `Cache-Control: no-store`. Defense in depth, not a boundary fix — the loopback/origin guard and realpath confinement already hold. Surfaced by audit-repo 2026-08-30 (Theme: file route thinner than it could be)
- [ ] **BI-049** [heavy]🧠 | useworkspace-decomposition-survey — `/ft-refactor` survey of `lib/useWorkspace.ts` (1164 L, 40-member `UseWorkspace` interface, 2.7x the next-largest non-test source file). Deliverable is a sequenced behavior-preserving split plan **or** a recorded keep-it-whole decision in `CLAUDE.md` — the hook is cohesive by purpose and the seams below it are already clean, so the survey may legitimately conclude "leave it". Surfaced by audit-repo 2026-08-30 (Theme: useWorkspace gravity well)

## Low

(none)

## Future Opportunities

- [ ] **DEPLOY-002** [medium]🧩 | next-16-and-override-drop — ride Dependabot's Next 15→16 PR and drop the `postcss`/`sharp` `overrides` block that `.github/workflows/ci.yml`'s audit-step comment marks as droppable at Next 16 (today that cleanup instruction lives only in the comment). Assess ESLint 9→10 and TypeScript 5→7 separately. Surfaced by audit-repo 2026-08-30 (Theme: config fanout)

## Completed

- [x] **CORE-003** [light]🔧 | eslint-next-verify-ignore — Completed 2026-08-30.
- [x] **CORE-002** [light]🔧 | build-clobbers-dev-server — Completed 2026-08-30.
- [x] **BI-044** [light]🔧 | adopt-symlink-path — Completed 2026-08-30.
- [x] **BI-047** [heavy]🧠 | imagegen-project-binding — Completed 2026-08-30.
- [x] **BI-046** [medium]🧩 | imagegen-folder-picker — Completed 2026-08-30.
- [x] **BI-045** [heavy]🧠 | imagegen-server-adapter — Completed 2026-08-29.
- [x] **DEPLOY-001** [light]🔧 | ci-secret-scan — Completed 2026-08-09.
- [x] **BI-043** [medium]🧩 | round-reingest-idempotence — Completed 2026-08-09.
- [x] **BI-EPIC-042** [heavy]🧠 | blob-url-lifetime — Completed 2026-08-09.
  - [x] **BI-042.2** [medium]🧩 | revocation-epoch — Completed 2026-08-09.
  - [x] **BI-042.3** [medium]🧩 | consumer-recovery-test — Completed 2026-08-09.
  - [x] **BI-042.4** [light]🔧 | memoize-imagegen-value — Completed 2026-08-09.
  - [x] **BI-042.N** [light]🔧 | audit — Completed 2026-08-09.
- [x] **BI-041** [light]🔧 | imagegenFs-path-walk-dedup — Completed 2026-08-09.
- [x] **BI-036** [medium]🧩 | unchecked-index-access — Completed 2026-08-09.
- [x] **BI-038** [medium]🧩 | resolved-image-restore-race — Completed 2026-08-09.
- [x] **BI-040** [light]🔧 | jsx-a11y-lint — Completed 2026-08-09.
- [x] **BI-039** [medium]🧩 | remaining-modal-focus — Completed 2026-08-09.
- [x] **BI-EPIC-035** [medium]🧩 | doc-currency-polish — Completed 2026-08-09.
  - [x] **BI-035.2** [medium]🧩 | vision-mode-rewrite — Completed 2026-08-09.
  - [x] **BI-035.3** [light]🔧 | sidebar-aria-labels — Completed 2026-08-09.
  - [x] **BI-035.4** [light]🔧 | review-sheet-src-escape — Completed 2026-08-09.
  - [x] **BI-035.5** [medium]🧩 | lightbox-focus-management — Completed 2026-08-09.
  - [x] **BI-035.N** [light]🔧 | audit — Completed 2026-08-09.
- [x] **TEST-003** [medium]🧩 | modal-chrome-tests — Completed 2026-08-09.
- [x] **TEST-EPIC-002** [heavy]🧠 | component-test-coverage — Completed 2026-08-09.
  - [x] **TEST-002.2** [medium]🧩 | review-grid-tests — Completed 2026-08-09.
  - [x] **TEST-002.3** [medium]🧩 | task-detail-tests — Completed 2026-08-09.
  - [x] **TEST-002.4** [medium]🧩 | lightbox-tests — Completed 2026-08-09.
  - [x] **TEST-002.5** [light]🔧 | gallery-bulk-tests — Completed 2026-08-09.
  - [x] **TEST-002.6** [light]🔧 | import-reference-tests — Completed 2026-08-09.
  - [x] **TEST-002.N** [light]🔧 | component-test-coverage audit — Completed 2026-08-09.
- [x] **BI-037** [light]🔧 | dependabot-actions-ecosystem — Completed 2026-08-09.
- [x] **BI-EPIC-034** [heavy]🧠 | dependency-vuln-gate — Completed 2026-08-09.
  - [x] **BI-034.2** [light]🔧 | relax-next-pin — Completed 2026-08-08.
  - [x] **BI-034.3** [medium]🧩 | ci-audit-step — Completed 2026-08-08.
  - [x] **BI-034.4** [light]🔧 | dependabot-config — Completed 2026-08-08.
  - [x] **BI-034.5** [medium]🧩 | secret-scan-decision — Completed 2026-08-08.
  - [x] **BI-034.N** [light]🔧 | dependency-vuln-gate audit — Completed 2026-08-09.
- [x] **BI-033** [medium]🧩 | delete-slug-guard — Completed 2026-08-08.
- [x] **BI-032** [medium]🧩 | approved-collision-guard — Completed 2026-08-08.
- [x] **BI-EPIC-031** [medium]🧩 | generation-mode-clarity — Completed 2026-08-08.
  - [x] **BI-031.2** [light]🔧 | provider-absent-ux — Completed 2026-08-08.
  - [x] **BI-031.3** [light]🔧 | readme-mode-labels — Completed 2026-08-08.
  - [x] **BI-031.4** [light]🔧 | orphan-config-cleanup — Completed 2026-08-08.
  - [x] **BI-031.5** [light]🔧 | generate-comment-drift — Completed 2026-08-08.
  - [x] **BI-031.N** [light]🔧 | audit — Completed 2026-08-08.
- [x] **BI-EPIC-030** [heavy]🧠 | silent-drift-surfacing — Completed 2026-08-08.
  - [x] **BI-030.2** [medium]🧩 | reversible-approve — Completed 2026-08-08.
  - [x] **BI-030.3** [medium]🧩 | rename-slug-guard — Completed 2026-08-08.
  - [x] **BI-030.4** [medium]🧩 | schema-mismatch-banner — Completed 2026-08-08.
  - [x] **BI-030.N** [light]🔧 | silent-drift-surfacing audit — Completed 2026-08-08.
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
