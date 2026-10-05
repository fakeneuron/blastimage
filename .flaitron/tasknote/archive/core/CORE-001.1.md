---
title: code-quality-sweep discovery
status: in-progress
tags: []
created: 2026-06-10
due:
related-tasks: [CORE-EPIC-001]
---

# CORE-001.1 | code-quality-sweep discovery

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[CORE-EPIC-001]]

## 🎯 Goal

Scope the `CORE-EPIC-001` epic (`code-quality-sweep`) before any implementation child fires; deliverable = filed concrete child scopes for `CORE-001.2..4` in `.flowtron/PLAN.md`.

## ✅ Acceptance

- [ ] Shared design surface inventoried for the epic (sources, adopter wiring, SPEC contract impact, templates) — captured in Discovery Notes
- [ ] Open scoping questions resolved with the user via AskUserQuestion — captured in a "Resolved scoping" table in Discovery Notes
- [ ] Concrete child scopes for CORE-001.2 .. CORE-001.4 filed in .flowtron/PLAN.md (each line under the 50w target / 70w hard cap per SPEC/tasknote-selection.md §"PLAN.md filing-discipline thresholds")
- [ ] Audit line CORE-001.5 reviewed and confirmed as-filed (or rewritten if the Discovery surfaces a scope shift)
- [ ] Phase 4 doc-drift sweep at closure: typically no AI-referenced doc updates land in pure Discovery filing (contract edits land inside the implementation children)

## 🧩 Subtasks

- [ ] Inventory shared design surface (source files, adopter-wiring surfaces, SPEC contract impact, templates) — log in Discovery Notes
- [ ] Skim .flowtron/tasknote/archive/bi/ for relevant precedents — log load-bearing findings in Discovery Notes
- [ ] Drift check on cited paths and concepts — flag any drift before re-interpreting the epic
- [ ] Surface open scoping questions via AskUserQuestion (typical: per-child shortname + scope + adopter-wiring policy) — record answers in a "Resolved scoping" table
- [ ] Draft refined long descriptions for CORE-001.2 .. CORE-001.4; word-count each (≤50w target / 70w hard cap)
- [ ] Phase 2: write the drafted child lines into .flowtron/PLAN.md under CORE-EPIC-001 with 2-space indent
- [ ] Phase 3: markdown mental-pass on the PLAN.md edits (grammar / indent / cross-refs)
- [ ] Phase 4: doc-drift sweep + flip .1 PLAN line to stub form + archive tasknote

## 🔗 Related

- [[CORE-EPIC-001]] — parent epic (code-quality-sweep)

## 🧭 Deep Pre-pass

### Constitution

Principles and non-negotiables for `CORE-EPIC-001 | code-quality-sweep`:

1. **Scope boundary** — the sweep covers blastimage's own surface only: `app/`, `components/`, `lib/`, and root configs (`tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vitest.config.ts`, `package.json`). The `.flowtron/core/` submodule is flowtron-owned and strictly out of scope.
2. **Behavior-preserving** — quality work, not feature work. The end-to-end flow (define task → attach refs → generate → review → iterate → export with manifest) must behave identically after every child closes.
3. **localStorage contract stability** — persisted shapes (storage keys, serialized session/task/image types) stay backward-compatible. If a finding demands a shape change, the fix ships explicit, tested migration code — never silent breakage of existing local sessions.
4. **Grok provider bridge frozen** — the `globalThis.__grokImagineProvider` interface (`docs/GROK-AGENT.md`) is an external contract with Grok Build; its shape does not change in this epic.
5. **Surgical diffs** — every changed line traces to a logged quality finding. No speculative abstractions, no future-proofing, no drive-by edits to adjacent code.
6. **Verification gates** — vitest suite green, `npx tsc --noEmit` clean, `npm run lint` clean at every child closure. Non-trivial fixes extend the existing `lib/*.test.ts` testing culture.
7. **Findings before fixes** — the `.1` Discovery only inventories and files; all fixes land inside filed children (`.2..4`). No fixing during Discovery.

Out of scope: new features (BI-015 batch-generate, BI-017 quota guard stay separate), the hosted-webapp variation, dependency major-version bumps unless a finding directly requires one.

### Specification

**Epic deliverable.** A reviewed, quality-hardened blastimage app surface plus a written findings inventory. The `.1` Discovery performs the actual deep dive (read every file in scope, run lint/tsc/tests, log findings by severity); children `.2..4` land the fixes; `.5` audits the result. The anticipated partition below is by layer — Discovery's findings may re-cut it.

**Anticipated children** (refined + filed at Phase 2 of this Discovery):

