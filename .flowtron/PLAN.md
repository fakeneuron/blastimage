# blastimage — PLAN.md

## Vision

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. Users define multiple prompt tasks, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

See [.flowtron/core/SPEC.md](core/SPEC.md) for the canonical workflow contract.

## High

- [ ] **BI-EPIC-042** [heavy]🧠 | blob-url-lifetime — `resolveDisplayUrl` hands out object URLs and revokes them (LRU eviction, same-round reload) on a schedule mounted `<img>` elements cannot observe, so a revoked image stays blank until remount. Give revocation an observable signal. Discovery supplied by audit-repo 2026-08-09. Surfaced by audit-repo 2026-08-09 (Theme: Object-URL lifetime is the one place the seam discipline doesn't reach)
  - [x] **BI-042.2** [medium]🧩 | revocation-epoch — Completed 2026-08-09.
  - [x] **BI-042.3** [medium]🧩 | consumer-recovery-test — Completed 2026-08-09.
  - [x] **BI-042.4** [light]🔧 | memoize-imagegen-value — Completed 2026-08-09.
  - [ ] **BI-042.N** [light]🔧 | audit

## Medium

- [ ] **BI-043** [medium]🧩 | round-reingest-idempotence — `ingestRoundBatch` always appends, but a `/blast-generate` rerun rewrites `rounds/r<N>/` in place; loading the same round twice yields duplicate iterations and, once both copies are approved, two gallery entries and two exported files for one image. Replace an existing round's iteration instead of appending, or refuse the duplicate load with a stated reason. Surfaced by audit-repo 2026-08-09 (Theme: Round ingest is append-only; the disk it mirrors is not)
- [ ] **DEPLOY-001** [light]🔧 | ci-secret-scan — add gitleaks to `ci.yml` as the backstop the per-clone `pre-commit` hook cannot be (arming writes an untracked `.git/hooks/pre-commit`, so a fresh checkout has zero coverage). Must run **before** `Build` or exclude `.next/` — `gitleaks dir .` ignores `.gitignore` and yields 6 false `generic-api-key` hits on Next's own `previewModeSigningKey`/`encryptionKey`. Verify with a `ghp_`-prefixed positive control; see the BI-034.5 archive note. Surfaced by audit-repo 2026-08-09 (Theme: Gates are strong at build time, thinner at commit time)

## Low

(none)

## Future Opportunities

(none)

## Completed

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
