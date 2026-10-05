---
title: lib-quality
status: completed
tags: []
created: 2026-06-10
due:
related-tasks: [CORE-EPIC-001, CORE-001.1]
---

# CORE-001.2 | lib-quality

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[CORE-EPIC-001]] [[CORE-001.1]]

## 🎯 Goal

Fix the three medium lib/ findings from the CORE-001.1 Discovery inventory — the `generate()` stale-session race in `useWorkspace.ts`, the `as any` provider cast in `generate.ts`, and the triplicated blob-download/slugify idiom (consolidated into `storage.ts`) — with tests extended and suite/tsc/lint green.

## ✅ Acceptance

- [x] `generate.ts` accesses `globalThis.__grokImagineProvider` without the `as any` cast or its eslint-disable; provider bridge *shape* unchanged (constitution §4)
- [x] `generate()` commits post-await against the latest session — a concurrent same-session commit landing during the await is no longer dropped (regression test proves it)
- [x] Session switch mid-generate: the finished batch persists into the *originating* stored session without flipping the UI back (user-confirmed design; tested)
- [x] One shared blob-download helper + one `slugify` live in `storage.ts` and are consumed by `downloadSession`, `exportAll`, and `GalleryPanel.downloadImage`; no ad-hoc anchor/slug copies remain (`.jpg` extension untouched — owned by [[CORE-001.3]])
- [x] Low findings from [[CORE-001.1]] stay logged, untouched
- [x] `vitest run` suite green · `npx tsc --noEmit` clean · `npm run lint` clean

## 🧩 Subtasks

- [x] `lib/generate.ts` — replace the `(globalThis as any)` cast with the already-typed `globalThis.__grokImagineProvider`; drop the eslint-disable
- [x] `lib/storage.ts` — export `slugify`; add shared `downloadBlob(blob, filename)` DOM helper; refactor `downloadSession` onto it
- [x] `lib/useWorkspace.ts` — `exportAll` uses `downloadBlob` + `slugify`
- [x] `components/GalleryPanel.tsx` — `downloadImage` uses `downloadBlob` + `slugify` (keep the fetch + `window.open` CORS fallback and the `.jpg` suffix as-is)
- [x] `lib/useWorkspace.ts` — race fix: latest-session ref; post-await same-id → append to latest; different-id → persist batch to origin session in storage only
- [x] Add `@testing-library/react` devDependency; write `lib/useWorkspace.test.ts` covering the mid-generate commit race + the cross-session persist edge
- [x] Extend `lib/storage.test.ts` for the exported `slugify` / `downloadBlob` surface as needed
- [x] Verify: `vitest run` · `npx tsc --noEmit` · `npm run lint`

## 🔗 Related

- [[CORE-EPIC-001]] — parent epic (code-quality-sweep)
- [[CORE-001.1]] — Discovery that filed this task; findings inventory 1-4 (lib layer) is the canonical finding list
- [[BI-015]] — batch-generate depends on this task's stale-session race fix landing first

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** First implementation child of the active CORE-EPIC-001 sweep; filed today by the `.1` Discovery, all three findings re-verified at HEAD this session. BI-015 explicitly depends on the race fix landing first.

- [x] Read relevant source files

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code; flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

- **Sources read:** `lib/useWorkspace.ts`, `lib/generate.ts`, `lib/storage.ts`, `lib/workspace.ts` (appendIteration), `components/GalleryPanel.tsx`, `package.json`, `vitest.config.ts`.
- **Drift check: no drift.** All `.1`-cited locations verified at HEAD: race at `useWorkspace.ts:204-258` (line 246 commits the pre-await `session`); `as any` cast at `generate.ts:79-80` despite the typed `declare global` block at 63-68; download idiom triplicated at `storage.ts:218-229` / `useWorkspace.ts:310-322` / `GalleryPanel.tsx:27-43`; ad-hoc slug variants at `useWorkspace.ts:317` + `GalleryPanel.tsx:96`.
- **Archive skim:** `archive/core/CORE-001.1.md` (archived today) is the canonical findings inventory; it already path-grepped all 13 BI archives — no outstanding deferred debt on lib paths. Constitution carried forward: behavior-preserving, provider bridge shape frozen, surgical diffs, lows logged not fixed.
- **Safety note:** `appendIteration` is a no-op on unknown task ids (`workspace.ts:222-224`), so the post-await commit path is safe if the task was deleted during the await.
- **Slug consolidation implies a sanctioned filename change:** `exportAll` / `GalleryPanel` filenames move from `replace(/\s+/g,'-')` to `storage.ts`'s stricter `slugify` (strips non-alphanumerics). Download-filename-only; explicitly part of finding 3.
- **Test infra:** vitest + happy-dom, include `lib/**/*.test.ts`, no React renderer present.
- **Resolved clarifications (AskUserQuestion):** (1) switch-session-mid-generate → **persist batch to originating stored session only** (load/save via storage; no UI flip); (2) testing → **add `@testing-library/react` devDep** for a real `useWorkspace` race test.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — looked at neighboring code for an existing pattern to extend; justified the new shape if none fits

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:**

