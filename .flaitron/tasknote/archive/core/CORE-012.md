---
title: brand-chamber-reference
status: completed
tags: []
created: 2026-10-16
due:
related-tasks: [CORE-011, CORE-6]
touches:
  - brand/assets.json
  - brand/PROMPTS.md
  - brand/README.md
  - brand/chamber-reference.*
---

# CORE-012 | brand-chamber-reference

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[CORE-011]]

## 🎯 Goal

Generate blastimage's 16:9 `chamber-reference`, record `origin: generated` and the prompt, and declare the asset at review `draft` so a person can confirm `in-review` → `approved`.

## ✅ Acceptance

- [x] The raster is png, jpeg, or webp, at least 1280×720, and an exact 16:9 ratio (`width * 9 == height * 16`) — `python3` header dimension check on `brand/chamber-reference.*`
- [x] `brand/PROMPTS.md` has a `chamber-reference` section recording `origin: generated` and the prompt, and says this file is not `promo-16x9.webp` — `grep -n 'origin: generated' brand/PROMPTS.md`
- [x] `brand/assets.json` is schema 2, keeps project id `2c478fff-f154-46f1-8efe-98c8680d3d3e`, and declares `chamber-reference` with role `visual-reference` — `python3` JSON check
- [x] Before the person's confirm, that asset's `review.state` is `draft`; after confirm it is `approved` — `python3` JSON check
- [x] `symbol`, `favicon`, `promo` keep their paths and stay taste-approved; only their review field becomes the v2 object dated 2026-09-24 with CORE-6 evidence — `python3` JSON check
- [x] A filled `in-review` → `approved` transition checks clean — `bash ~/Code/natabula/scripts/brand-workflow.sh transition <file>`
- [x] The manifest validates against committed bytes — `bash ~/Code/natabula/scripts/validate-brand.sh` on an isolated snapshot, then on the closure SHA
- [x] A person confirms the pixels — `👁️` (producer taste; no checker decides it)

## 🧩 Subtasks

- [x] Write the generation prompt (see 🔄 Handoff)
- [x] Generate the still in Grok Imagine (in a Grok Build session) and save it in `brand/`
- [x] Check ratio/minimum size; keep only an uncropped, un-upscaled output
- [x] Record `origin: generated` and the prompt in `brand/PROMPTS.md`
- [x] Opt `brand/assets.json` into schema 2 and declare `chamber-reference` at review `draft`
- [x] Point `brand/README.md` at the v2 manifest and the new asset
- [x] Validate an isolated committed snapshot
- [x] Check the approval transition, ask the person to confirm, then flip to `approved`

## 🔗 Related

- [[CORE-011]] — related-decision: v1 manifest this asset extends
- [[CORE-6]] — kit fill; the producer taste approval the existing assets carry
- flaitron CORE-800 — sibling producer doing the same asset (in flight; precedent for shape)
- fakeneuron FE-127 — consumer import, blocked on this approval and on flaitron CORE-800

## 🔄 Handoff

Handed from a Claude Code session to Grok Build on 2026-10-16 because Grok can run Imagine in-session. Resume with "continue CORE-012"; `/ft-task CORE-012` refuses an in-progress note by design.

