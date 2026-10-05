---
title: shared-result-and-strings
status: completed
tags: []
created: 2026-09-25
due:
related-tasks: []
touches:
  - lib/types.ts
  - lib/storage.ts
  - lib/ImagegenContext.tsx
  - lib/imageBlob.ts
  - lib/imagegenRoute.ts
  - lib/useWorkspace.ts
---

# CORE-7 | shared-result-and-strings

[← PLAN.md](../PLAN.md) · 🟢 In progress

## 🎯 Goal

Move `Result<T>` from `lib/storage.ts` to `lib/types.ts` (re-exported from storage), and replace the five literal "Link your imagegen folder first (🔗 in the sidebar)." copies with one exported constant.

## ✅ Acceptance

- [x] `Result<T>` is defined in `lib/types.ts` and re-exported from `lib/storage.ts` — `grep -q "type Result" lib/types.ts && grep -q "export type { Result }" lib/storage.ts`
- [x] Existing `Result` consumers (6 files importing from `./storage`) still typecheck unmodified — `npx tsc --noEmit` → 0
- [x] One exported constant in `lib/types.ts` carries the "Link your imagegen folder first (🔗 in the sidebar)." string; the 5 literal copies (`lib/imageBlob.ts`, `lib/imagegenRoute.ts`, `lib/useWorkspace.ts` ×2, `lib/ImagegenContext.tsx`) are replaced with references to it — `grep -rn "Link your imagegen folder first (🔗 in the sidebar)\." lib | grep -v "\.test\." | grep -v "lib/types.ts"` → empty
- [x] `npm test` passes (existing string-matching tests unaffected since rendered text is unchanged) → 668/668 passed
- [x] `npm run lint` clean on changed files → 0

## 🧩 Subtasks

- [ ] Add `Result<T>` type and an exported `UNLINKED_FOLDER_MESSAGE` constant to `lib/types.ts`
- [ ] `lib/storage.ts` — drop local `Result<T>` def, re-export from `./types`
- [ ] `lib/ImagegenContext.tsx` — replace local `UNLINKED` const with import of `UNLINKED_FOLDER_MESSAGE` (aliased `as UNLINKED` to keep the 5 internal call sites untouched)
- [ ] `lib/imageBlob.ts:34` — use the constant instead of the literal
- [ ] `lib/imagegenRoute.ts:35` — use the constant instead of the literal
- [ ] `lib/useWorkspace.ts:989,1167` — use the constant instead of the literal
- [ ] Run tests, lint, typecheck

## 🔗 Related

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Both parts of the finding still hold at HEAD: `Result<T>` is defined at `lib/storage.ts:57`; the exact literal `'Link your imagegen folder first (🔗 in the sidebar).'` (with trailing period) appears exactly 5 times in production code (`lib/imageBlob.ts:34`, `lib/imagegenRoute.ts:35`, `lib/useWorkspace.ts:989`, `lib/useWorkspace.ts:1167`, and as the value of the local `UNLINKED` const at `lib/ImagegenContext.tsx:60`) — matching the PLAN.md line's "five literal copies" exactly. A sixth, similar-looking occurrence in `components/DeleteTaskModal.tsx:125` is a different string (no trailing period, flows into "...if you want the approved copies removed too.") and is correctly out of scope — forcing it onto the same constant would produce "…sidebar). if you want…", a grammar break.

- [x] Read relevant source files — `lib/storage.ts` (Result def + 6 import sites via grep), `lib/types.ts` (leaf module, zero imports, already carries one non-type export `SCHEMA_VERSION` — the natural, cycle-free home for both the type and the new constant), `lib/ImagegenContext.tsx` (existing local `UNLINKED` const, used 5× internally), `lib/imageBlob.ts`, `lib/imagegenRoute.ts`, `lib/useWorkspace.ts`.

