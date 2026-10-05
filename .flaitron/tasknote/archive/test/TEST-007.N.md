---
title: playwright-e2e audit
status: completed
tags: []
created: 2026-09-10
due:
related-tasks: [TEST-EPIC-007, TEST-007.2, TEST-007.3, TEST-007.4]
---

# TEST-007.N | playwright-e2e audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-007]]

## 🎯 Goal

Verify the completed `TEST-EPIC-007` (`playwright-e2e`) cohort sits coherently in the codebase: cumulative doc-drift sweep across `.flowtron/tasknote/README.md` §"AI-referenced docs", naming/style consistency across the cohort's deliverables, and follow-up filings for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces
- [x] Audit findings recorded in Implementation Notes; misses cited as candidates for `/ft-file-followup <NEW-ID>` filing (filed AFTER audit closure to preserve `/ft-file-followup`'s filing-discipline gate)
- [x] Single `feat: TEST-007.N — audit TEST-EPIC-007` (or `chore: ...` if no code edits land) commit lands
- [x] PLAN.md line for `TEST-007.N` flipped to stub form `Completed YYYY-MM-DD.`
- [x] Tasknote moved to `.flowtron/tasknote/archive/test/TEST-007.N.md`
- [x] Parent-flip prompt surfaced after audit closure (skill Step 8) — user confirms or declines flipping `TEST-EPIC-007` to `Completed` and moving the cohort to `## Completed`

## 🧩 Subtasks

- [x] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [x] Walk `.flowtron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [x] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [x] Surface audit findings in Implementation Notes; cite each miss as a `/ft-file-followup <NEW-ID>` candidate
- [x] Phase 4: flip `TEST-007.N` PLAN line to stub form + archive tasknote
- [x] Parent-flip: skill Step 8 prompts user; on confirm, atomic flip parent line + move cohort to `## Completed`

## 🔗 Related

- [[TEST-EPIC-007]] — parent epic (playwright-e2e)
- [[TEST-007.2]] — playwright-harness (config, npm script, CI job, smoke spec)
- [[TEST-007.3]] — imagegen-link-load-e2e
- [[TEST-007.4]] — review-keyboard-e2e
- [[CORE-004]] — filed the inert `just e2e` recipe this epic reversed

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Operator invoked `/ft-close-epic TEST-007.N`; all three implementation children (`.2` `.3` `.4`) are `[x]` and archived, the parent `TEST-EPIC-007` is still active, and `.N` is the reserved terminal audit child. Full cohort — no early-audit partial scope.

- [x] Read relevant source files — read all three archived child tasknotes plus every deliverable at HEAD: `playwright.config.ts`, `e2e/{smoke,imagegen-link-load,review-keyboard}.spec.ts`, `package.json`, `.github/workflows/ci.yml`, `justfile` e2e recipe, `eslint.config.mjs` ignores, `.gitignore`, `test-fixtures/imagegen/`.

- [x] **Best Practices Review** — the cohort adds a test surface, not a module boundary. Dependency direction is one-way (specs → running app over HTTP; no app import). Nearby duplication assessed under Phase 2 finding 3.

- [x] **Archive skim** — self-referential for this cohort (`.2` `.3` `.4` are themselves the archive entries read above). Non-cohort predecessor: `CORE-004`, which filed the honest-but-inert `just e2e` recipe this epic reversed — its presence guard in `justfile:70-75` is what `.2` wired into rather than forking.

- [x] **Drift check** — every path cited by the three children still resolves at HEAD; no file moved during the cohort. Port 3009 is still the single source in `playwright.config.ts` (`E2E_PORT`), and `README.md` / `CLAUDE.md` / `.github/workflows/ci.yml` all name 3009 consistently.

- [x] Asked clarifying questions OR logged "No clarifications needed" — **no clarifications needed.** Assumption: audit scope is the three implementation children plus their doc surface; app behavior under test is out of remit (this cohort added no app code).

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

Cohort inventory (3 implementation children, all closed 2026-09-09):

- **TEST-007.2 — playwright-harness.** `@playwright/test` `^1.63.0` + `playwright.config.ts` (port **3009**, `reuseExistingServer: false`, chromium-only, `webServer` = `npx next dev --turbopack -p 3009`) + `npm run e2e` + `e2e/smoke.spec.ts` + a sibling `e2e` job in `.github/workflows/ci.yml`. Did not fork the `justfile` — CORE-004's config-presence guard was already the wire-up. Docs: `README.md`, `CLAUDE.md`, tasknote README quick commands.
- **TEST-007.3 — imagegen-link-load-e2e.** `e2e/imagegen-link-load.spec.ts` — types the absolute fixture path into the BI-046 picker, asserts BI-026 auto-load (Hero banner + prompt + 2 images), then clicks Load round r1 and asserts BI-043 idempotence. Replaced the fixture's mislabeled PNG-bytes-named-`.jpg` files with real 1×1 JPEGs so `/api/imagegen/file` serves a decodable `image/jpeg` under `nosniff`. No app-code change.
- **TEST-007.4 — review-keyboard-e2e.** `e2e/review-keyboard.spec.ts` — three tests (keep/discard/approve badges + Iterate-on-keeper; ArrowLeft/Right clamp + Escape; Lightbox focus trap + opener restore). `beforeEach` copies `test-fixtures/imagegen/` to `os.tmpdir()` and links the copy so Approve's writes cannot dirty the committed fixture; `afterEach` removes it. No app-code change.

Cumulative deliverable: 5 specs, one config, one CI job, one committed fixture root — reversing CORE-004's inert `just e2e`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — N/A for the audit itself (verification pass, no new code surface). The one inline fix extends the existing `CLAUDE.md` §Stack "Testing" bullet rather than opening a new doc section.

- [x] **Minimal refactor gate** — no refactor. Finding 3 (duplicated link flow) was assessed and deliberately left alone; rationale below.

- [x] Implemented the minimal solution — one inline doc fix (finding 2).

- [x] Updated/added tests for non-trivial behavior — N/A, no behavior changed.

**Implementation Notes:**

**Coherence findings — the cohort is consistent.** The three specs share one house style with no drift:

- Every spec opens with a header block naming its owning task ID and an explicit hand-off line for what it deliberately does *not* cover (`.2` → "belongs to TEST-007.3 and TEST-007.4"; `.3` → "Keep / approve / discard / lightbox / focus-trap belong to TEST-007.4"). No two specs claim the same ground and no gap is left unnamed.
- Locators are role-based throughout (`getByRole` / `getByLabel`), never CSS or test-id — so the specs double as accessible-name assertions, consistent with the repo's BI-040 jsx-a11y-as-error posture.
- Assertions cite the originating task ID for app behavior under test (BI-026 auto-load, BI-043 idempotence), matching the cohort's tasknote-traceability convention.
- Both feature specs use the picker's typed-path fallback and each says why (browse tree starts at `$HOME`, so typed path is the CI-stable route).
- **Quote style is coherent, not divergent.** The specs are single-quoted, matching app source 256:3; `playwright.config.ts` is double-quoted, matching its root-config neighbors `next.config.ts` and `eslint.config.mjs`. Each file matches its own neighborhood — there is no prettier config to arbitrate, and no fix is warranted.
- The CI `e2e` job mirrors the `ci` job's shape exactly (checkout@v5, setup-node@v6, Node 22, npm cache, `npm ci`). Its two extras — `name:` and `timeout-minutes: 20` — are justified by a job that boots a browser and a dev server.
- Port 3009 has a single source of truth (`E2E_PORT` in `playwright.config.ts`); `README.md`, `CLAUDE.md`, and the CI job comment all agree with it.

**Findings:**

1. **No regressions.** Full verification green at HEAD (Phase 3). Critically, `git status --porcelain` immediately after `npm run e2e` showed only this audit's own untracked tasknote — confirming `.3`'s decision to link the committed fixture *in place* is genuinely safe (its path only reads) and that `.4`'s temp-copy correctly contains the writing path. The two children's different fixture strategies are a considered split, not an inconsistency.

2. **Miss — fixed inline.** `test-fixtures/imagegen/` (3 tracked files) is the fixture root both feature specs depend on, and the entire reason for `.4`'s `mkdtemp`/`cpSync`/`rmSync` dance — yet it appeared in none of the AI-referenced docs. A cold-start agent reading `CLAUDE.md` would learn the spec glob but not the fixture contract, and could plausibly write a fourth spec that links the committed fixture on a writing path and silently dirties the repo. Fixed in `CLAUDE.md:15` by extending the Testing bullet: names the fixture root and states the read-in-place vs copy-then-link rule with a spec cited for each side. One clause, no restructure.

3. **Observation, not filed.** `.4`'s `linkCopiedFixture` helper duplicates the goto → assert combobox → Link imagegen → fill path → Link path → assert loaded sequence that `.3` runs inline. Both children explicitly considered and rejected a shared helpers module. At two instances that is the correct call — extraction now would create a module with one caller-pair and couple two specs that assert different things. Recording the trigger instead: **a third spec needing the link flow is the point to extract `e2e/helpers.ts`.** Not filed as a follow-up; there is nothing to do until that spec exists.

4. **Out-of-repo, operator-owned.** The personal port registry in `~/.claude/CLAUDE.md` records blastimage as `3003` only, with no 3009 entry — while the InvisiPaw and cloutomaton rows *do* register their dedicated e2e ports (5189/8099 and 5194/8014). TEST-007.2 correctly deferred this as outside its remit. It stays outside this audit's remit too: the file is outside the project repo. Surfaced to the operator as a one-line registry edit they may want to make; no ticket filed, since a blastimage PLAN entry cannot own a personal config file.

**No `/ft-file-followup` candidates.** Finding 2 was small enough to fix inline; findings 3 and 4 are recorded triggers, not work.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Quality assertions** — the only changed file is `CLAUDE.md` (prose). No duplication, dead code, or public-surface growth. The edit *removes* stale-by-omission documentation rather than adding any.

- [x] (frontend) Asked the user for visual confirmation — N/A, no rendered UI change; this audit changed one doc line.

**Testing Notes:** `npx tsc --noEmit` exit 0. `npm run lint` exit 0. `npm test` → 32 files / 575 tests passed (5.00s). `npm run e2e` → **5 passed (5.6s)**, 4 workers: smoke 328ms, link-load 2.2s, and all three review-keyboard tests. `git status --porcelain` after the e2e run listed only the untracked audit tasknote — no fixture dirt, confirming acceptance criterion 3 (no regressions in earlier-shipped cohort surfaces) against the real browser rather than by inspection.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  - `README.md` — **no change.** Install block (`npm test` / `npx playwright install chromium` / `npm run e2e` on :3009) and the CI paragraph naming the Playwright job both verified accurate at HEAD. Deliberately carries no spec count, so `.3`/`.4` adding specs did not stale it.
  - `AGENTS.md` — no change (no testing section; e2e is a Claude-surface concern living in `CLAUDE.md`).
  - `CLAUDE.md` — **updated.** Testing bullet (`CLAUDE.md:15`) extended to name `test-fixtures/imagegen/` as the committed e2e fixture root and state the read-in-place vs copy-then-link contract, citing `e2e/imagegen-link-load.spec.ts` and `e2e/review-keyboard.spec.ts` respectively. This is the audit's finding 2. Dev-port line (3003 app / 3009 e2e) and spec-glob clause re-verified, unchanged.
  - `.flowtron/PLAN.md` — this audit's stub flip (kept nested under `TEST-EPIC-007`), plus the parent flip + cohort move, **confirmed by the operator at the 📦 gate** — `TEST-EPIC-007` flipped to stub form and the parent + all four nested children moved atomically from `## Future Opportunities` to the top of `## Completed`. `DEPLOY-005`/`DEPLOY-006` remain in the source section, so no `(none)` placeholder was needed.
  - `VISION.md` — no change (product vision + generation-mode table; test surface is out of scope).
  - `docs/ADOPT.md` — no change (app port 3003 still correct; adopters do not run the e2e harness).
  - `docs/WORKFLOW.md` — no change.
  - `docs/REVIEW-LOOP.md` — no change. Worth noting the cohort now covers this doc's loop in a real browser (`.3` link+load, `.4` keep/discard/approve), but the doc describes the operator loop, not its tests — no edit warranted.
  - `docs/GROK-AGENT.md` — no change.

- [x] Closed — every `## ✅ Acceptance` criterion ticked. YAML `status:` flipped to `completed`. PLAN.md line flipped to stub form, kept nested beneath the still-active `TEST-EPIC-007` per SPEC/epic.md §"Child placement invariant". Tasknote moved to `.flowtron/tasknote/archive/test/TEST-007.N.md`.

- [x] **Evidence-based recap** drafted — see below.

**Final Summary:** Audited the closed `TEST-EPIC-007` (`playwright-e2e`) cohort — `.2` harness, `.3` link+load, `.4` review keyboard — and found it coherent. The three specs share one house style (task-ID header with an explicit not-covered hand-off line, role-based locators throughout, app-behavior assertions citing their originating BI task), port 3009 has a single source of truth that all four naming sites agree with, and the CI `e2e` job mirrors the `ci` job's shape. Apparent quote-style divergence was checked and dismissed: specs are single-quoted matching app source 256:3, `playwright.config.ts` is double-quoted matching its root-config neighbors, and there is no prettier config to arbitrate.

One miss, fixed inline: `test-fixtures/imagegen/` — the fixture root both feature specs depend on and the whole reason for `.4`'s temp-copy — was documented nowhere in the cold-start doc set, so a fourth spec could plausibly link the committed fixture on a writing path and silently dirty the repo. `CLAUDE.md:15` now names the root and states the read-in-place vs copy-then-link rule with a spec cited for each side (1 file, 1 clause).

Two items recorded rather than filed: `.4`'s `linkCopiedFixture` duplicates `.3`'s inline link flow, correctly left alone at two instances with **a third spec needing the flow** recorded as the extraction trigger; and the personal `~/.claude/CLAUDE.md` port registry has no 3009 row for blastimage (InvisiPaw and cloutomaton register theirs) — outside the project repo, so surfaced to the operator, not ticketed. No `/ft-file-followup` candidates.

Verified: `tsc` exit 0, `npm run lint` exit 0, `npm test` 575/575 across 32 files, `npm run e2e` **5 passed in 5.6s**, and `git status --porcelain` clean of fixture dirt immediately after the e2e run — proving the cohort's two different fixture strategies are a considered split rather than an oversight.

**Archived:** 2026-09-10