- **Goal + Acceptance status** — Phase 1 is complete. Phase 2 has started: `brand/assets.json` is already on `schema_version: 2`, and `symbol` / `favicon` / `promo` have v2 review objects (`approved`, `2026-09-24`, evidence `.flaitron/tasknote/archive/core/CORE-6.md`). That diff is uncommitted in the working tree. No Acceptance criterion is green yet, and the still does not exist.
- **Key decisions** — The still is generated in Grok Imagine, with the operator's cinematic portal stills as the only image inputs; `brand/logo.svg` is not an input. The mark appears as its essence: one photo tile bursting into a halo of candidate images, not the flat icon. The chamber keeps flaitron CORE-800's dark ribbed tunnel and green cell ring, and the hologram glows violet `#7c3aed` / plasma-orange `#ff4d00`. Use `audience: public`, `background: dark`, `origin: generated`, `source_paths: ["brand/logo.svg"]` (the mark the prompt describes), and `note_path: brand/PROMPTS.md`. Keep the generator's file type and size when the ratio holds, with no crop and no upscale. Mirror flaitron's `brand/PROMPTS.md` §"chamber-reference" and its assets.json entry for shape.
- **Open questions** — Whether the pixels are good is the operator's 👁️ call. Nothing else is open.
- **Relevant paths** — `brand/assets.json`, `brand/PROMPTS.md`, `brand/README.md`, `brand/chamber-reference.<ext>`. Natabula (read-only): `templates/brand/profiles-v1.json` (`chamber-reference`), `templates/brand/assets-v2.schema.json`, `templates/brand/examples/visual-reference-approval.json`, `scripts/brand-workflow.sh`, `scripts/validate-brand.sh`. Precedent: `~/Code/flaitron/brand/` (CORE-800).
- **Next step** — Generate the still with this prompt:

  > A wide cinematic chamber seen from inside a dark ribbed organic tunnel, looking through a round portal like these chambers. A thick crown of green bioluminescent cells rings the aperture. The hologram filling the opening is a loose, glowing impression of one image blasting into many: a single violet photo tile at the centre with a faint mountain and sun inside it, bursting outward into a halo of smaller floating image cards and plasma-orange rays of light, one card glowing brighter like a keeper. Violet and orange light in soft mist, fluid and luminous, dark plated ribs widening into a 16:9 frame. No text.

  Record the prompt that produced the shipped pixels, including any second pass. Then run the remaining Subtasks in order. Commit an isolated snapshot for `validate-brand.sh` (CORE-011's method; the validator reads committed blobs only). Keep the asset at `draft` until the operator's 👁️ confirm, then write `approved`.

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The kit declares no `visual-reference`, and fakeneuron's consumer contract requests `chamber-reference`; FE-127 is blocked on this asset.

- [x] Read relevant source files — broad or unknown read set: consider a **probe** (`templates/subagent-probe-template.md`)

- [x] **Best Practices Review** — code or module-boundary work: responsibilities, dependency direction, abstractions, duplication (otherwise `N/A` with reason)

- [x] **Archive skim** — grep `.flaitron/tasknote/archive/<area>/` for the paths in scope and follow Related / `supersedes` / ⚠️ pointers; more than ~3 hits → hand the reading to a **probe**; re-check `<area>` against the README table before logging "no prior tasknotes"

- [x] **Drift check** — cited paths, lines, and hypotheses match current code, **and** the plan matches its `PLAN.md` line and the SPEC (read both, don't recall them); flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared (omit only with no file deliverable)

**Discovery Notes:**

- Area `archive/core/` per README table. Archive hit for `brand/assets.json` / `brand/PROMPTS.md`: CORE-011 only. Its load-bearing rule: `validate-brand.sh` reads committed blobs, so preflight on an isolated Git snapshot, then rerun on the closure SHA. CORE-6 (kit fill, 2026-09-24) is the taste-approval evidence for the three existing assets.
- Natabula `templates/brand/profiles-v1.json` `chamber-reference`: role `visual-reference`, png/jpeg/webp, fit `minimum-ratio`, min 1280×720, exact 16:9, full-frame safe area, no tunnel crop. Fakeneuron owns tunnel architecture, creatures, camera, lighting, keyframes, video, card composition.
- Drift: the PLAN line's `examples/visual-reference-approval.json` lives at natabula `templates/brand/examples/visual-reference-approval.json`. No other drift.
- Manifest v1 review is `pending|approved`; it cannot store `draft`/`in-review`. Schema v2 (`assets-v2.schema.json`) replaces it with `review: {state, updated_on, evidence_paths}`. Declaring at `draft` therefore means opting into v2. `marketing_readiness` stays omitted (undeclared).
- Precedent: flaitron CORE-800 (same PLAN line, in flight, uncommitted) opted into v2, shipped `brand/chamber-reference.jpg` 1280×720 generated by the operator in Grok Imagine using their cinematic portal stills as style references: a round ribbed aperture inside a dark organic tunnel, a ring of green bioluminescent cells, a cyan hologram of the project's mark filling the opening. The mark was carried by the prompt, not by placing the raster.
- This session has no image-generation tool; CORE-6's assets were code-drawn. A cinematic still matching CORE-800 needs the operator to run Grok Imagine.
- Clarifications (operator, 2026-10-16): (1) the operator generates the still in Grok Imagine from a prompt written here, with their portal stills as references; (2) the mark appears as its essence (a photo tile bursting into a halo of candidates), not the flat icon; (3) the chamber keeps CORE-800's dark ribbed tunnel and green cell ring so the two chambers read as one series, while the hologram glows in blastimage's violet `#7c3aed` and plasma-orange `#ff4d00`.
- Assumptions: `audience: public` (the consumer presents it; taste approval does not set it); the file keeps the generator's type and size when the ratio holds; the transition JSON is a scratch check file, not a kit file; `approved` is not written until the person confirms the pixels.

Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an existing pattern or justified a new shape

- [x] **Minimal refactor gate** — refactored only for Acceptance or touched-path coherence; deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

- 2026-10-16 (Claude Code): `brand/assets.json` → `schema_version: 2`. The three existing assets' `review: "approved"` strings became `{state: approved, updated_on: 2026-09-24, evidence_paths: [.flaitron/tasknote/archive/core/CORE-6.md]}`, and nothing else in the file changed. The `chamber-reference` entry waits for the file. Handed to Grok Build for in-session Imagine (see 🔄 Handoff).
- 2026-10-16 (Grok Build): Pattern is flaitron CORE-800's chamber entry, not a new schema. No refactor. Tests: N/A, no executable behavior; the Natabula validator is the check.
- The operator's private portal stills were not in this session. The image input was flaitron's shipped `brand/chamber-reference.jpg` (the series chamber those stills produced). `brand/logo.svg` was not an image input. `source_paths` is `["brand/logo.svg"]` because that is the mark the prompt describes and the path has to live in this repo.
- Shipped `brand/chamber-reference.jpg`, 1280×720 JPEG, the model's own bytes (245211). One pass. No crop, no upscale. Review stays `draft`. The `approved` flip waits for the person's confirm.
- 2026-10-17: the operator liked this chamber and called the hologram too image-heavy. They described flaitron (a plan and a memory; an idea growing into an actuated project) and said to use judgement and proceed. The growth still was filed on flaitron. This blastimage file is unchanged.
- 2026-10-17: the operator liked both stills and asked to keep them for different uses. Flaitron `chamber-reference.jpg` stays the robot and cog. `chamber-growth.jpg` is the growth still. Committed as `efae32d7`. This blastimage file is unchanged.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) Asked the user for visual confirmation (`👁️ **CONFIRM**` on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Targeted suite: N/A, no executable behavior. Lint/type-check: N/A, the diff is a JPEG plus JSON and Markdown. Changed-code duplication / dead code: N/A, no code. README now names schema v2 and says the still is not the promo.

```text
python3 JPEG SOF on brand/chamber-reference.jpg → 0
    jpeg 1280 720, width*9 == height*16, 245211 bytes
grep -n 'origin: generated' brand/PROMPTS.md → 0
    2:origin: generated
    83:- origin: generated
python3 JSON assertions on brand/assets.json → 0
    schema 2, project 2c478fff-f154-46f1-8efe-98c8680d3d3e
    chamber-reference role visual-reference, review draft
    symbol/favicon/promo paths unchanged, review approved 2026-09-24, CORE-6 evidence
bash ~/Code/natabula/scripts/brand-workflow.sh transition /tmp/core-012-approve.json → 0
    {"axis":"asset-review","kind":"transition","ok":true,"to":"approved"}
bash ~/Code/natabula/scripts/validate-brand.sh /tmp/blastimage-core-012.2tW3Re/producer --revision b8e5d6a9b20f9d6c5e2900d0e125e3605dc0ec57 → 0
    status valid, manifest_valid true, four assets valid, findings empty
```

The transition document checks the shape only. Snapshot `b8e5d6a` is not product history. An earlier snapshot (`9dab2d9`) validated the same pixels before the source_paths sentence.

2026-10-17 confirm. The person said the chamber reference looks good. Review is `approved`, `updated_on` 2026-10-17.

```text
python3 JSON assertions on brand/assets.json → 0
    chamber-reference review approved, updated_on 2026-10-17
    symbol/favicon/promo paths unchanged, review approved 2026-09-24
```

Closure-SHA validation runs on the closure commit.

External review (read-only probe, not the author): blockers none. Note — PROMPTS named the flaitron image input but did not say why `source_paths` is only `brand/logo.svg`. Fixed in place in `brand/PROMPTS.md` and `brand/README.md`. Note — README's v2 wording is outside the Acceptance bullets and matches the manifest. Accepted; that wording is the README subtask. Neither note reopens a phase. The probe did not view the pixels, re-run the transition checker, or re-run the validator.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: "no change" or the update

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — anything the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

Doc-drift: no change. The sweep set was not edited. The brand kit sits outside that list.

Learnings: N/A.

**Final Summary:**

Blastimage now has a 16:9 chamber reference: one photo bursting into candidate cards inside the shared chamber. The person confirmed those pixels on 2026-10-17. Review is `approved`. That is producer taste, not export approval.

Changed: `brand/chamber-reference.jpg` (new, 1280×720 JPEG), `brand/assets.json` (schema 2; symbol, favicon, and promo stay approved, dated 2026-09-24; chamber-reference approved 2026-10-17), `brand/PROMPTS.md` (origin generated and the prompt), `brand/README.md` (v2 manifest; this still is not the promo). No refactor. Verification is the Phase 3 receipt. Doc-drift: no change. Declared 4 files, changed 4. The kit gains one uncounted visual reference. `promo-16x9.webp` stays.

**Archived:** 2026-10-17
