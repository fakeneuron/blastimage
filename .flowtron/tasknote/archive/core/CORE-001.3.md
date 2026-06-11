---
title: component-quality
status: completed
tags: []
created: 2026-06-10
due:
related-tasks: [CORE-EPIC-001, CORE-001.1, CORE-001.2]
---

# CORE-001.3 | component-quality

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[CORE-EPIC-001]] [[CORE-001.1]] [[CORE-001.2]]

## 🎯 Goal

Fix the two medium component findings from the CORE-001.1 discovery — GalleryPanel's hardcoded `.jpg` download filename and TaskDetail's hardcoded 4-placeholder generating skeleton — with low nits fixed only where already touched, and visual confirmation that the e2e flow is unchanged.

## ✅ Acceptance

- [x] Gallery download filename extension derives from the fetched blob's mime type (`image/png` → `.png`, `image/jpeg` → `.jpg`, `image/webp` → `.webp`; unknown/empty → `.jpg` fallback preserving current behavior); CORS `window.open` fallback unchanged
- [x] TaskDetail's generating skeleton renders `DEFAULT_BATCH_SIZE` placeholders from a single exported source of truth in `useWorkspace.ts` — no hardcoded `4`
- [x] Touched-file low nit fixed: `GalleryPanel.StarDisplay` rating typed `StarRating` (was `number`)
- [x] Untouched lows from [[CORE-001.1]] stay logged, untouched (modal-shell mirror, `iterateFor!`, effect-deps disable)
- [x] `vitest run` suite green · `npx tsc --noEmit` clean · `npm run lint` clean
- [x] 👁️ visual confirmation that the e2e flow is unchanged (ask bundled into the 📦 gate)

## 🧩 Subtasks

- [x] `lib/storage.ts` — add small exported mime→extension helper next to `downloadBlob` (testable per lib testing culture)
- [x] `lib/storage.test.ts` — unit-test the helper (png / jpeg / webp / unknown / empty)
- [x] `components/GalleryPanel.tsx` — `downloadImage` appends the mime-derived extension from `blob.type`; call site passes the base name without `.jpg`
- [x] `components/GalleryPanel.tsx` — `StarDisplay` rating prop typed `StarRating` (touched-file low nit)
- [x] `lib/useWorkspace.ts` — export `DEFAULT_BATCH_SIZE`
- [x] `components/TaskDetail.tsx` — skeleton count imports `DEFAULT_BATCH_SIZE`
- [x] Verify: `vitest run` · `npx tsc --noEmit` · `npm run lint`
- [x] 👁️ ask user for visual e2e confirmation

## 🔗 Related

- [[CORE-EPIC-001]] — parent epic: code-quality sweep of app/, components/, lib/, root configs
- [[CORE-001.1]] — discovery that filed these component findings
- [[CORE-001.2]] — lib-quality predecessor (stale-session race, provider cast, download consolidation)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Second implementation child of the active CORE-EPIC-001 sweep; [[CORE-001.2]] (the lib predecessor whose `downloadBlob`/`slugify` consolidation this builds on) closed today, and both medium component findings re-verified at HEAD this session.

- [x] Read relevant source files

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code; flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