- **Pattern survey:** `storage.ts` already owns the SSR-guarded DOM download helper (`downloadSession`) — the shared `downloadBlob` extends that module's established shape. The latest-value `useRef` is the standard React idiom for async-callback staleness; no competing in-repo pattern.
- `lib/generate.ts` — `(globalThis as any)` cast + eslint-disable replaced with the already-typed `globalThis.__grokImagineProvider` (1 line). Redundant `typeof provider === 'function'` check left as-is (logged low; ".2 lows stay logged").
- `lib/storage.ts` — `slugify` exported; new exported `downloadBlob(blob, filename)` carries the SSR guard + object-URL anchor idiom; `downloadSession` refactored onto it (net −7 lines).
- `lib/useWorkspace.ts` — added `sessionRef` (latest-session ref, assigned each render); `generate()` builds the iteration draft from pre-await captures (provenance = inputs actually sent) and reconciles post-await: same session id → `commit(appendIterationTo(latest, …))`; switched session → `loadSession(originId)` + `saveSession` only (no UI flip), refreshing the session index. `exportAll` now 4 lines via `downloadBlob` + `slugify`.
- `components/GalleryPanel.tsx` — `downloadImage` keeps the fetch + `window.open` CORS fallback but delegates the anchor dance to `downloadBlob`; filename uses `slugify` (`.jpg` suffix untouched — [[CORE-001.3]]'s finding).
- Sanctioned filename change (per Discovery note): export/gallery download names now use the stricter `slugify` (e.g. `My Café!` → `my-caf`), download-filenames only.
- Tests: new `lib/useWorkspace.test.ts` (renderHook via new `@testing-library/react` devDep, deferred real-seam provider) pins both race behaviors; `lib/storage.test.ts` extended with `slugify` cases.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] (frontend) Asked the user for visual confirmation (👁️ prefix on the prose ask)

**Testing Notes:**

- `npx vitest run` — 4 files, **54/54 green** (50 baseline + 2 race tests + 2 slugify tests).
- `npx tsc --noEmit` — clean. `npm run lint` — clean.
- The race regression test fails against the pre-fix code by construction (concurrent rename was overwritten by the stale commit).
- 👁️ visual-confirmation ask bundled into the 📦 gate (frontend surface touched: GalleryPanel download path).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update
  - `README.md` — no change (export claim is generic; no filename/idiom claims)
  - `AGENTS.md` — no change
  - `CLAUDE.md` — no change
  - `.flowtron/PLAN.md` — updated by this closure (`.2` flipped to stub form)

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-06-10.` and tasknote moved to `.flowtron/tasknote/archive/core/`

- [x] Recap drafted (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

Fixed all three medium lib-layer findings from the [[CORE-001.1]] inventory, behavior-preserving per the epic constitution. (1) `generate()` stale-session race: a latest-session ref reconciles the post-await commit — concurrent edits survive, and a mid-generate session switch persists the batch into the originating stored session without flipping the UI (user-confirmed design). (2) `generate.ts` drops the `as any` provider cast in favor of the typed `declare global` binding (bridge shape frozen). (3) The triplicated blob-download/slugify idiom consolidates into exported `storage.downloadBlob` + `slugify`, consumed by `downloadSession`, `exportAll`, and `GalleryPanel.downloadImage`. New `@testing-library/react` devDep enables a real hook race test; suite 54/54, tsc + lint clean. Lows from `.1` remain logged, untouched.

**Archived:** 2026-06-10
