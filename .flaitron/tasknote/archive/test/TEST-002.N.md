---
title: component-test-coverage audit
status: completed
tags: [testing, audit, epic-child]
created: 2026-08-09
due:
related-tasks: [TEST-EPIC-002, TEST-002.2, TEST-002.3, TEST-002.4, TEST-002.5, TEST-002.6]
---

# TEST-002.N | component-test-coverage audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-002]]

## 🎯 Goal

Verify the completed `TEST-EPIC-002` (`component-test-coverage`) cohort sits coherently
in the codebase: cumulative doc-drift sweep across `.flowtron/tasknote/README.md`
§"AI-referenced docs", naming/style consistency across the cohort's deliverables, and
follow-up filings for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces
- [x] Audit findings recorded in Implementation Notes; misses cited as candidates for `/ft-file-followup <NEW-ID>` filing (filed AFTER audit closure to preserve `/ft-file-followup`'s filing-discipline gate)
- [x] Single `feat: TEST-002.N — audit TEST-EPIC-002` (or `chore: ...` if no code edits land) commit lands
- [x] PLAN.md line for `TEST-002.N` flipped to stub form `Completed YYYY-MM-DD.`
- [x] Tasknote moved to `.flowtron/tasknote/archive/test/TEST-002.N.md`
- [x] Parent-flip prompt surfaced after audit closure — user confirms or declines flipping `TEST-EPIC-002` to `Completed` and moving the cohort to `## Completed`

## 🧩 Subtasks

- [x] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [x] Walk `.flowtron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [x] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [x] Surface audit findings in Implementation Notes; cite each miss as a `/ft-file-followup <NEW-ID>` candidate
- [x] Phase 4: flip `TEST-002.N` PLAN line to stub form + archive tasknote
- [x] Parent-flip: skill Step 8 prompts user; on confirm, atomic flip parent line + move cohort to `## Completed`

## 🔗 Related

- [[TEST-EPIC-002]] — parent epic; component-test coverage, Discovery supplied by audit-repo
- [[TEST-002.2]] — `ReviewGrid` tests; set the cohort's harness idiom
- [[TEST-002.3]] — `TaskDetail` tests
- [[TEST-002.4]] — `Lightbox` tests; filed `BI-035.5` as a scope-deviation follow-up
- [[TEST-002.5]] — `GalleryPanel` + `BulkReviewPane` tests
- [[TEST-002.6]] — `ImportBuilder` + `ReferenceLibrary` tests
- [[TEST-001.N]] — the predecessor epic's audit; same shape

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md — parent `TEST-EPIC-002` active under `## Medium`;
  all five implementation children (`.2`–`.6`) checked; `.N` is the reserved terminal
  audit child. No open siblings, so the early-audit gate did not fire.

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The operator invoked `/ft-close-epic TEST-002.N` and pre-flight passed
  (clean tree, parent active, cohort complete). The cohort landed in five commits over a
  single day (2026-08-09) in a non-obvious order — `.2` → `.4` → `.3` → `.5` → `.6` — so
  the per-task closures each swept a moving baseline. That is exactly the condition the
  cumulative audit exists for.

- [x] Read relevant source files — all five archived cohort tasknotes
  (`.flowtron/tasknote/archive/test/TEST-002.{2,3,4,5,6}.md`), all seven test files the
  cohort added, `vitest.config.ts`, `.flowtron/tasknote/README.md`, `CLAUDE.md`,
  `AGENTS.md`, `README.md`, `package.json`, and the three still-uncovered components
  (`FeedbackModal.tsx`, `IterateModal.tsx`, `ResolvedImage.tsx`).

- [x] **Best Practices Review** — the touched surface is one comment block in an existing
  test file (see Phase 2). No runtime code, no module boundary, no dependency direction
  change. The cohort's own abstraction — local fixture factories + a
  `render<X>(overrides)` helper + explicit vitest imports + hand-wired
  `afterEach(cleanup)` — is verified consistent below rather than extended. No refactor
  required in scope; one gap deferred to a follow-up filing rather than fixed here
  (finding 2, Phase 2).

- [x] **Archive skim** — self-referential for this audit: the cohort children *are* the
  archive entries in scope, and all five were read in full. Beyond the cohort,
  `TEST-001.N` (the predecessor epic's audit) was read for shape, and the origin
  tasknotes each child cites (BI-004/005/006/007/008/009/015/021.3/021.4/027/029.2/
  030.3/031.2) were cross-checked through the children's own citations rather than
  re-read — every one is already quoted with its load-bearing claim.

- [x] **Drift check** — every path the cohort cites still resolves. All seven new test
  files are present at the paths their tasknotes name; the vitest include glob is still
  `{lib,components}/**/*.test.{ts,tsx}`; `MAX_ACTIVE_REFS` and `DEFAULT_BATCH_SIZE` are
  where they were cited. One drift found *inside* a cohort deliverable (finding 1) and
  one bookkeeping drift in two archived Testing Notes (finding 3) — both in Phase 2.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit
  assumptions

  **No clarifications needed.** Explicit assumptions:

  1. **Archived tasknotes are historical record, not living docs.** Where an archived
     Testing Note carries a stale number (finding 3), the audit records the correction
     here rather than rewriting the archive.
  2. **The comment fix in finding 1 is in scope.** It is a one-block correction to a
     cohort deliverable whose own tasknote already documents the right answer — the
     "small and clearly in scope" case, not new work.
  3. **The residual-coverage gap (finding 2) is a follow-up, not audit work.** Writing
     tests for three uncovered components is a task, not an audit finding to fix inline.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Cohort inventory** — what each child actually delivered, verified against HEAD:

| Child | Deliverable | Tests | Production code |
|---|---|---|---|
| `TEST-002.2` | `components/ReviewGrid.test.tsx` (262 lines) | 26 | untouched |
| `TEST-002.3` | `components/TaskDetail.test.tsx` (451 lines) | 30 | untouched |
| `TEST-002.4` | `components/Lightbox.test.tsx` (264 lines) | 23 | untouched; filed `BI-035.5` |
| `TEST-002.5` | `GalleryPanel.test.tsx` (165) + `BulkReviewPane.test.tsx` (201) | 7 + 6 | untouched |
| `TEST-002.6` | `ImportBuilder.test.tsx` (197) + `ReferenceLibrary.test.tsx` (258) | 8 + 10 | untouched |

Seven new files, 1 798 lines, 110 tests, and — confirmed by `git log` per file — **not one
line of production code changed by any child**. The "test-only" line every child claimed
held for all five.

**Landing order.** `git log` shows `.2` → `.4` → `.3` → `.5` → `.6`, not `.2`–`.6`. `.4`
ran before `.3` because `.4`'s Discovery surfaced an operator question. This is the root
of finding 3.

**Suite state at audit time:** `npm test` → **323 passed / 22 files**; `npm run lint` and
`npm run typecheck` both clean.

Discovery surfaced no clarifications → skipping the 🛠️ gate.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — **N/A as new-code work.** The audit is a verification pass over
  existing deliverables; the one edit is a comment correction, which follows the
  file-header convention the cohort already established (each file opens with a block
  stating what is pinned, what is deliberately out of scope, and why the harness looks
  the way it does).

- [x] **Minimal refactor gate** — no refactor. One comment block corrected in
  `components/ReferenceLibrary.test.tsx` because it contradicted the code directly
  beneath it. The residual-coverage gap (finding 2) is deferred to a follow-up filing,
  not fixed here.

- [x] Implemented the minimal solution — finding 1 fixed inline; findings 2–4 recorded.

- [x] Updated/added tests for non-trivial behavior — **N/A.** No behaviour changed; the
  edit is a comment. The suite was re-run to confirm (Phase 3).

**Implementation Notes:**

### Coherence pass — what held

The cohort is unusually consistent, and the consistency is load-bearing rather than
cosmetic. Verified across all seven files:

- **Harness idiom identical.** Every file imports vitest functions explicitly
  (`import { afterEach, describe, expect, it, vi } from 'vitest';` — byte-identical in
  all seven, `globals: true` being off) and wires `afterEach(() => { cleanup(); })` by
  hand. `ReferenceLibrary.test.tsx` is the only variant, adding `vi.unstubAllGlobals()`
  alongside `cleanup()` — required, because it is the only file stubbing globals.
- **Fixture idiom identical.** Local `make<Thing>(overrides)` factories plus a single
  `render<Component>(overrides)` helper returning `vi.fn()` spies, in all seven. No file
  hoisted fixtures into a shared module; four separate tasknotes independently reasoned
  to the same conclusion and each recorded *why* (SPEC's DRY-is-contextual framing).
- **Provider decision is explicit and correct in both directions.** The five files whose
  component reaches `ResolvedImage` mount the real `ImagegenProvider` and drain it with
  `await act(async () => {})`; the two that do not (`ImportBuilder`, `ReferenceLibrary`)
  say so in their headers and explain why. No file guessed.
- **No `vi.mock` anywhere in the cohort.** `CLAUDE.md` reserves it for components with no
  injection point (`Workspace.test.tsx`); all seven cohort components are props-driven,
  and all seven files say so. The rule held under five independent applications.
- **Scope boundaries cross-reference cleanly, and they compose.** `.2` deferred the
  overlay to `.4`; `.4` picked it up and named `.2` as the wiring owner. `.3` deferred
  `ReferenceLibrary`'s ingest path to `.6`; `.6` picked it up and cited `.3` by name.
  `.5` declined to re-assert lightbox wiring already pinned by `.2`/`.4`. Every deferral
  has a matching pickup — no orphaned "covered elsewhere" claims.
- **No child regressed an earlier child's surface.** `git log` per file: each of the
  seven cohort files has exactly one commit, its own. No later sibling edited an earlier
  sibling's deliverable.
- **The test-only line held five for five.** No production file was touched by any child
  (the mutation passes each restored from a pristine copy, and `git log --diff-filter=M`
  confirms it at HEAD). The 3-dependency tree (`next`, `react`, `react-dom`) is intact.

### Findings

**1. `ReferenceLibrary.test.tsx`'s header contradicted its own stubs — fixed inline.**

The file header claimed *"a deterministic synchronous-`onload` stub"* (`:15`), but
`FakeFileReader.readAsDataURL` (`:67`) and `FakeImage`'s `src` setter (`:77`) both fire
`onload` from a `queueMicrotask` — asynchronously. TEST-002.6's own Implementation Notes
record the correction (*"Both fakes resolve via `queueMicrotask` (not synchronously)"*);
the header was left over from the Discovery-time plan. This mattered more than a typo
would: the stub class carries the comment `/** Deterministic FileReader/Image stubs —
see file header. */`, pointing the reader at the wrong claim, and the async timing is
precisely why the file needs its `flush()` helper. A reader trusting the header would
conclude `flush()` was superfluous. Corrected to state the `queueMicrotask` timing and
name `flush()` as its consequence.

**2. Three components finish the epic with no test file — the cohort's real residual gap.**

`TEST-EPIC-002` covered seven components. Three were never filed as children and remain
uncovered:

| Component | Lines | Why it is not merely presentational |
|---|---|---|
| `FeedbackModal.tsx` | 126 | `window` keydown listener + cleanup (`:36-41`), backdrop close (`:48`), submit path |
| `IterateModal.tsx` | 120 | same listener/cleanup shape (`:50-54`), backdrop close (`:61`), prompt composition |
| `ResolvedImage.tsx` | 38 | the `useImagegen` consumer every other cohort file mounts a provider to satisfy |

The two modals carry the exact failure mode `TEST-002.4` proved worth pinning on
`Lightbox`: a `window` keydown listener that outlives its component keeps firing
`onClose` on a closed dialog, and nothing in the UI shows it. `TEST-002.6` already flagged
the adjacent half of this — it deferred `ImportBuilder`'s Esc/backdrop chrome and marked
it, unusually for this epic, as *"a real, consciously deferred gap rather than redundant
coverage"*. That deferral has no pickup, because no child owns modal chrome. This is the
one place where the cohort's otherwise-complete deferral graph has a loose end.

→ **Follow-up candidate:** `TEST-003` (or a `TEST-002.7` if the operator prefers a second
wave under this epic) — modal-chrome + `ResolvedImage` coverage, closing the
`ImportBuilder` Esc/backdrop deferral in the same pass.

**3. Two archived Testing Notes carry file counts one low, and `.5`'s baseline is stale.**

Bookkeeping only, but worth recording so a future reader does not treat the numbers as
authoritative:

| Child | Recorded | Actual |
|---|---|---|
| `TEST-002.5` | before 262/17 → after 305/**19** | before 292/**18** → after 305/**20** |
| `TEST-002.6` | before 305/**19** → after 323/**21** | before 305/**20** → after 323/**22** |

Every **test** count is right; only the **file** counts drift. Two causes, both benign:
`.5` copied its "before" row from `.4` rather than re-running after `.3` landed (the
out-of-order landing noted in Discovery), and neither child counted
`lib/ImagegenContext.test.tsx`, which predates the epic (added by BI-029.4). Recorded
here rather than corrected in the archive — archived tasknotes are historical record.

**4. `TEST-002.6`'s nav chip reads `✅ Completed` where its four siblings read
`🟢 In progress`.**

SPEC §"🚀 Phase 4: Closure" retired that markdown write in CORE-042.4 — the chip is
render-derived from the YAML `status:` field, so hand-flipping it is a no-op that the
other four children correctly skipped. Cosmetic, one line, in an already-archived note;
recorded, not corrected.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npx vitest run
  components/ReferenceLibrary.test.tsx` → **10 passed**. Full `npm test` → **323 passed /
  22 files** (unchanged, as expected: the edit is a comment).

- [x] Ran lint/type-check on changed code — `npm run lint` clean, `npm run typecheck` clean.

- [x] **Quality assertions** — the changed lines *are* the stale code-facing documentation
  this criterion names: the corrected header no longer contradicts the stubs below it,
  and it now explains why `flush()` exists instead of implying it is redundant. No
  duplication, dead code, complexity, or public-surface growth — `git diff --stat` is
  `components/ReferenceLibrary.test.tsx | 6 ++++--`, comment lines only.

- [x] (frontend) Asked the user for visual confirmation — **N/A.** No rendered surface
  changed; the diff is a comment block in a test file.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

| Gate | Result |
|---|---|
| `npx vitest run components/ReferenceLibrary.test.tsx` | 10 passed |
| `npm test` | **323 passed / 22 files** (unchanged) |
| `npm run lint` | clean |
| `npm run typecheck` | clean |

No mutation pass this time: the diff contains no executable code, so there is no branch
to break. The cohort's five mutation passes (26 mutations total across seven production
files, every one caught by the test written for it) are the standing evidence that these
assertions are live, and they were re-read rather than re-run.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md`
  §"AI-referenced docs":

  | Doc | Verdict |
  |---|---|
  | `README.md` | **No change.** Documents the shipped user-facing feature surface and makes no coverage claim anywhere (`grep -in "test\|coverage\|vitest" README.md` → zero hits). An epic that added only tests changes nothing it describes. |
  | `AGENTS.md` | **No change.** Carries the flowtron workflow paste-block only; its two `test`-matching lines are skill descriptions. |
  | `CLAUDE.md` | **No change — and now materially better evidenced.** Its Testing bullet makes four claims; all four were checked against the finished cohort rather than assumed. The glob is unchanged; "component tests were unrunnable-by-config until TEST-001.2" is the reason five of the seven components had no test to begin with; "`globals: true` is off, so import test functions explicitly and wire `afterEach(cleanup)` by hand" is satisfied byte-identically in all seven new files; "prefer real seams and `vi.stubGlobal` over module mocks; `vi.mock` is reserved for components with no injection point (see `Workspace.test.tsx`)" survived five independent applications — zero `vi.mock` in the cohort, and the two files that needed globals stubbed used `vi.stubGlobal`. The rule was tested by the epic, not just restated. |
  | `.flowtron/PLAN.md` | **Updated.** `TEST-002.N` flipped to stub form, kept 2-space nested beneath `TEST-EPIC-002`. Parent flip + cohort move to `## Completed` pending operator confirmation at the 📦 gate. |

  Also re-checked §"Archive layout" and §"Project quick commands" (outside the sweep
  list): both accurate — `TEST-*` → `archive/test/` matches where this note lands, and
  all four listed commands ran green this session.

- [x] Closed — PLAN.md line flipped to stub form `Completed 2026-08-09.`, kept 2-space
  nested beneath the active `TEST-EPIC-002` parent per SPEC/epic.md §"Child placement
  invariant"; tasknote moved to `.flowtron/tasknote/archive/test/TEST-002.N.md`

- [x] **Evidence-based recap** drafted — see Final Summary

**Final Summary:**

Audited the completed `TEST-EPIC-002` cohort. The epic did what it set out to do: seven
components went from zero coverage to 110 tests across 1 798 lines, with no production
code touched by any of the five children and the 3-dependency tree intact. The coherence
pass found the cohort unusually consistent — the harness idiom, the fixture idiom, and
the real-provider-vs-none decision are identical across all seven files, and every
"covered elsewhere" deferral has a matching pickup in the sibling that claimed it.

**Changed:** `components/ReferenceLibrary.test.tsx` (+4/−2, comment block only) and two
`.flowtron/PLAN.md` lines.

**Verification:** `npm test` **323 passed / 22 files**, lint and typecheck clean. No
mutation pass — the diff has no executable code.

**Findings (4).** One fixed inline: `ReferenceLibrary.test.tsx`'s header claimed a
*synchronous* `onload` stub while both fakes fire from a `queueMicrotask`, and the stub
class points readers at that header — so a reader would have concluded the file's
`flush()` helper was superfluous when it is the reason the tests are deterministic.
TEST-002.6's own notes already carried the correction; only the header missed it. Three
recorded, not fixed: a residual coverage gap (below), file counts one low in two archived
Testing Notes (test counts are all correct; `.5` copied its baseline from `.4` after the
cohort landed out of order, and neither child counted the pre-existing
`lib/ImagegenContext.test.tsx`), and `.6` hand-flipping a nav chip that CORE-042.4
retired.

**The one real gap.** `FeedbackModal` (126 lines), `IterateModal` (120), and
`ResolvedImage` (38) finish the epic uncovered — never filed as children. Both modals
carry the same `window`-keydown-listener-plus-cleanup shape that TEST-002.4 proved worth
pinning on `Lightbox`, where a listener outliving its component keeps firing `onClose` on
a closed dialog with nothing visible in the UI. TEST-002.6 flagged the adjacent half —
it deferred `ImportBuilder`'s Esc/backdrop chrome and marked it, unusually for this epic,
as *"a real, consciously deferred gap rather than redundant coverage"*. That deferral is
the cohort's only loose end: no child owns modal chrome, so nothing picked it up. Filed
as a follow-up candidate rather than fixed here.

**Refactors:** none made, none deferred. The one edit is a comment.

**Docs:** all four AI-referenced docs swept — three verified unchanged with reasons,
`PLAN.md` updated.

**Maintainability:** the epic's durable effect is not the 110 tests but the 26 mutations
that proved them live — every branch broken produced a failure on exactly the test
written for it, so a future regression names its own cause instead of producing a red
suite someone has to bisect. The cohort also settled a convention by exercising it five
times: components go untested only when they have no injection point, and even then the
seam gets stubbed rather than mocked. That was a config artefact enforced by a narrow
vitest glob until TEST-001.2; it is now a considered rule with evidence behind it.

**Parent flip:** operator confirmed at the 📦 gate. `TEST-EPIC-002` flipped to stub form
and the full cohort (`.2` `.3` `.4` `.5` `.6` `.N`) moved atomically from `## Medium` to
the top of `## Completed` in the same commit. `## Medium` still carries `BI-EPIC-035`, so
no `(none)` placeholder was needed.

**Archived:** 2026-08-09