- **Sources read:** `components/GalleryPanel.tsx`, `components/TaskDetail.tsx`, `lib/useWorkspace.ts` (DEFAULT_BATCH_SIZE block), `lib/storage.ts` (slugify/downloadBlob), `lib/types.ts` (BatchSize, StarRating, ApprovedImage.rating), `lib/storage.test.ts` (slugify test shape).
- **Archive skim:** `archive/core/CORE-001.1.md` is the canonical findings inventory (component findings 5-7); `archive/core/CORE-001.2.md` consolidated the download idiom — `GalleryPanel.downloadImage` already delegates to `storage.downloadBlob` + `slugify`, with `.2` explicitly leaving the `.jpg` suffix to this task. Constitution carried forward: behavior-preserving, surgical diffs, lows fixed only where already touched.
- **Drift check: minor line drift only, concepts intact.** `.1` cited `GalleryPanel.tsx:96` → the `.jpg` literal now sits at `:90` (file reshaped by `.2`'s consolidation — expected). `TaskDetail.tsx:136` hardcoded `Array.from({ length: 4 })` — still exact. `DEFAULT_BATCH_SIZE` cited at `useWorkspace.ts:53` → now `:55`, still module-private.
- **Fix shapes:** (a) `downloadImage` fetches the image and already holds a `Blob` — derive the extension from `blob.type` at download time (data-URL fetches carry the source mime, e.g. `image/png` for typical Grok output); unknown/empty mime falls back to `.jpg` (current behavior). Helper lives in `storage.ts` next to `downloadBlob` (download-filename concern; unit-testable — components have no test infra per epic clarification #3). CORS fallback path has no filename → unchanged. (b) Export `DEFAULT_BATCH_SIZE` from `useWorkspace.ts` and import in `TaskDetail` — minimal single-source fix; the skeleton always renders during a default-size generate (`useWorkspace.ts:248`).
- **Touched-file low nit in scope:** `StarDisplay` rating `number` → `StarRating` (type-only; `ApprovedImage.rating` is already `StarRating` at `types.ts:188`). Untouched lows (FeedbackModal/IterateModal mirror, `Workspace.tsx` `iterateFor!`, TaskDetail effect-deps disable) stay logged.
- **No clarifications needed.** Assumptions: extension derived at download time from `blob.type` (no `ApprovedImage` shape change — localStorage contract stays stable per constitution §3); `.jpg` fallback for unknown mime preserves today's worst case; mime→ext map covers png/jpeg/webp only (Grok output surface).

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — looked at neighboring code for an existing pattern to extend; justified the new shape if none fits

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

- **Pattern survey:** `storage.ts` owns download-filename concerns (`slugify` + `downloadBlob`, shape established by [[CORE-001.2]]) — `imageExtension` extends that module and its `storage.test.ts` coverage. Exporting the existing `DEFAULT_BATCH_SIZE` constant is the minimal single-source fix; no new shape introduced.
- `lib/storage.ts` — new exported `imageExtension(mime)` (png/jpeg/webp; `jpg` fallback for unknown/empty), placed beside `downloadBlob`.
- `components/GalleryPanel.tsx` — `downloadImage(url, basename)` appends `.${imageExtension(blob.type)}` from the fetched blob; call site drops the hardcoded `.jpg`; CORS `window.open` fallback untouched (no filename on that path). Touched-file low nit: `StarDisplay` rating prop typed `StarRating` (type-only; `ApprovedImage.rating` already `StarRating`).
- `lib/useWorkspace.ts` — `DEFAULT_BATCH_SIZE` exported with a one-line JSDoc naming both consumers.
- `components/TaskDetail.tsx` — skeleton renders `Array.from({ length: DEFAULT_BATCH_SIZE })`.
- Untouched lows (modal-shell mirror, `Workspace.tsx` `iterateFor!`, TaskDetail effect-deps disable) stay logged in [[CORE-001.1]], untouched.
- Tests: `lib/storage.test.ts` extended with an `imageExtension` describe block (known mimes + fallback cases).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] (frontend) Asked the user for visual confirmation (👁️ prefix on the prose ask)

**Testing Notes:**

- `npx vitest run` — 4 files, **56/56 green** (54 baseline + 2 new `imageExtension` tests).
- `npx tsc --noEmit` — clean. `npm run lint` — clean.
- 👁️ visual-confirmation ask bundled into the 📦 gate (frontend surface touched: GalleryPanel download button, TaskDetail generating skeleton).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update
  - `README.md` — no change (export/download prose is generic; no filename-extension or batch-count claims)
  - `AGENTS.md` — no change
  - `CLAUDE.md` — no change
  - `.flowtron/PLAN.md` — updated by this closure (`.3` flipped to stub form)

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-06-10.` and tasknote moved to `.flowtron/tasknote/archive/core/`

- [x] Recap drafted (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

Fixed both medium component findings from the [[CORE-001.1]] inventory, behavior-preserving per the epic constitution. (1) Gallery download filenames no longer mislabel the format: a new tested `storage.imageExtension(mime)` helper derives the extension from the fetched blob's actual mime type (png/jpeg/webp; `.jpg` fallback for unknown), extending the `downloadBlob`/`slugify` consolidation [[CORE-001.2]] established; the CORS `window.open` fallback is untouched. (2) TaskDetail's generating skeleton now renders `DEFAULT_BATCH_SIZE` placeholders from the newly exported `useWorkspace.ts` constant — the silent duplicate `4` is gone. One touched-file low nit fixed (`StarDisplay` rating typed `StarRating`); all untouched lows stay logged. Suite 56/56, tsc + lint clean. No `ApprovedImage`/localStorage shape change (constitution §3).

**Archived:** 2026-06-10
