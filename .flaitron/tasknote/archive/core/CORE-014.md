---
title: secrets-posture
status: completed
tags: [secrets, github, gitignore]
created: 2026-10-29
due:
related-tasks: []
touches:
  - .gitignore
  - README.md
---

# CORE-014 | secrets-posture

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 natabula NAT-471

## 🎯 Goal

Close the two gaps NAT-471 found: gitignore `.dev.vars*` (keeping `.dev.vars.example`) for the root and `landing/`, and enable GitHub secret scanning + push protection on the public repo, verified by metadata, with gitleaks left as is.

## ✅ Acceptance

- [x] Root `.gitignore` ignores `.dev.vars`, `.dev.vars.local`, `.dev.vars-backup` and does not ignore `.dev.vars.example`, at root and under `landing/` — `git check-ignore -q --no-index` on the synthetic paths (exit 0 ×3, exit 1 for the example, per dir); operator step if the Layer-1 fence refuses it
- [x] No `.dev.vars*` value file is tracked — `git ls-files -- '*.dev.vars*'` prints nothing (or only the example)
- [x] `secret_scanning` and `secret_scanning_push_protection` read `enabled` — `gh api repos/{owner}/{repo} --jq .security_and_analysis`
- [x] gitleaks preserved: `.pre-commit-config.yaml`, `.gitleaks.toml`, CI `secrets` job untouched — `git diff --name-only` shows none of them
- [x] No visibility change, paid upgrade, rotation or alert-value read — `judgment`: the run's command log is the evidence; `visibility` still `public` in the same metadata read

## 🧩 Subtasks

- [x] Add `.dev.vars*` / `!.dev.vars.example` to root `.gitignore` under the Secrets block, comment matching natabula `configs/.gitignore`
- [x] Run the synthetic-path ignore check for root + `landing/`, and the `git ls-files` tracking check
- [x] PATCH `security_and_analysis` to enable `secret_scanning` then `secret_scanning_push_protection`
- [x] Re-read metadata to verify both read `enabled`; visibility unchanged
- [x] README: add one line on the GitHub secret-scanning/push-protection setting next to the gitleaks/Dependabot paragraph (doc-drift)

## 🔗 Related

