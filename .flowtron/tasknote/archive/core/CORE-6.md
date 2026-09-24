---
title: brand-kit-fill
status: completed
tags: []
created: 2026-09-24
due:
related-tasks: []
touches:
  - brand/
  - app/favicon.ico
  - app/icon.png
  - app/apple-icon.png
---

# CORE-6 | brand-kit-fill

[← PLAN.md](../PLAN.md) · ✅ Completed

## 🎯 Goal

Land blastimage's `brand/` identity kit (logo.svg, favicon.svg, filled BRAND.md, PROMPTS.md) per natabula DESIGN-STANDARDS §"Brand kit" Fill recipe, attended, without churning the working tab icon.

## ✅ Acceptance

- [x] `brand/` holds `BRAND.md`, `logo.svg`, `favicon.svg`, `promo-16x9.webp` (4/4) plus uncounted `README.md` + `PROMPTS.md` — `ls brand/`
- [x] `BRAND.md` front-matter fills `tagline` (≤8 w), `one_liner` (≤25 w), `description` (≤80 w) — word-count script over the front-matter
- [x] `logo.svg` / `favicon.svg` have no embedded raster and no `fill="none"` shapes; favicon has a square viewBox — `grep -cE '<image|data:image|fill="none"' brand/*.svg` → 0 and viewBox inspection
- [x] `promo-16x9.webp` is exactly 1600×900 — `magick identify brand/promo-16x9.webp`
- [x] Next.js tab icons (`app/favicon.ico` 48/32/16, `app/icon.png` 32², `app/apple-icon.png` 180² opaque) cut from `brand/favicon.svg` — `magick identify app/favicon.ico app/icon.png app/apple-icon.png`; `npm run build:verify` passes
- [x] `PROMPTS.md` records origin `generated` (code-drawn, no image model), per-asset design brief + geometry, and what-not-to-change — `judgment`: provenance prose
- [x] Operator confirmed the chosen mark (raster stand-in) and the final SVGs + promo + tab icon — `👁️`

## 🧩 Subtasks

- [x] Draw 2–3 "burst + frame" SVG concepts (100-unit box, filled shapes only); render 256/32/16 px on light + dark into a contact sheet → 👁️ CONFIRM one
- [x] Redraw the chosen concept cleanly as `brand/logo.svg`; derive `brand/favicon.svg` (square, 16 px simplification if needed)
- [x] Code-draw a 1600×900 promo SVG in the fakeneuron card-banner idiom (dark void, neon accent — style only, no fakeneuron pixels) → `brand/promo-16x9.webp` via magick
- [x] Copy natabula `templates/brand/{BRAND,README,PROMPTS}.md` → `brand/`; fill BRAND.md (caps) and PROMPTS.md
- [x] Cut `app/favicon.ico` (replace create-next-app default), `app/icon.png`, `app/apple-icon.png` from `brand/favicon.svg` per STACK-TENDENCIES §Favicons (Next.js file convention)
- [x] 👁️ CONFIRM final SVGs, promo, and the live tab icon on :3003

## 🔗 Related

- natabula NAT-315 — routed this ticket; NAT-EPIC-310 — fleet kit program

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** No `brand/` dir exists; the only image asset outside `test-fixtures/` is `app/favicon.ico` (25 931 B, md5 `c30c7d42…` — the create-next-app default, not a mark). Recipe row "No mark" → **Generate**. Ticket still open and accurate.

