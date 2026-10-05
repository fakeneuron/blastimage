---
title: imagegen-server-surface-tests audit
status: completed
tags: []
created: 2026-08-30
due:
related-tasks: [TEST-EPIC-004, TEST-004.2, TEST-004.3, TEST-004.4]
---

# TEST-004.N | imagegen-server-surface-tests audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[TEST-EPIC-004]]

## 🎯 Goal

Verify the completed `TEST-EPIC-004` (`imagegen-server-surface-tests`) cohort sits coherently in the codebase: cumulative doc-drift sweep across `.flowtron/tasknote/README.md` §"AI-referenced docs", naming/style consistency across the cohort's deliverables, and follow-up filings for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces
- [x] Audit findings recorded in Implementation Notes; misses cited as candidates for `/ft-file-followup <NEW-ID>` filing (filed AFTER audit closure to preserve `/ft-file-followup`'s filing-discipline gate)
- [x] Single `feat: TEST-004.N — audit TEST-EPIC-004` (or `chore: ...` if no code edits land) commit lands
- [x] PLAN.md line for `TEST-004.N` flipped to stub form `Completed YYYY-MM-DD.`
- [x] Tasknote moved to `.flowtron/tasknote/archive/test/TEST-004.N.md`
- [x] Parent-flip prompt surfaced after audit closure (skill Step 8) — user confirms or declines flipping `TEST-EPIC-004` to `Completed` and moving the cohort to `## Completed`

## 🧩 Subtasks

- [x] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [x] Walk `.flowtron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [x] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [x] Surface audit findings in Implementation Notes; cite each miss as a `/ft-file-followup <NEW-ID>` candidate
- [x] Phase 4: flip `TEST-004.N` PLAN line to stub form + archive tasknote
- [x] Parent-flip: skill Step 8 prompts user; on confirm, atomic flip parent line + move cohort to `## Completed`

## 🔗 Related

- [[TEST-EPIC-004]] — parent epic (imagegen-server-surface-tests)
- [[TEST-004.2]] — imagegen-route-tests (cohort child)
- [[TEST-004.3]] — route-guard-coverage (cohort child)
- [[TEST-004.4]] — imagegen-client-tests (cohort child)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md — `TEST-EPIC-004` with three closed
  implementation children (`.2`, `.3`, `.4`) and this `.N`. No open siblings, so
  no early-audit decision was needed and the cohort audited is the whole cohort.

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The epic filed a single named gap — "the BI-045/046/047 server
  surface writes to the operator's repo and has no tests on the layer that
  invokes its guard." Three children closed against it in one day, each adding a
  suite and each independently declaring its doc-drift sweep clean. That is the
  exact shape the cumulative audit exists for: three correct local decisions can
  still leave the codebase saying different things in different files.

- [x] Read relevant source files — all three archived cohort tasknotes in full
  (`archive/test/TEST-004.{2,3,4}.md`), the three suites they produced, the
  module they cover (`lib/imagegenRoute.ts`), the seven route files under
  `app/api/imagegen/**`, the two BI-045-era sibling suites, and the four
  AI-referenced docs. Read set was fully enumerable — no probe needed.

- [x] **Best Practices Review** — audit is a verification pass; the only edits
  contemplated were comment-level corrections in the cohort's own deliverables
  and one clause in a cold-start doc. No abstraction, no dependency direction,
  no public surface in question.

- [x] **Archive skim** — self-referential by construction (the cohort children
  *are* the archive entries). Beyond the cohort, `BI-045` / `BI-046` / `BI-047`
  are the surfaces under test and were read as the origin of the module comments
  the cohort quotes. That read is what surfaced Finding 1.

- [x] **Drift check** — every path cited across the three tasknotes still exists
  at HEAD and still holds its described role: `lib/imagegenRoute.ts` (six
  exports), `lib/imagegenRoute.test.ts`, `lib/imagegenRouteGuard.test.ts`,
  `lib/imagegenClient.test.ts`, seven `app/api/imagegen/**/route.ts` files, ten
  exported verb handlers. One *count* claim inside the deliverables had drifted —
  that is Finding 1, recorded rather than silently accepted.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  **No clarifications needed.** Assumptions: (1) audit scope is the full cohort,
  since no sibling is open; (2) fixes small enough to be comment-level and
  clearly inside the cohort's own surface are applied inline per the skill's
  Step 5 carve-out, and anything larger is logged as a follow-up candidate
  instead; (3) the absent `.1` Discovery child is correct, not a filing miss —
  the epic's Discovery was supplied by the 2026-08-30 audit-repo run, and all
  three children record that identically.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**The cohort is unusually tight, which is what made the drift findable.** All
three children landed 2026-08-30, each adding exactly one test file, each
touching production code either not at all (`.3`, `.4`) or in one branch (`.2`).
Their test-count arithmetic chains cleanly and independently: 482 → 509 (`.2`,
+27) → 527 (`.3`, +18) → 554 (`.4`, +27), each child recording the prior as its
baseline. `npm test` at audit time returns **554 passed across 30 files**, so
the chain closes against HEAD with no unexplained delta — nothing regressed and
nothing was quietly added or dropped between closures.

**Coverage of the epic's stated gap is genuinely end to end.** The guard's
decision (`imagegenGuard.test.ts`, BI-045), its translation into a 403 and a
`Result` into a status (`imagegenRoute.test.ts`, `.2`), its invocation at every
entry point (`imagegenRouteGuard.test.ts`, `.3`), and the client that builds
every one of those requests (`imagegenClient.test.ts`, `.4`) are each pinned by
a separate suite, with no re-assertion across them. `.2` explicitly forward-
reserved route-handler-level 403s for `.3`, and `.3` honoured that boundary
rather than duplicating it — the one cross-child contract in the cohort, kept.

**Two findings, both cumulative rather than local.** Neither is visible from
inside any single child, which is why three clean per-task sweeps missed them.
Details in Implementation Notes.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — the corrections applied follow the cohort's own
  established habit of explaining a decision at its point of use rather than
  restating a count; no new shape introduced.

- [x] **Minimal refactor gate** — two comment-level corrections and one
  documentation clause. No behaviour changed, no signature touched, no test
  rewritten. Nothing deferred.

- [x] Implemented the minimal solution — 4 comment lines across 3 files, plus one
  sentence in `CLAUDE.md`.

- [x] Updated/added tests for non-trivial behavior — **N/A**: no behaviour
  changed. The cohort's 72 new tests are the children's deliverables and stand
  unmodified.

**Implementation Notes:**

**Cohort inventory.**

- **TEST-004.2 | imagegen-route-tests** — `lib/imagegenRoute.test.ts` (248 ln,
  27 tests) over all six exports of `lib/imagegenRoute.ts`. Surfaced and fixed a
  real defect: `roundFrom` coerced a blank round with `Number('')` → `0`, which
  passed its own guard and let the `selection` route's POST handler create
  `rounds/r0/selection.json` in the operator's repo from an input the function
  was written to reject. One branch closes it; a regression test pins it, and
  the fix was verified to fail against the pre-fix module.
- **TEST-004.3 | route-guard-coverage** — `lib/imagegenRouteGuard.test.ts`
  (122 ln, 18 tests). Discovers every `route.ts` under `app/api/imagegen/**` via
  `import.meta.glob` and asserts each of the ten exported verb handlers returns
  403 to a cross-origin caller, with the glob itself cross-checked against a
  `node:fs` walk so it cannot silently cover nothing. Liveness proven by two
  mutations, including a brand-new unguarded route that raised the suite from 18
  to 20 tests without the file being edited. No production code touched.
- **TEST-004.4 | imagegen-client-tests** — `lib/imagegenClient.test.ts` (271 ln,
  27 tests) over all 12 exports of `lib/imagegenClient.ts`, driven by
  `vi.stubGlobal('fetch', ...)`. No production code touched.

**Coherence findings.**

**Finding 1 — a stale route count, propagated (fixed inline).** `lib/imagegenRoute.ts`
opened with "Six route handlers repeat the same three moves", written at BI-045
when there were six; BI-046 added `browse`, making seven. Two of the cohort's
three deliverables inherited that number — `imagegenRoute.test.ts:4` ("the
reason six route files cannot each forget to call the guard") and
`imagegenRouteGuard.test.ts:6`, which quotes the source's wording directly. The
same guard suite then said "a hand-written table of seven handlers" nine lines
later, so one file asserted both six and seven about the same set, and neither
was right: there are seven route *files* and ten verb *handlers*.

Fixed at all four sites by removing the count rather than incrementing it — the
count is what went stale, and it carries no information the reader needs
("Every route handler repeats the same three moves"; "the reason the route files
cannot each forget"; the quote trimmed to the source's own count-free clause
"cannot be forgotten in one of them"; "a hand-written table of the handlers that
exist today"). Comment-only, zero behaviour change; `lib/imagegenRoute.ts` is
outside the cohort but is the origin of the claim, and correcting the two tests
while leaving the source saying "Six" would have left the cluster contradicting
itself — the exact property this audit is charged with.

**Finding 2 — a convention exception no cold-start doc records (fixed inline).**
`CLAUDE.md` states tests live beside their source as
`{lib,components}/**/*.test.{ts,tsx}`. TEST-004.3 deliberately broke that:
`lib/imagegenRouteGuard.test.ts` covers `app/api/imagegen/**` from `lib/`,
because `vitest.config.ts`'s include glob excludes `app/` and a colocated test
would never be discovered. Each child's Phase 4 sweep declined to promote this,
each with defensible local reasoning ("a single-file technique explained in that
file's own header, not a project-wide convention"). Cumulatively that is the
miss: an agent acting on `CLAUDE.md` alone would relocate the suite beside the
routes as a tidy-up and silently delete 18 tests, and the file header only
protects a reader who opens the file *before* moving it. One clause added to the
Testing bullet naming the file, the reason, and the consequence.

**Recorded, not fixed (neither warrants a churn commit).**

- **Header-prefix variance.** The repo's test-header convention is
  `<module> tests (<TASK-ID>)` — `imagegenGuard tests (BI-045)`,
  `imagegenRoute tests (TEST-004.2)`. `imagegenClient.test.ts` uses
  `blastimage — lib/imagegenClient.ts coverage (TEST-004.4)`, borrowing the
  prefix that production modules use. Cosmetic; the header still names its
  subject and task ID unambiguously, and nine older `lib/*.test.ts` files carry
  no header at all, so the cohort is *more* consistent than what surrounds it.
- **`imagegenRouteGuard.test.ts` has no same-named source.** The name can be
  misread as testing a module `lib/imagegenRouteGuard.ts`, next door to the real
  `lib/imagegenGuard.ts`. Left alone: the file's own header explains the
  placement in its first paragraph, and any rename loses the association with
  `imagegenRoute.ts`, whose invocation it exists to pin.

**No /ft-file-followup candidates.** Both findings were comment- or
doc-level and were closed inline; nothing was deferred.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — `npm test`: **554 passed across
  30 files**, identical to the baseline TEST-004.4 recorded at its closure. The
  edits are comment-only, so an unchanged count is the expected result and
  confirms no cohort suite was disturbed.

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` exit 0;
  `npm run lint` exit 0, no output.

- [x] **Quality assertions** — no duplication, no dead code, no public-surface
  growth (nothing but comments and one doc sentence changed). Stale code-facing
  documentation is precisely what was corrected: four count claims across three
  files, plus one cold-start doc gap.

- [x] (frontend) Asked the user for visual confirmation — **N/A**: no UI surface.
  Comments and documentation only; nothing renders differently.

**Testing Notes:**

**The unchanged test count is the assertion here.** An audit that edits only
comments should move nothing, and 554/30 before and after — against TEST-004.4's
independently-recorded 554/30 — is what proves the cohort's suites were left
exactly as their authors closed them. `grep` over `lib/*.ts` for the stale count
strings returns empty after the edit, so Finding 1 is closed rather than
partially applied.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — per-entry verdicts across
  `.flowtron/tasknote/README.md` §"AI-referenced docs":

  - `README.md` — **no change.** The cohort added no user-facing surface; its
    three suites and one guard fix are invisible to the workflow this file
    documents, and every `imagegen/` path it names still resolves at HEAD.
  - `AGENTS.md` — **no change.** It carries the flowtron paste-block and skill
    roster; no workflow, command, or filing convention moved.
  - `CLAUDE.md` — **updated** (Finding 2). The Testing bullet's "tests live
    beside their source" now records the one deliberate exception the cohort
    created: the route-handler suite lives in `lib/` because the vitest include
    glob excludes `app/`, and relocating it would silently stop running it. Each
    child declined this individually; the cumulative sweep is where it lands.
  - `.flowtron/PLAN.md` — **updated** at this closure (TEST-004.N flipped to
    stub form, kept nested under TEST-EPIC-004 pending the parent-flip decision).

- [x] Closed — every `## ✅ Acceptance` criterion ticked, YAML `status:` flipped
  to `completed`, PLAN.md line flipped to stub form and kept nested beneath the
  parent epic, tasknote moved to `.flowtron/tasknote/archive/test/`.

- [x] **Evidence-based recap** drafted

**Final Summary:**

TEST-EPIC-004's three children each closed correctly and each declared its own
doc-drift sweep clean; auditing them together surfaced two inconsistencies that
were invisible from inside any one of them, both closed inline.

**Changed:** `lib/imagegenRoute.ts`, `lib/imagegenRoute.test.ts`,
`lib/imagegenRouteGuard.test.ts` (4 comment lines total — a stale route count,
removed rather than incremented so it cannot go stale again); `CLAUDE.md`
(+1 sentence). No behaviour, no signature, no test assertion touched.

**Verification:** `npm test` 554 passed across 30 files — byte-identical to the
baseline TEST-004.4 recorded at its closure, which is the point: a comment-only
audit that moved the count would mean it had done something it shouldn't.
`npx tsc --noEmit` exit 0; `npm run lint` exit 0.

**Finding 1 — a count that outlived its truth.** `lib/imagegenRoute.ts` said
"Six route handlers" since BI-045; BI-046 added `browse`, making seven, and two
cohort deliverables inherited the six. One of them then said "seven" nine lines
below its own "six", and neither number was right — seven route files, ten verb
handlers. Rewritten count-free at all four sites.

**Finding 2 — an undocumented exception with a silent failure mode.**
TEST-004.3 correctly placed a suite in `lib/` to cover `app/`, because the
vitest glob excludes `app/`. Three per-task sweeps each judged this a
single-file technique not worth promoting; cumulatively it left `CLAUDE.md`
telling a cold-start agent to do the one thing that deletes 18 tests without a
failing test to show for it. One clause closes that.

**Cohort coherence — otherwise clean.** The four suites chain end to end over
the epic's stated gap (guard decision → 403 translation → invocation at every
entry point → client request construction) with no re-assertion between them;
`.2` forward-reserved route-handler 403s for `.3` and `.3` honoured the boundary;
the test-count arithmetic 482 → 509 → 527 → 554 closes against HEAD with no
unexplained delta; all three children independently record the absent `.1` for
the same correct reason. Two cosmetic variances (a header prefix, a test file
with no same-named source) were judged acceptable and recorded rather than
churned.

**Follow-ups:** none. Both findings were closable inline; nothing deferred.

**Parent-flip decision.** Operator confirmed at the 📦 gate: TEST-EPIC-004
flipped to stub form and the full cohort (`.2`, `.3`, `.4`, `.N`) moved atomically
to the top of `## Completed` in the same commit. `## High` returned to its `(none)`
placeholder.

**Maintainability effect.** The imagegen server surface now has its coverage
*and* its prose agreeing with itself. The one durable trap the cohort created —
a test whose correct location contradicts the project's stated convention — is
now written where an agent will read it before acting, instead of only where one
would read it after opening the file it is about to move.

**Archived:** 2026-08-30