- natabula NAT-471 — fleet secrets audit that filed this row (findings #4, #5; ledger row `33424f03f5e6`)
- flaitron CORE-842 — sibling row for the other public repo (same controls)
- CORE-015 — the `.dev.vars*` half, split out by `/ft-seed-unattended` (8f4f290) mid-run after this note had already made the edit; operator chose to close it in this commit (stub only, no tasknote)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Re-checked live state 2026-10-29: the root `.gitignore` has only `.env*` / `!.env.example`, and `landing/.gitignore` adds only `.astro/` and `.wrangler/`, so `.dev.vars*` goes unignored in both places. GitHub metadata still reads `secret_scanning` and `secret_scanning_push_protection` as `disabled` on a public, User-owned repo. Both gaps are real.

- [x] Read relevant source files — `.gitignore`, `landing/.gitignore`, `README.md` §gitleaks/Dependabot, natabula `configs/.gitignore` + `docs/SECRETS.md` §"Review ignore coverage", NAT-471 tasknote

- [x] **Best Practices Review** — N/A: config + repo setting, no code or module boundaries

- [x] **Archive skim** — `archive/core/` confirmed against README table. Grep for `secret.scanning|push.protection|dev\.vars` across archive: hits only BI-034.5/BI-034.N, both stating no prior task touched secret scanning. Nothing constraining.

- [x] **Drift check** — PLAN line matches live state; "root/landing" collapses to one root edit, since slashless root patterns apply recursively into `landing/`. No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared (omit only with no file deliverable)

**Discovery Notes:**

- Live metadata (pre-change): `visibility: public`, owner type `User`, `dependabot_security_updates: enabled`, `secret_scanning`, `secret_scanning_non_provider_patterns`, `secret_scanning_push_protection` and `secret_scanning_validity_checks` all `disabled`.
- Eligibility: secret scanning + push protection are free for public repos. Non-provider patterns and validity checks need a paid Secret Protection license, so they're out of scope (no paid upgrades).
- natabula canonical lines: `.dev.vars*` / `!.dev.vars.example` with the comment "Cloudflare Worker local secrets (`wrangler dev`) — not matched by .env*; keep .dev.vars.example for docs".
- SECRETS.md: the synthetic `git check-ignore --no-index` commands are operator steps if the Layer-1 fence refuses name-only `.dev.vars` tokens. Try once; if refused, hand the operator the commands, never work around the fence.
- Operator answers (2026-10-29): **Enable both** (secret scanning + push protection only; extras left off). **Root `.gitignore` only**: `.claudeignore` / `.cursorignore` wait for `/natabula-layer-refresh`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an existing pattern or justified a new shape

- [x] **Minimal refactor gate** — refactored only for Acceptance or touched-path coherence; deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior — N/A: ignore rule + repo setting; no test harness surface

**Implementation Notes:**

- `.gitignore`: added natabula `configs/.gitignore`'s exact comment + `.dev.vars*` / `!.dev.vars.example` under the existing Secrets block. `landing/.gitignore` left as is: root slashless patterns already reach `landing/`.
- GitHub (2026-10-29, operator-authorized): two `gh api -X PATCH repos/fakeneuron/blastimage`, one per control. `secret_scanning` → `enabled`, then `secret_scanning_push_protection` → `enabled`. Non-provider patterns and validity checks left `disabled` (paid). No alert endpoints touched.
- README: one sentence after the Dependabot-setting clause recording that the repo setting enables scanning and push protection on top of gitleaks.
- Layer-1 fence refused the synthetic `git check-ignore` command (name-only `.dev.vars` tokens), as SECRETS.md §"Review ignore coverage" predicts. Not bypassed; the check goes to the operator.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A: no code changed (ignore rule, repo setting, one README sentence); the synthetic ignore check below is the targeted test

- [x] Ran lint/type-check on changed code — N/A: no TS/JS touched

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) N/A: no UI change. Asked the user for visual confirmation (`👁️ **CONFIRM**` on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

- `git check-ignore -q --no-index` on `.dev.vars`, `.dev.vars.local`, `.dev.vars-backup`, `.dev.vars.example` at root and `landing/` → 0, 0, 0, 1 in both dirs. Operator-run in a real Terminal 2026-10-29 because the Layer-1 fence refuses it for agents.
- `git ls-files | grep -c -E '(^|/)\.dev\.vars'` → `0`; no tracked value file.
- `gh api repos/{owner}/{repo} --jq '{visibility, security_and_analysis}'` → exit 0; `secret_scanning: enabled`, `secret_scanning_push_protection: enabled`, `visibility: public`; non-provider patterns, validity checks `disabled` (unchanged, paid).
- `git diff --name-only` → `.gitignore`, `README.md` (+ `.flaitron/` closure files); no `.pre-commit-config.yaml`, `.gitleaks.toml` or `.github/workflows/ci.yml`, so gitleaks is preserved.
- Judgment (no-forbidden-actions criterion): the run issued only two PATCHes on `security_and_analysis` and metadata GETs. No visibility, billing, rotation or `secret-scanning/alerts` calls.
- External review: N/A. The diff is 3 `.gitignore` lines copied verbatim from natabula `configs/.gitignore` plus one README sentence, too small to grade. The operator-run ignore check is the behavioral receipt.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — README.md: updated (secret scanning + push protection sentence). AGENTS.md, CLAUDE.md, VISION.md, docs/ADOPT.md, docs/WORKFLOW.md, docs/REVIEW-LOOP.md, docs/GROK-AGENT.md: no change (none describe the repo's secret controls or ignore rules). PLAN.md: closure stub. — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: "no change" or the update

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — N/A: SECRETS.md already documents the fence-refuses-ignore-check operator handoff — anything the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

**Final Summary:**

`.dev.vars*` (except `.dev.vars.example`) is now gitignored at the root, which also covers `landing/`. GitHub secret scanning and push protection are enabled on the public repo, with gitleaks unchanged. Changed: `.gitignore` (+3), `README.md` (+1 sentence). Verification: operator-run synthetic `check-ignore` (0/0/0/1 ×2), metadata re-read showing both controls `enabled` and visibility `public`, 0 tracked value files. No refactors. `touches:` matches the diff (`.gitignore`, `README.md`). Maintainability: matches the natabula deposit, so a future layer refresh reports this file as identical on these lines. Advisory `.claudeignore` / `.cursorignore` are deliberately left for `/natabula-layer-refresh` (operator choice).

**Archived:** 2026-10-29