- **`.2` — lib layer (logic & persistence):** `lib/types.ts`, `lib/storage.ts`, `lib/workspace.ts`, `lib/useWorkspace.ts`, `lib/generate.ts`. Deliverable: type-safety hardening (no `any`/unsafe casts), error-handling robustness (localStorage quota / JSON parse failures), dead-code removal, correctness fixes surfaced by Discovery. Acceptance shape: each fix traces to an inventory finding; tests extended for changed behavior; suite + tsc + lint green.
- **`.3` — component layer (React quality):** `app/` + `components/` (9 files). Deliverable: prop/state typing rigor, duplicated-logic consolidation, hook-usage correctness (effect deps, stale closures), unused props/handlers removal. Acceptance shape: same finding-traced discipline; visual confirmation that the e2e flow is unchanged.
- **`.4` — config, docs & cross-cutting:** root configs (`tsconfig.json`, `eslint.config.mjs`, `next.config.ts`, `vitest.config.ts`), `package.json` script hygiene, stale-doc drift (`README.md`, `AGENTS.md`, `docs/`), plus any cross-cutting findings that don't belong to one layer (naming consistency, repo-root strays like `tsconfig.tsbuildinfo` / `SCRATCHPAD.md` / `PLAN.legacy.md` disposition). Acceptance shape: config tightening must not break build/test; doc claims verified against code.

**Interactions.** `.2` lands first (the lib layer is the foundation the components consume); `.3` builds on the cleaned lib contracts; `.4` is independent and can run anytime after Discovery; `.5` audit closes the bracket per SPEC/epic.md.

### Clarifications

| # | Question | Resolution |
|---|----------|------------|
| 1 | Severity threshold for fixes? | **Fix high+medium; log low.** Children fix correctness/robustness/typing findings; pure nits get logged in the inventory and optionally filed as Low PLAN follow-ups. |
| 2 | Repo-root strays (`SCRATCHPAD.md`, `PLAN.legacy.md`, committed `tsconfig.tsbuildinfo`) — clean or report? | **Clean up in `.4`.** `tsconfig.tsbuildinfo` gitignored + removed; `SCRATCHPAD.md` / `PLAN.legacy.md` proposed for deletion with per-file confirmation at fix time. |
| 3 | Component test coverage (none today) in scope for `.3`? | **Only for changed behavior.** Tests extended where fixes change logic; no broad new component test suite in this epic. |

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** User explicitly invoked `/ft-epic-discovery --deep` to file a code-quality deep-dive epic. The repo has shipped its full v1 feature loop (BI-001..BI-016); a sweep before further feature work (BI-014/BI-015) is well-timed and matches SPEC/epic.md's "code sweep" archetype.

- [x] Read relevant source files

- [x] **Archive skim** — skim `.flowtron/tasknote/archive/<area>/` for prior tasknotes that touched the source paths in scope; log relevant findings in Discovery Notes before re-interpreting the task

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code; flag any drift before re-interpreting the task

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Toolchain baseline (2026-06-10):** `npx tsc --noEmit` clean · `npm run lint` clean · vitest 50/50 green (3 files, lib-only coverage). The codebase is in better shape than a typical sweep target — no high-severity findings.

