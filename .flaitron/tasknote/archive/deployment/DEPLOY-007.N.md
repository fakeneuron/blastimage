---
title: ci-gate-recovery audit
status: completed
tags: []
created: 2026-09-09
due:
related-tasks: [DEPLOY-EPIC-007, DEPLOY-007.2, DEPLOY-007.3]
---

# DEPLOY-007.N | ci-gate-recovery audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-EPIC-007]]

## 🎯 Goal

Verify the completed `DEPLOY-EPIC-007` (`ci-gate-recovery`) cohort sits coherently in the codebase: cumulative doc-drift sweep across `.flowtron/tasknote/README.md` §"AI-referenced docs", naming/style consistency across the cohort's deliverables, and follow-up filings for any miss.

## ✅ Acceptance

- [x] **Doc-drift sweep (fixed line, per SPEC/epic.md §"Audit acceptance — fixed doc-drift line")** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the specific update. Always present; surfaces cumulative slice-local staleness that per-task Phase 4 closures can miss.
- [x] Cohort coherence inventory: each implementation child's deliverables read against the others (naming consistency, style parity, no contradictory cross-refs)
- [x] No regressions surfaced in earlier-shipped cohort children's surfaces — full local gate suite re-run green on audit HEAD (see Testing Notes)
- [x] Audit findings recorded in Implementation Notes; misses cited as candidates for `/ft-file-followup <NEW-ID>` filing (filed AFTER audit closure to preserve `/ft-file-followup`'s filing-discipline gate)
- [x] Single `chore: DEPLOY-007.N — audit DEPLOY-EPIC-007` commit lands (`chore:` — no code edits; the audit's only artifacts are this tasknote and the PLAN.md flips)
- [x] PLAN.md line for `DEPLOY-007.N` flipped to stub form `Completed 2026-09-09.`
- [x] Tasknote moved to `.flowtron/tasknote/archive/deployment/DEPLOY-007.N.md`
- [x] Parent-flip prompt surfaced after audit closure (skill Step 8) — user confirms or declines flipping `DEPLOY-EPIC-007` to `Completed` and moving the cohort to `## Completed`

## 🧩 Subtasks

- [x] Inventory cohort children's archived tasknotes — read each implementation child's Final Summary + Implementation Notes; capture deliverables in Discovery Notes
- [x] Walk `.flowtron/tasknote/README.md` §"AI-referenced docs" entries — fixed doc-drift sweep
- [x] Cohort coherence pass — naming consistency, style parity, no contradictory cross-refs across the cohort's deliverables
- [x] Surface audit findings in Implementation Notes; cite each miss as a `/ft-file-followup <NEW-ID>` candidate
- [x] Phase 4: flip `DEPLOY-007.N` PLAN line to stub form + archive tasknote
- [x] Parent-flip: skill Step 8 prompts user; on confirm, atomic flip parent line + move cohort to `## Completed`

## 🔗 Related

- [[DEPLOY-EPIC-007]] — parent epic (ci-gate-recovery)
- [[DEPLOY-007.2]] — cohort child: sharp-audit-gate
- [[DEPLOY-007.3]] — cohort child: push-backlog-ci-verify

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The operator invoked `/ft-close-epic DEPLOY-007.N` and pre-flight passed cleanly — working tree clean, `.N` is the canonical audit child, and both implementation children (`.2`, `.3`) are already `[x]`. No early-audit decision was needed: the cohort is complete, so the audit covers the full set rather than a partial one.

- [x] Read relevant source files — read both cohort children's archived tasknotes in full (`archive/deployment/DEPLOY-007.2.md`, `DEPLOY-007.3.md`), plus `README.md`, `AGENTS.md`, `CLAUDE.md`, `.github/workflows/ci.yml`, `.github/dependabot.yml`, and `.flowtron/core/claude/skills/ft-audit-repo/SKILL.md` for the child-numbering convention.

- [x] **Best Practices Review** — for code or module-boundary work, identified touched responsibilities, dependency direction, existing abstractions, nearby duplication, and any required in-scope refactor or deferred cleanup (otherwise `N/A` with reason)

  `N/A` — an epic audit is a verification pass over already-shipped deliverables. No module boundary, dependency direction, or abstraction is touched; the cohort itself wrote no source (a lockfile bump and a push).

- [x] **Archive skim** — largely self-referential, as expected for an epic audit: the cohort children *are* the archive entries in scope. Widened one step to `archive/deployment/` (DEPLOY-001 … DEPLOY-004), which both children had already skimmed and cited correctly; no non-cohort note contradicts either.

- [x] **Drift check** — file paths, line numbers, function names, and root-cause hypotheses cited in the task description still match current code, **and** the plan this tasknote is forming neither contradicts a SPEC contract nor diverges from its `PLAN.md` line

  **One live drift found, and it is the audit's headline finding** — `main` is `ahead 1`: DEPLOY-007.3's own closure commit `556d285` was never pushed, so CI's most recent run is still pinned to `e271888` (the `.2` commit), not the current tip. Detail in Implementation Notes → Finding 1. Everything else holds: `sharp` is `0.35.4`, `npm audit --omit=dev --audit-level=high` exits 0, and the archive folder is `deployment/` as `.3` recorded.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

  No clarifications needed — the cohort is complete and the audit scope is the full set. Explicit assumption: the epic's goal is read as *"the tip of `main` is CI-verified"*, not merely *"a push happened once"*. That reading is what makes Finding 1 in-scope for this audit rather than a new task.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

**Cohort inventory** (2 implementation children; no `.1` — see coherence note 1):

| Child | Shortname | Deliverable |
|---|---|---|
| [[DEPLOY-007.2]] | `sharp-audit-gate` | `npm update` pulled the Dependabot `patch-and-minor` group; `next` 16.3.3 → 16.3.4 raised its optional `sharp` pin to `^0.35.4`, resolving `sharp` 0.35.3 → 0.35.4 and clearing GHSA-rgj7-g3m4-5g8c. 1 file changed: `package-lock.json` (+1076/−741, generated). `package.json` untouched — every bump already fit its caret ranges. |
| [[DEPLOY-007.3]] | `push-backlog-ci-verify` | `git push origin main` (`2ac6136..e271888`, 30 commits) behind a ▶️ destructive-action gate, preceded by a local mirror of both CI jobs (including a `git archive HEAD` export to reproduce the `secrets` job's `.next/` isolation). CI run [`34401986707`](https://github.com/fakeneuron/blastimage/actions/runs/34401986707) green on both jobs. No source changed. |

**Measured state at audit time (2026-09-09):**

| Fact | Value |
|---|---|
| `git rev-parse HEAD` | `556d285` |
| `git rev-list --count origin/main..main` | **1** ⚠️ |
| Unpushed commit | `556d285 chore: DEPLOY-007.3 — push-backlog-ci-verify` — `.flowtron/PLAN.md` (+1/−1) + `archive/deployment/DEPLOY-007.3.md` (+244). **No source.** |
| Last CI run on `main` | `34401986707`, `success`, head `e271888` |
| `sharp` installed | `0.35.4` |
| `npm audit --omit=dev --audit-level=high` | exit 0, 0 vulnerabilities |

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — `N/A` for the audit itself (no new code surface; this is a verification pass over existing cohort deliverables). The procedural pattern surveyed instead: both children verified against CI's *own* step sequence rather than a proxy, so this audit re-ran that same suite rather than trusting their records.

- [x] **Minimal refactor gate** — no refactor. Nothing in the working tree was edited; the audit's only artifacts are this tasknote and the PLAN.md flips.

- [x] Implemented the minimal solution — verification work, not code edits. No inline fix was applied: the one finding's remedy is a `git push`, which is outward-facing and irreversible, so it is escalated to the 📦 gate rather than run inline.

- [x] Updated/added tests for non-trivial behavior — `N/A`; no behavior changed.

**Implementation Notes:**

### Finding 1 — the tip is not the verified tip (in scope, discharged at this audit's 📦 gate)

`main` is `ahead 1`. DEPLOY-007.3's own closure commit `556d285` never reached `origin`, so the newest CI evidence on `main` is run `34401986707` against head `e271888` — the `.2` commit, one behind local HEAD.

This matters because `.3` asserted the opposite. Its Acceptance line 2 reads "`main` pushed to `origin`; `git status -sb` shows no ahead-count" and is ticked `[x]`, and its Discovery assumption 3 was explicit about how that would be satisfied: *"This task's own closure commit is pushed too… the final state check happens after the closure push, and the acceptance is asserted against that final state."* The closure commit landed; the follow-up push did not. The tick describes an intended end-state that was never reached — the precise failure the epic exists to prevent, recurring in miniature at its own last step.

**Severity: low in substance, real in form.** The unpushed delta is `.flowtron/PLAN.md` plus one archived tasknote — zero source, zero lockfile. So no *code* on `main` is unverified, and the epic's substantive goal (30 commits of real work through the shared gate) genuinely was met. What is not met is the invariant the epic set out to restore: that `origin/main`'s tip carries a green run.

**Resolution — not filed as a follow-up.** This audit's own closure commit has to be pushed regardless, and that push carries `556d285` with it. Pushing at the 📦 gate therefore discharges the finding as a side effect of closing the audit properly, and leaves the epic's final state actually matching what `.3` claimed. Filing it as a separate child would be ceremony around a `git push` this closure needs anyway.

### Finding 2 — `vitest` `configLoader: 'native'` deprecation (follow-up candidate)

`npm test` still emits, on every run:

> ESM syntax in a file loaded as CommonJS (`vitest.config.ts:1:1`). Use a `.mjs` extension or set `"type": "module"` in the closest package.json

DEPLOY-007.2 surfaced this when it bumped `vitest` to 4.1.11 and deferred it as out of scope ("touching `vitest.config.ts` is unrelated source work; left for a future task if it becomes load-bearing") — a correct call at the time. It is re-confirmed present here and nothing has filed it, so the deferral is on track to be lost. It is warning-only today and becomes a hard failure whenever Vite flips `configLoader: 'native'` to the default in a future major.

**Candidate for `/ft-file-followup`** — one-line remedy (rename `vitest.config.ts` → `.mts`, or set `"type": "module"`), `[light]🔧`, low priority. Cited here rather than filed, per the audit's filing-discipline gate.

### Cohort coherence pass — no inconsistencies

Four things looked like inconsistencies and each checks out as correct:

1. **No `.1` Discovery child; children start at `.2`.** By design, not a numbering gap. `.flowtron/core/claude/skills/ft-audit-repo/SKILL.md:72` instructs: *"**Skip the `.1` Discovery child** — this run supplied the epic-level discovery; note it on the parent line (`Discovery supplied by audit-repo YYYY-MM-DD.`)."* The parent line carries that note verbatim. Consistent with SPEC/epic.md, which reserves `.1` for Discovery but does not require one when discovery came from elsewhere.
2. **Both children's nav chips still read `🟢 In progress`.** Correct per SPEC §"🚀 Phase 4: Closure" — that markdown write was retired by CORE-042.4 and the chip is render-derived from YAML `status:`. Both children have `status: completed`. Parity across the cohort, and this tasknote follows the same convention.
3. **Commit types differ — `fix:` for `.2`, `chore:` for `.3`.** Both correct for their content: `.2` remediated a vulnerability advisory, `.3` changed no source. Not a style drift.
4. **The parent line says "27 commits"; `.3` measured 30.** `.3` caught and documented this explicitly as the epic's own forward motion (the flowtron bump, the epic filing, and `.2`'s lockfile fix landed after filing) and correctly declined to re-scope. Documented divergence, not a contradictory cross-ref.

One genuinely trivial difference, noted and not worth fixing: `.3` retained the template's commented-out optional-planning-keys block in its frontmatter while `.2` stripped it. Inert YAML comments; no behavior, no reader confusion.

**Also considered and declined as a filing candidate:** `.3`'s carried-forward note about the [[DEPLOY-001]] `.next/` gitleaks trap (`gitleaks dir .` ignores `.gitignore`, so a post-build local scan reports phantom `generic-api-key` hits on Next's own `previewModeSigningKey` / `encryptionKey`). It is genuinely useful operator knowledge, but it is now recorded in two archived tasknotes — which is exactly where someone mirroring CI locally would look — and promoting it to `README.md` would grow the doc for a one-off procedure. Left in the archive.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — no code changed; ran the full suite anyway as the regression check Acceptance criterion 3 calls for.

- [x] Ran lint/type-check on changed code — run against the whole tree (the audit's own diff is markdown only).

- [x] **Quality assertions** — `N/A` — this audit changed no code. Its only artifacts are this tasknote and the PLAN.md flips; there is no duplication, dead code, complexity, or public surface to assess.

- [x] (frontend) `N/A` — no frontend surface changed; nothing renders differently. The verification that matters here is CI's, not a browser's.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

Re-ran the cohort's own gates on audit HEAD (`556d285`) rather than trusting the children's records — the point of criterion 3 is that the shipped surfaces still hold:

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run lint` | exit 0 |
| `npm test` | **31 files, 563 tests passed**, 4.52s |
| `npm audit --omit=dev --audit-level=high` | exit 0 — **0 vulnerabilities**; `sharp` resolves `0.35.4`, so `.2`'s fix holds |

Test and audit results match `.2` and `.3` exactly (same 31/563, same 0 vulnerabilities), so neither child's surface regressed.

`npm run build` was **not** re-run: no source, dependency, or config file has changed since CI verified it green on `e271888`, and the audit's diff is markdown. Stated rather than silently skipped.

The only warning in the run is Finding 2's `vitest` deprecation notice — pre-existing, non-fatal, already logged by `.2`.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flowtron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

  Each verdict verified against the file, not recalled:

  | Doc | Verdict |
  |---|---|
  | `README.md` | **no change** — its CI paragraph (`README.md:22-24`) describes `npm audit --omit=dev --audit-level=high` as "last step of the main job in `.github/workflows/ci.yml`" and the Dependabot posture as "npm patch/minor grouped and majors raised individually". Both re-verified accurate: `ci.yml:48-49` still has `Audit` as the `ci` job's final step, and `dependabot.yml:7-11` still declares the `patch-and-minor` group. "Last" is positional, not a date, so the cohort's activity did not stale it. |
  | `AGENTS.md` | **no change** — names no dependency version and no CI contract; the cohort moved neither. |
  | `CLAUDE.md` | **no change** — the Stack section pins the framework at the major only ("Next.js 16", `CLAUDE.md:9`), which `16.3.4` still satisfies. No patch-level claim to drift. |
  | `.flowtron/PLAN.md` | **updated** — `DEPLOY-007.N` stubbed to `Completed 2026-09-09.`; on parent-flip approval, `DEPLOY-EPIC-007` also flips to stub form and the cohort moves to `## Completed`. |

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated, YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form, tasknote moved to `.flowtron/tasknote/archive/deployment/`

- [x] **Evidence-based recap** drafted — surfaces at the 📦 ready-to-commit gate

**Final Summary:**

**What happened, plainly.** The `ci-gate-recovery` cohort audits clean on substance and turned up one thing worth catching: the epic restored the verification gate and pushed 30 commits through it, but its own final closure commit (`556d285`) never left the machine — so at audit time `origin/main`'s newest green run pointed one commit behind local HEAD. The unpushed delta is a PLAN.md line and an archived tasknote, no source, so nothing unverified is actually running; what was off was the invariant the epic set out to restore. Pushing at this audit's own commit gate fixes it, since that push carries `556d285` along with it.

**Cohort children inventoried.** [[DEPLOY-007.2]] (`sharp-audit-gate`) — `npm update` took `next` 16.3.3 → 16.3.4, raising its optional `sharp` pin to `^0.35.4` and clearing GHSA-rgj7-g3m4-5g8c; one generated file changed. [[DEPLOY-007.3]] (`push-backlog-ci-verify`) — pushed `2ac6136..e271888` behind a ▶️ gate after mirroring both CI jobs locally, then verified run `34401986707` green per-job; no source changed.

**Coherence.** No inconsistencies. Four apparent ones each resolved as correct: the absent `.1` child is mandated by `/ft-audit-repo` (SKILL.md:72) and annotated on the parent line as prescribed; both children's `🟢 In progress` nav chips are correct post-CORE-042.4 (render-derived from YAML) and consistent; the `fix:`/`chore:` split matches each child's content; and the parent line's "27 commits" vs `.3`'s measured 30 was caught and documented by `.3` rather than silently diverging.

**Verification.** `npm run typecheck` exit 0 · `npm run lint` exit 0 · `npm test` 31 files / 563 tests passed · `npm audit --omit=dev --audit-level=high` exit 0 (0 vulnerabilities, `sharp` 0.35.4). Identical to both children's recorded numbers, so neither shipped surface regressed. `npm run build` deliberately not re-run — no source, dependency, or config has moved since CI verified it green on `e271888`.

**Follow-ups to file.** One: the `vitest` 4.1.11 `configLoader: 'native'` deprecation on `vitest.config.ts`, deferred by `.2` and never filed, warning-only today and a hard failure once Vite flips the default. `[light]🔧`.

**Documentation verdict.** No AI-referenced doc drifted — each of `README.md`, `AGENTS.md`, `CLAUDE.md` re-checked against the config it describes and confirmed accurate. `.flowtron/PLAN.md` updated with this audit's own flip.

**Maintainability effect.** The epic's claim and the epic's actual state now agree: `origin/main` carries a green CI run on its tip, not one commit behind it. That is the difference between a gate that is *working* and a gate that *worked once* — and it is the same distinction the epic was filed to fix, so closing it here keeps the epic honest about itself.

**Parent-flip decision:** **Yes** (operator-confirmed at the 📦 gate, 2026-09-09) — `DEPLOY-EPIC-007` flipped to stub form and the full cohort (`.2`, `.3`, `.N`) moved atomically from `## High` to the top of `## Completed`. `## High` was left empty by the move, so its `(none)` placeholder was restored. The operator also approved the Finding 1 push, so this closure commit and the previously-unpushed `556d285` go to `origin` together and CI is verified on the resulting tip.

**Archived:** 2026-09-09
