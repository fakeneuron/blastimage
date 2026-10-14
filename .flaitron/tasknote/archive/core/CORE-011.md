---
title: brand-pilot-manifest
status: completed
tags: [brand]
created: 2026-10-14
due:
related-tasks: [CORE-6]
touches:
  - brand/assets.json
  - brand/README.md
---

# CORE-011 | brand-pilot-manifest

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[CORE-6]]

## 🎯 Goal

Declare and validate the existing producer-owned brand kit for Natabula NAT-415.5 with stable identity, copy evidence and truthful review/provenance, preserving artwork and separate export approval.

## ✅ Acceptance

- [x] Manifest v1 has one allocated UUID v4, canonical copy source/evidence and exactly the three existing assets with matching media/dimensions — pinned Natabula `scripts/validate-brand.py` on a committed review snapshot; exact closure revision rechecked after commit.
- [x] Producer public eligibility and approved review are supported by CORE-6; generated code-drawn provenance retains PROMPTS and records unavailable intermediate source honestly — `judgment` against CORE-6, PROMPTS and brand/README.md.
- [x] Card and promo landscape demand are available; social-og is honestly missing without crop/upscale — pinned validator `--requests` with the new project ID, plus coverage-result assertions.
- [x] BRAND, PROMPTS, marks, promo and installed icons are byte-identical to entry HEAD — SHA-256 comparison against `git show a48f38a86e6d131d55b2682310981b2474c8efb2:<path>`.
- [x] brand/README.md describes the filled kit, stable IDs, original provenance and separate later export approval; no exporter approval/package/import or outside-repo edit occurs — `judgment` and `git diff --name-only`.

## 🧩 Subtasks

- [x] Declare the UUID, three copy-evidence lists and symbol/favicon/promo records using the pinned schema.
- [x] Update kit README with evidence, provenance limits, optional absences and producer/export boundary.
- [x] Validate an isolated committed snapshot with pinned tooling, assert media/coverage/preservation, and obtain a read-only external review.
- [x] Sweep docs, archive and commit this task atomically; validate the resulting exact producer revision.

## 🔗 Related

- [[CORE-6]] — existing artwork, copy and recorded operator visual confirmation.
- Natabula NAT-415.5 — owns the later revision-bound export approval and end-to-end pilot; this task supplies producer declarations only.

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md.
- [x] **Relevance Assessment** — **Verdict:** Proceed. **Rationale:** Existing kit is complete, but brand/assets.json is absent; additive metadata remains necessary.
- [x] Read relevant source files.
- [x] **Best Practices Review** — N/A for application module boundaries; metadata uses the existing producer schema and HQ validator, with no parallel code or copied schemas.
- [x] **Archive skim** — README table maps CORE-* to archive/core/; only CORE-6 matched brand paths and was read in full. No supersedes/pointer followups apply.
- [x] **Drift check** — schema, validator, task line and SPEC reread; paths/media and CORE-6 evidence match current files. README still describes an unfilled skeleton; correct that in scope. No scope deviation.
- [x] Clarifications or explicit assumptions recorded.
- [x] Acceptance, ordered subtasks and YAML touches populated.

**Discovery Notes:**

- Entry status was clean. No active, archived or sidequest CORE-011 note exists. README resolves CORE-* to archive/core/; [heavy] is satisfied by the active reasoning model.
- Natabula contract/tooling is pinned at a78a1d9562f8aafb6c6c9a7b1c746d76f895c4cc (NAT-415.4). Read DESIGN-STANDARDS §Brand manifest v1, assets-v1 schema/example, requests schema, CommitReader, media/path/graph checks, exporter public-provenance projection and parked NAT-415.5.
- No clarifications needed. Allocate one UUID v4 (2c478fff-f154-46f1-8efe-98c8680d3d3e), immutable for this product; preserve canonical copy and every existing pixel. Public identity-kit intent plus CORE-6's recorded final visual/copy approval supports audience public/review approved; this is producer review, not exact export approval. No unsupported lifecycle/release/visibility/availability/URL declaration is inferred from the remote.
- Preserve PROMPTS origin generated and empty model: these are code-drawn, not model-generated. Favicon is manually simplified/redrawn; promo is a new original composition incorporating the logo, with its transient SVG source unretained. No reproducible derivation recipe is invented. App icon derivatives remain outside brand/ and this manifest.
- Existing viewBoxes are 100×100; promo is 1600×900. Card/promo can use the original promo; social-og's 40:21 ratio cannot. No optional screenshot/social/card asset, crop guidance or additional artwork is fabricated.
- Validator reads committed blobs only. Use an isolated local Git snapshot before closure, then rerun on the exact closure SHA. This validates real producer bytes without export or a premature deliverable-only commit.
- Downstream impact: active DEPLOY-005/006 concern dependency upgrades, unaffected. NAT-415.5 already owns approval/export/import and pending consumer FE-122.1; no new deferred operator step or producer duplicate is created.
- Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended pinned assets.example/schema; canonical copy remains in BRAND and prose provenance in PROMPTS.
- [x] **Minimal refactor gate** — no refactor; application code and HQ exporter stay untouched.
- [x] Implemented the minimal solution.
- [x] Tests for non-trivial behavior or N/A — N/A for new application tests; use the existing committed-blob validator and coverage predicates on actual assets.