**Findings inventory** (severity: H/M/L; per pre-pass clarification #1, children fix M+, lows are logged):

*Lib layer (→ `.2`):*
1. **(M)** `lib/useWorkspace.ts:204-258` — `generate()` stale-closure race: after `await generateBatch(...)`, `appendIterationTo(session, ...)` commits against the session captured at call time; any commit landed during the await (rename, decision, feedback) is silently overwritten.
2. **(M)** `lib/generate.ts:79-80` — `(globalThis as any).__grokImagineProvider` cast + eslint-disable despite the `declare global var __grokImagineProvider` block directly above; `globalThis.__grokImagineProvider` is already typed. (Bridge *shape* unchanged — constitution §4 respected.)
3. **(M)** Triplicated blob-download anchor idiom: `lib/storage.ts:218-229` (`downloadSession`), `lib/useWorkspace.ts:310-322` (`exportAll`), `components/GalleryPanel.tsx:27-43` (`downloadImage`) — plus two ad-hoc `replace(/\s+/g,'-')` slug variants vs `storage.ts`'s `slugify`. Consolidate.
4. **(L, log-only)** `resolveRefData` uses `||` not `??`; redundant `provider && typeof provider === 'function'`; `generate()` catch discards error detail; `switchSession` neither refreshes `sessions` nor clears `error`; `deleteSession` `setItem` unguarded; `approvedImages` recomputed every render (unmemoized — fine at this scale).

*Component layer (→ `.3`):*
5. **(M)** `components/GalleryPanel.tsx:96` — download filename hardcodes `.jpg` regardless of actual image type (Grok data URLs are typically PNG) — mislabeled downloads.
6. **(M)** `components/TaskDetail.tsx:136` — generating-skeleton hardcodes 4 placeholders, silently duplicating `DEFAULT_BATCH_SIZE` (private to `useWorkspace.ts:53`).
7. **(L, log-only)** FeedbackModal/IterateModal duplicated modal-shell + Esc-handler idiom (documented as a deliberate mirror); `Workspace.tsx:44` `iterateFor!` non-null assertion; `GalleryPanel.StarDisplay` rating typed `number` not `StarRating`; `TaskDetail` effect-deps eslint-disable (documented, intentional).

*Config / docs / strays (→ `.4`):*
8. **(M, user-authorized)** `PLAN.legacy.md` is git-tracked and fully superseded by `.flowtron/PLAN.md` — delete with per-file confirmation (pre-pass clarification #2). `SCRATCHPAD.md` + `tsconfig.tsbuildinfo` are *not* tracked (no action beyond verifying `.gitignore` covers `*.tsbuildinfo`).
9. **(L)** `npm test` runs watch-mode `vitest` while `test:run` exists — align script/docs intent; `next.config.ts` is empty boilerplate (fine); verify README/AGENTS claims against code after `.2`/`.3` land.

**Archive skim:** all 13 BI tasknotes skimmed via path-grep. Load-bearing: BI-013 logged README "mock picsum" drift as a light follow-up → already fixed by BI-016 (README has no mock/picsum mention today). BI-009 consumed all of BI-006/BI-007's deferred gaps (unblurred-prompt loss, `useAsReference` consumption). No outstanding deferred debt in the archives.

**Drift check:** no drift — the brief cited no paths; all paths/concepts inventoried above verified directly against HEAD this session. One pre-pass correction: the Specification anticipated `tsconfig.tsbuildinfo` as a *committed* stray; it is untracked (finding 8 narrowed accordingly).

**Resolved scoping** (carried from `## 🧭 Deep Pre-pass` §Clarifications): fix threshold = M+ with lows logged · root strays cleaned in `.4` with per-file confirm · component tests only for changed behavior. No new clarifications surfaced during Phase 1 — the anticipated `.2`/`.3`/`.4` partition holds against the findings.

**Drafted child lines** (word-counted; filed in Phase 2):
- `.2` lib-quality (~42w) · `.3` component-quality (~36w) · `.4` config-docs-strays (~35w) — all under the 50w target.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — looked at neighboring code for an existing pattern to extend; justified the new shape if none fits

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior (N/A — pure PLAN.md filing, no executable code surface)

**Implementation Notes:**

- Filed 3 child lines (`CORE-001.2..4`) into `.flowtron/PLAN.md` under `CORE-EPIC-001`, between the `.1` and `.5` lines, 2-space indent, `[opus]` on each. Word counts: `.2` ≈45w · `.3` ≈38w · `.4` ≈37w — all under the 50w target / 70w cap.
- Cohort-filing pattern followed from the flowtron CORE-EPIC-057 precedent (bold ID, `[model]`, `| shortname`, em-dash, nested indent).
- No audit-number bump — Discovery confirmed N=5 as filed; `.5` audit line confirmed as-is.
- **Downstream-impact scan:** BI-015 classified *stale* (Generate All would amplify the `.2` stale-session race) → user-confirmed edit appending "Depends on CORE-001.2 (stale-session race fix) landing first." BI-014, BI-017, Future Opportunities: unaffected, left as-is.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code (N/A — markdown-only)

- [x] Ran lint/type-check on changed code (N/A — markdown-only)

- [x] (frontend) Asked the user for visual confirmation (N/A — no frontend surface)

**Testing Notes:**

Markdown mental-pass on the PLAN.md block: 2-space child indent preserved on all 5 cohort lines · bold `**CORE-001.N**` IDs intact · `[opus]` present on every new line · shortnames ≤30 chars (`lib-quality` 11, `component-quality` 17, `config-docs-strays` 18) · em-dash separators consistent · all lines ≤70w · no trailing whitespace · reconcile-edited BI-015 line still parses (grammar/indent/cross-ref intact).

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update
  - `README.md` — no change (pure Discovery filing; code untouched)
  - `AGENTS.md` — no change
  - `CLAUDE.md` — no change
  - `.flowtron/PLAN.md` — updated by this task (epic cohort + BI-015 reconcile edit); no residual drift

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-06-10.` and tasknote moved to `.flowtron/tasknote/archive/core/`

- [x] Recap drafted (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

**Final Summary:**

Filed and scoped `CORE-EPIC-001 | code-quality-sweep` end-to-end in one motion: deep pre-pass (constitution → specification → clarifications, all user-gated), then a full Phase 1 deep dive over the app surface (~2,300 lines: app/, components/, lib/, root configs). Baseline is healthy — tsc, lint, and 50/50 tests all green; **zero high-severity findings**. Five medium findings drive the children: `.2` lib-quality (stale-session race in `generate()`, as-any provider cast, triplicated blob-download/slugify idiom), `.3` component-quality (.jpg filename mislabel, hardcoded skeleton batch size), `.4` config-docs-strays (PLAN.legacy.md deletion, gitignore/test-script/doc verification). Low findings logged in Discovery Notes for the children to pick up only where already touching. Downstream scan: BI-015 gained an explicit dependency on `.2`. N=5 confirmed; parent description refined at closure.

**Archived:** 2026-06-10