- [x] Read relevant source files — when the read set is broad or its shape is unknown, consider isolating the search in a **probe** (`templates/subagent-probe-template.md`) and recording only its distilled return in Discovery Notes

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason) — `N/A`: asset/markdown deliverable; the only code-adjacent change is swapping Next.js file-convention icons in `app/` (no source edits; `app/layout.tsx` metadata untouched — Next auto-links `icon.png` / `apple-icon.png` / `favicon.ico`).

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope (prefer YAML `touches:` when set); also follow Related / `supersedes` / ⚠️ pointers; when the grep returns more than a handful of notes (~3 is a fair line), prefer handing the reading to a **probe**; log relevant findings in Discovery Notes before re-interpreting the task; an absent or empty `archive/<area>/` is a prompt to re-check `<area>` against the README table before logging "no prior tasknotes" — a derived-and-wrong folder is indistinguishable from a genuinely empty one — `archive/core/` (README table: `CORE-*` → `archive/core/`) holds CORE-001.1–.5, 002–004; `grep -il 'favicon\|brand'` across all archives → only TEST-004.3 / TEST-004.N, both incidental (route-guard tests), nothing on identity assets. No prior tasknotes on this surface.

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line (read both, don't recall them); flag any drift before re-interpreting the task — Recipe re-read live from `~/Code/natabula/docs/DESIGN-STANDARDS.md` §"Brand kit" and `STACK-TENDENCIES.md` §Favicons. Two operator-directed departures from the PLAN line, recorded not silent: (1) PLAN says "leave working tab trio" — operator chose to replace the create-next-app default with icons cut from the kit (the default is not a *brand* trio, so nothing branded is churned); (2) PLAN says "promo only at real 1600×900" — operator asked for a promo; it will be a native 1600×900 code-drawn render (not upscaled, not mined from `fakeneuron/public/projects/`, which the standard forbids), so the dimension rule holds. The Imagine raster step is replaced by magick renders of code-drawn concepts — the caobunga CBN-229 / email-manager CORE-7 precedent.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit (omit only on a task with no file deliverable)

**Discovery Notes:**

- Clarifications (AskUserQuestion): raster → **I draw, you confirm** (code-drawn concepts rendered via magick, as caobunga/email-manager did); concept → **burst + frame**; tab icon → **derive now** (replace default `app/favicon.ico`, add `app/icon.png`); promo → operator asked for one styled like the fakeneuron card banners.
- Sibling kit precedent: `caobunga/brand`, `email-manager/brand` — origin `generated`, `model: ""  # code-drawn in-session`, 100-unit viewBox, single-fill filled paths, design brief in place of a prompt, geometry recorded. No sibling kit has a promo yet.
- fakeneuron card-banner idiom (`fakeneuron/ASSETS.md`): dark void `#0a0a0a`, neon accents (cyan `#00f0ff`, magenta `#c026d3`, plasma orange `#ff4d00`), procedural SVG → webp via magick. Style reference only.
- Tooling: `magick` delegates SVG to `rsvg-convert` (full renderer), but keep filled shapes per §Favicons regardless.
- Next.js convention: `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png` auto-linked — no `<link>` / metadata edits needed.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

- Pattern survey: followed the caobunga CBN-229 / email-manager CORE-7 kit shape (100-unit viewBox, filled paths, cubic-κ rounded corners, `evenodd` knockouts, design brief standing in for a prompt). No new shape.
- Minimal refactor gate: none. No source code touched; `app/layout.tsx` metadata unchanged, since Next auto-links the file-convention icons.
- Concept round 1 used navy `#1f1147` ink, which vanished on `#0a0a0a`, so it was re-rendered in violet `#7c3aed` before the operator saw it. Operator picked **B** (photo tile + ray ring).
- The favicon is a deliberate 16 px simplification of B: bigger tile, 8 thicker rays (vs 12). Ray tips were first computed at r=50, which put vertices at −0.02 / 100.02, so r1 was pulled to 49.5 to stay inside the viewBox.
- Promo, first render: the card grid collided with the wordmark and tagline. Re-laid as top and bottom card bands with one orange-outlined "keeper". Native 1600×900, 42.7 KB.
- Tab icons: `app/favicon.ico` (replaced create-next-app default), `app/icon.png`, `app/apple-icon.png` (opaque `#0a0a0a`), cut from `brand/favicon.svg` per STACK-TENDENCIES §Favicons.
- Tests: `N/A`, since these are asset and markdown deliverables with no behavior to test.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- 👁️ CONFIRM: operator picked concept B, then approved the final logo, favicon, promo, live tab icon, and blurb ("go").

- Targeted tests: `N/A` (no code changed). Lint/type-check covered by `npm run build:verify` (Next build runs `tsc`) → exit 0. Routes list `/icon.png` + `/apple-icon.png`. The `imagegenServerFs` import-trace notice is pre-existing and unrelated.
- Verification receipt:
  - `ls brand/` → BRAND.md favicon.svg logo.svg promo-16x9.webp PROMPTS.md README.md (4/4 counted + 2 uncounted) → 0
  - front-matter word count script → tagline 6 / one_liner 22 / description 76 (caps 8/25/80) → 0
  - `grep -cE '<image|data:image|fill="none"' brand/*.svg` → 0 matches per file; both viewBoxes `0 0 100 100` (square); favicon vertices inside 0..100 (`grep -oE -- '-[0-9.]+|10[0-9]\.[0-9]+'` → none)
  - `magick identify brand/promo-16x9.webp` → WEBP 1600x900 → 0
  - `magick identify app/favicon.ico app/icon.png app/apple-icon.png` → ICO 48/32/16, PNG 32×32, PNG 180×180 → 0
  - `curl localhost:3003/` → `<link rel="icon" …favicon.ico sizes="48x48">`, `icon.png 32x32`, `apple-touch-icon 180x180`; each asset 200
  - Structural quality: no code, dead or otherwise, and no public-surface growth; `brand/` holds only the six sanctioned files, with no stray source SVG for the promo (its geometry is recorded in PROMPTS.md).
- External review: `N/A`. The diff is binary and SVG assets plus markdown copy with no code path to grade. Acceptance is decided by the receipt above and the operator 👁️.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flowtron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Doc-drift verdicts:** `README.md` no change · `AGENTS.md` no change · `CLAUDE.md` no change · `.flowtron/PLAN.md` CORE-6 flipped to stub · `VISION.md` no change (BRAND.md quotes it, never the reverse) · `docs/ADOPT.md` no change · `docs/WORKFLOW.md` no change · `docs/REVIEW-LOOP.md` no change · `docs/GROK-AGENT.md` no change.

**Learnings:** `N/A`. The kit recipe lives in natabula DESIGN-STANDARDS; nothing blastimage-specific belongs in the always-loaded layer.

**Final Summary:**

Landed blastimage's brand kit at 4/4: `brand/{BRAND.md, logo.svg, favicon.svg, promo-16x9.webp}` plus `README.md` and `PROMPTS.md`. The mark (a violet photo tile ringed by orange rays) and a 16 px-simplified favicon are code-drawn filled SVGs with no embedded raster. The promo is a native 1600×900 code-drawn render in the fakeneuron banner style. The create-next-app default `app/favicon.ico` was replaced, and `app/icon.png` + `app/apple-icon.png` were added, all cut from `brand/favicon.svg`. Verified by `build:verify` (exit 0), `magick identify`, the SVG grep, the front-matter word count, the live `curl` of :3003, and operator 👁️.

- **touches reconciliation:** declared `brand/`, `app/favicon.ico`, `app/icon.png`, `app/apple-icon.png`; actual = the same plus this tasknote and `.flowtron/PLAN.md` (workflow files). No undeclared deliverable paths.
- **Departures from the PLAN line (operator-directed in Discovery):** tab icon derived rather than left; promo produced as a native code-drawn 1600×900.
- **Maintainability:** PROMPTS.md records every coordinate and colour, so a later redraw needs no transcript.

**Archived:** 2026-09-24