**Implementation Notes:**

- Added only brand/assets.json and updated brand/README.md. All historical copy, PROMPTS, artwork and installed icons remain untouched.
- Declared the existing three assets with generated/code-drawn provenance, canonical committed evidence and source references; omitted ungrounded public metadata and reproducible-derivation claims.
- Pinned validator code/schema copied read-only from Natabula a78a1d9562f8aafb6c6c9a7b1c746d76f895c4cc into /private/tmp/blastimage-core-011-s26rqtiz/natabula. Review snapshot 1b548575b151c7387c228a20a23cf00579885923 in /private/tmp/blastimage-core-011-s26rqtiz/producer contains actual current producer files. It is an isolated validation commit, not product history or an exported package.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted validation.
- [x] Lint/type-check or N/A — N/A: JSON/Markdown only, no app source or runtime change; strict JSON/schema/media/path validation is the relevant check.
- [x] **Verification receipt** and structural assessment.
- [x] **External review** and finding dispositions.
- [x] Frontend visual confirmation or N/A — N/A: no rendered surface/pixels changed; CORE-6 confirmation is historical evidence, not a new request.

**Testing Notes:**

- Pinned command: `uv run --no-project --with-requirements /private/tmp/blastimage-core-011-s26rqtiz/natabula/scripts/brand-requirements.txt python /private/tmp/blastimage-core-011-s26rqtiz/natabula/scripts/validate-brand.py /private/tmp/blastimage-core-011-s26rqtiz/producer --revision 1b548575b151c7387c228a20a23cf00579885923 --requests /private/tmp/blastimage-core-011-s26rqtiz/requests.json` → 0. Three valid public assets; no findings; copy word counts 6/22/76 remain within 8/25/80.
- Coverage result assertions → 0: card-landscape=available (promo), promo-landscape=available (promo), social-og=missing. This is suitability only, not approval/export evidence.
- Python byte comparison of the eight preserved paths against `git show a48f38a86e6d131d55b2682310981b2474c8efb2:<path>` → 0; all byte-identical. Baseline hashes agree with NAT-415.5's prior receipts.
- `git diff --check` → 0. No avoidable duplicate copy/schema, dead code, new application API or code-facing doc drift; no code refactor needed.
- A redundant nested `subprocess.run(uv ...)` check returned exit 2 under sandbox access restrictions after its preservation checks passed. Re-running the direct pinned uv invocation with cache access returned 0 and output assertions passed; no producer finding was suppressed.
- CORE-6 and PROMPTS support public identity intent, producer review and generated/code-drawn history. README explicitly distinguishes review from export approval and unretained source from a reproducible derivation.
- External review (`brand_review`), read-only non-author context: no blockers or notes. Independently confirmed UUID v4, all eight preserved files and manifest/README equality with the validated snapshot. It inspected schema and coverage rules but did not rerun the validator, validate closure bookkeeping, or perform visual/export/import work.
- Post-commit exact-revision check uses the same pinned command with producer `/Users/fakeneuron/Code/blastimage` and `--revision <closure-SHA>`; its terminal receipt identifies the actual closure revision without a self-referential SHA in this note.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — README.md, AGENTS.md, CLAUDE.md, VISION.md, docs/ADOPT.md, docs/WORKFLOW.md, docs/REVIEW-LOOP.md and docs/GROK-AGENT.md: no change (application behavior unchanged); .flaitron/PLAN.md: CORE-011 closure stub. brand/README.md updated from deposited skeleton to filled manifest/evidence record.
- [x] Closed — Acceptance, completed status, dated archive, PLAN stub and archive move.
- [x] **Evidence-based recap** and scope reconciliation.
- [x] **Learnings** — N/A for always-loaded project doctrine; brand-specific identity/review/provenance rules live in brand/README.md and the canonical Natabula contract.

**Final Summary:**

Declared the unchanged CORE-6 kit as a valid manifest v1 with stable project UUID, canonical copy evidence and three public, producer-reviewed assets. Recorded code-drawn provenance limits and separate later export approval; card/promo demand passes and social-og is honestly missing.

- Deliverables: brand/assets.json (85 lines) and brand/README.md (+54/-4); no app code, pixels, copy or PROMPTS changed. Pinned validation and coverage assertions pass; eight preservation comparisons pass; independent review has no findings.
- Scope reconciliation: declared two deliverable paths, changed the same two. No undeclared deliverables; own PLAN row/tasknote excluded.
- Refactors: none needed. Documentation verdict recorded above. Maintainability: consumer/HQ can validate identity, evidence and exact source media without guessing filenames, review or provenance.
- Existing Natabula NAT-415.5 remains owner of revision-bound approval/export and the consumer import/derivation pilot; this closure supplies the producer prerequisite, not a completed end-to-end pilot. No new deferred operator step created and no cross-repo write, export or push performed.
- Proposed closure message: `feat: CORE-011 — declare brand pilot manifest`.
- Codex wiring observation: repo has Claude links but no .agents/skills/ft-task. The pinned Codex wrapper/SOP was applied directly; discovery wiring is optional and outside this manifest deliverable.

**Archived:** 2026-10-14