- [x] **Best Practices Review** — `lib/types.ts` is deliberately type-only plus `SCHEMA_VERSION`; adding `Result<T>` and one string constant fits that shape and avoids a circular import (`imageBlob.ts` is referenced in `ImagegenContext.tsx`'s own docstring as the reason the root arrives as an argument rather than an import, so the shared constant must not live in `ImagegenContext.tsx` itself). Keeping `storage.ts`'s re-export means the 6 existing `import type { Result } from './storage'` sites need no edits — minimal diff, per the PLAN line's explicit "re-export from storage for now."

- [x] **Archive skim** — `archive/core/` (4 hits: CORE-001.1/.2/.3, CORE-5). CORE-001.2 and CORE-001.3 already established `lib/storage.ts` as the home for small shared helpers (`slugify`, `downloadBlob`, `imageExtension`) via the same "export once, remove duplication" pattern — precedent, not a blocker. CORE-5 touched `ImagegenContext.tsx` for unrelated strict-mode fixes. No drift, no open dependency.

- [x] **Drift check** — `lib/storage.ts:57` still `export type Result<T> = { ok: true; value: T } | { ok: false; error: string };`; the five-copies count reconfirmed by exact-string grep above. PLAN.md line and SPEC contract both consistent with what Discovery found.

- [x] No clarifications needed (--fast). Assumption: the new string constant's exact wording matches the existing literal verbatim (including the emoji and trailing period) so no rendered UI text or existing test assertion changes.

- [x] Subtasks above populated; `touches:` declared.

**Discovery Notes:** See Relevance Assessment + Best Practices Review above for the full grounding (exact-string grep results, import-graph check, archive precedent).

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — `lib/types.ts` already carries one non-type export (`SCHEMA_VERSION`) as its declared exception to type-only; `Result<T>` and the new `UNLINKED_FOLDER_MESSAGE` constant extend that same exception rather than inventing a new shape. `storage.ts` re-exporting a type it no longer defines mirrors how other lib modules already forward types (e.g. `imagegenRoute.ts` importing `Result` from `storage.ts` today).

- [x] **Minimal refactor gate** — no refactor beyond the requested move. `lib/ImagegenContext.tsx` keeps its internal `UNLINKED` name via `import { UNLINKED_FOLDER_MESSAGE as UNLINKED } from './types'` so its 5 internal call sites needed no edits — deliberately minimal diff.

- [x] Implemented the minimal solution — see Implementation Notes.

- [x] Updated/added tests for non-trivial behavior — N/A. Pure refactor: rendered/thrown text is byte-identical, so no test assertions changed and none were added; full suite re-run below confirms no regressions.

**Implementation Notes:**

- `lib/types.ts` — added `export type Result<T> = { ok: true; value: T } | { ok: false; error: string };` and `export const UNLINKED_FOLDER_MESSAGE = 'Link your imagegen folder first (🔗 in the sidebar).';` beside `SCHEMA_VERSION`.
- `lib/storage.ts` — removed the local `Result<T>` definition; now `import { ..., type Result, ... } from './types'` plus `export type { Result } from './types';` so its 6 existing external consumers (`import type { Result } from './storage'`) needed no changes.
- `lib/ImagegenContext.tsx` — dropped the local `const UNLINKED = '...'`; imports `UNLINKED_FOLDER_MESSAGE as UNLINKED` from `./types` instead. Its 5 internal usages (`error: UNLINKED`) are untouched.
- `lib/imageBlob.ts:34`, `lib/imagegenRoute.ts:35`, `lib/useWorkspace.ts:989,1167` — literal string replaced with `UNLINKED_FOLDER_MESSAGE` imported from `./types`.
- `components/DeleteTaskModal.tsx` — untouched, confirmed out of scope in Discovery (different string, not one of the five exact copies).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code (full `npm test` — fast enough on this project to run whole)

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — see Testing Notes. No avoidable duplication, dead code, unexplained complexity, or public-surface growth beyond the two new intentional exports (`Result`, `UNLINKED_FOLDER_MESSAGE`) from `lib/types.ts`; no stale code-facing docs (types.ts's file-header docstring updated to note the shared constants).

- [x] **External review** — `/code-review medium` (background agent) graded the diff against `## ✅ Acceptance`: typecheck clean, all 6 `import type { Result } from './storage'` call sites verified to still resolve via the re-export, no remaining hardcoded duplicates, no correctness/cleanup/altitude/convention issues. **Findings: none.**

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

```text
npx tsc --noEmit → 0
npm run lint     → 0
npm test         → 0  (33 files, 668 tests passed)
```

Diff: `lib/ImagegenContext.tsx` (−2 net), `lib/imageBlob.ts` (+2), `lib/imagegenRoute.ts` (+2), `lib/storage.ts` (+3 net), `lib/types.ts` (+8 net), `lib/useWorkspace.ts` (+3 net) — 6 files, 19 insertions / 12 deletions.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`, `AGENTS.md`, `CLAUDE.md`, `.flowtron/PLAN.md` (only its own task line, updated by this closure), `VISION.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md` — none reference `Result<T>` or the literal string; no change needed on any.

- [x] Closed — all `## ✅ Acceptance` criteria ticked. YAML `status:` flipped to `completed`, PLAN.md line to be flipped to stub form and moved to top of `## Completed`, tasknote to be moved to `.flowtron/tasknote/archive/core/`.

- [x] **Evidence-based recap** — see Final Summary below.

- [x] **Learnings** — N/A. No durable insight beyond what's already recorded in Discovery Notes (the exact-string grep discipline that separated the 5 in-scope copies from the 1 similar-but-out-of-scope one in `DeleteTaskModal.tsx`); not generalizable enough to push into `AGENTS.md`.

**Final Summary:**

Moved `Result<T>` from `lib/storage.ts` to `lib/types.ts` (re-exported from `storage.ts` so its 6 existing consumers needed no changes), and consolidated the 5 exact literal copies of the "Link your imagegen folder first (🔗 in the sidebar)." string into one exported `UNLINKED_FOLDER_MESSAGE` constant in `lib/types.ts`. `lib/ImagegenContext.tsx`'s local `UNLINKED` const was replaced with an aliased import so its 5 internal call sites stayed untouched. `components/DeleteTaskModal.tsx`'s similar-looking phrase was confirmed out of scope (different string, embedded mid-sentence with no trailing period) and left as-is.

- **Changed files (6):** `lib/types.ts` (+8 net), `lib/storage.ts` (+3 net), `lib/ImagegenContext.tsx` (−2 net), `lib/imageBlob.ts` (+2), `lib/imagegenRoute.ts` (+2), `lib/useWorkspace.ts` (+3 net) — 19 insertions / 12 deletions total.
- **Verification:** `npx tsc --noEmit` → 0; `npm run lint` → 0; `npm test` → 668/668 passed.
- **Refactors:** none beyond the requested move/consolidation — deliberately minimal diff (aliased import kept `ImagegenContext.tsx`'s 5 internal sites unchanged; `storage.ts` re-export kept its 6 external consumers unchanged).
- **Documentation:** no drift found in any AI-referenced doc; `lib/types.ts`'s file-header docstring updated in-place to note the shared constants it now carries.
- **`touches:` reconciliation:** declared 6 paths, changed 6 — no undeclared paths.
- **Maintainability effect:** one canonical `Result<T>` definition and one canonical unlinked-folder message, both in the dependency-free leaf module (`lib/types.ts`), eliminate the risk of the 5 literal copies drifting out of sync on a future wording change.

**Archived:** 2026-09-25
