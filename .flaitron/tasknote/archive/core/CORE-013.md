---
title: audit-overlay-deltas
status: completed
tags: []
created: 2026-10-19
due:
related-tasks: [BI-072]
# Optional planning keys — omit when absent (SPEC.md §Tasknote frontmatter).
# Omitted means undeclared, not "touches nothing" / "safe with everyone".
touches:
  - .claude/skills/audit/SKILL.md
# blocked-by:
#   - TASK-ID
# parallel-safe-with:
#   - TASK-ID
# supersedes:
#   - TASK-ID
---

# CORE-013 | audit-overlay-deltas

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[BI-072]]

## 🎯 Goal

Fill `.claude/skills/audit/SKILL.md` `## Deltas` for all eight claimed domains so `/audit <domain>` resolves every slot from the overlay and never trips `scaffold-bootstrap.md`.

## ✅ Acceptance

- [x] No `<…>` placeholder or `_(forker:` note remains in the overlay — `! grep -nE '<[a-z][^>]*>|_\(forker' .claude/skills/audit/SKILL.md` (angle-bracket check scoped to placeholder prose, see Testing Notes)
- [x] Every domain with forker slots (general · backend · frontend · security · performance · docs · structure) has a keyed Scope / Rubric / Gates / Per-pass examples entry, and `context` is declared as running on pass-file defaults — `judgment` (structural read against scaffold-bootstrap §1 overlay exemption)
- [x] Every gate command named in the overlay runs from repo root (exit 0 or a documented ungated "none") — each command run and receipted in Testing Notes
- [x] Security secret-scan gate matches CI's scanned surface (HEAD tree, not gitignored `.next*/`) — `git archive HEAD | tar -x -C $t && gitleaks dir $t --config .gitleaks.toml --no-banner --redact` → 0
- [x] Hard rules carry the three operator-chosen rules (resolveUnderRoot / useWorkspace-whole / `.flaitron/core` read-only) — `grep -c` on each key phrase
- [x] `/audit security` and `/audit docs` reach pass 1 without the scaffold prompt — `judgment` (dispatch dry-run: §1 step 3 placeholder scan against the overlay finds zero unset slots for each domain)

## 🧩 Subtasks

- [x] Rewrite `## Domains` to say all eight are filled (context on pass-file defaults)
- [x] Rewrite `## Deltas` as per-slot bullets with per-domain sub-bullets (judedelparte/caobunga shape): Scope glob · Rubric files · Verification gates · Sacred invariants (keep as-is, unkeyed) · Per-pass examples · Extra hard rules
- [x] Run every gate command named; receipt in Testing Notes
- [x] Placeholder scan + dispatch dry-run for `security` and `docs`

## 🔗 Related

- [[BI-072]] — origin of the resolveUnderRoot hard rule (predecessor)
- [[BI-049]] — useWorkspace stays-whole decision, encoded as a hard rule

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Overlay `## Deltas` still has `<operator to fill>` for Per-pass examples / Extra hard rules and only a `general` scope glob, so per scaffold-bootstrap §1's overlay exemption every non-general domain counts as unset and trips the bootstrap — exactly as filed.

- [x] Read relevant source files — overlay, `ft-audit/SKILL.md`, `scaffold-bootstrap.md`, all eight `passes/*.md` slot blocks, `ci.yml`, `package.json`, `.gitleaks.toml`, `.pre-commit-config.yaml`, `justfile`, tasknote README §AI-referenced docs; peer overlays via an Explore probe (15 repos)

- [x] **Best Practices Review** — N/A: config/prose only, no module boundaries touched

- [x] **Archive skim** — `grep -l skills/audit` over every archive area: no hits (overlay history is only marker-reconcile chores 5a467ce / 9f2d3fe). Followed BI-072 (archive/bi): `lib/imagegenServerFs.ts` is the sole `node:fs` importer under app/ lib/, `resolveUnderRoot` is the single confinement chokepoint, escape message `Path escapes the linked imagegen folder:` is asserted by route suites.

- [x] **Drift check** — `ci.yml` npm audit / gitleaks steps now at `:100` / `:127` region as cited (Audit step + Gitleaks step confirmed); gitleaks false-positive claim confirmed by CI comment (BI-034.5). `context` pass has no forker slots — PLAN line's "all eight" satisfied by an explicit defaults entry. No drift.

- [x] Asked clarifying questions — operator chose: hard rules = resolveUnderRoot · useWorkspace stays whole · `.flaitron/core` read-only (declined the no-deploy rule); frontend gates = fast gates only (no e2e); `landing/` in frontend/docs/security scope.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared (omit only with no file deliverable)

**Discovery Notes:**

- Peer shape (Explore probe, 15 overlays): per-slot bold bullet + per-domain sub-bullets (`general · structure:` grouping); judedelparte is the closest all-eight model. Nobody writes `context` deltas — declared in `## Domains` as running on the shipped pass file. "None" slots are always stated explicitly with a reason, never blank.
- Secret scan: literal `gitleaks dir .` locally walks gitignored `.next*/`; CI scans a fresh checkout. bananapeel's archive-of-HEAD form gives exact parity — verified here: `no leaks found`, exit 0. `npm audit --omit=dev --audit-level=high` → 0.
- Frontend build gate is `npm run build:verify` (`.next-verify/`, CORE-002) so audits don't clobber a live dev server.
- No perf budget, no doc tooling, no structure detectors exist — each stated as none.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the overlay's own per-domain keying convention in the judedelparte/caobunga peer shape (slot bullet + per-domain sub-bullets)

- [x] **Minimal refactor gate** — only `## Domains` line and `## Deltas` body changed; Sacred invariants bullet kept verbatim

- [x] Implemented the minimal solution

- [x] Updated/added tests — N/A: prose config, no code

**Implementation Notes:**

- Operator declined the no-deploy hard rule; not added. The BI-072 rule ships with a mechanical check (the `node:fs` importer grep) in the security gates, run also by backend/structure.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite — `npm test` → 0 (as a named gate)

- [x] Ran lint/type-check — `npm run lint` → 0 · `npm run typecheck` → 0

- [x] **Verification receipt** — each Acceptance verify command in Testing Notes as `command → exit code` (+ first failure line); changed code free of duplication, dead code, and stale docs (otherwise `N/A` with reason)

- [x] **External review** — a non-author context graded the diff against `## ✅ Acceptance`; findings recorded below (**blocker** → back to Phase 2; **note** → fixed or filed), or `N/A` with reason

- [x] (frontend) visual confirmation — N/A: no UI change

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Receipt:
- `grep -nE '<[a-z][^>]*>|_\(forker|operator to fill' .claude/skills/audit/SKILL.md` → only the template's shipped prose (`<placeholder>` L14, `<domain>` L20/22/33) — no slot placeholders, no forker notes
- `npm run typecheck` → 0 · `npm run lint` → 0 · `npm test` → 0 · `npm run build:verify` → 0 · `npm --prefix landing run check` → 0
- `npm audit --omit=dev --audit-level=high` → 0 · `npm --prefix landing audit --omit=dev --audit-level=high` → 0
- `( set -o pipefail; …git archive HEAD | tar -x -C "$t" && gitleaks dir "$t" --config .gitleaks.toml --no-banner --redact )` → 0 (`no leaks found`)
- `grep -rlE "from ['\"](node:)?fs" app lib | grep -v '\.test\.'` → `lib/imagegenServerFs.ts` only
- Hard rules: `resolveUnderRoot` / `stays whole (BI-049)` / `.flaitron/core/\` is read-only` each present (grep -c ≥1)
- Dispatch dry-run (`judgment`): ft-audit §1 step 3 subtracts what `## Deltas` supplies. For `security`, every Scope/Rubric/Gates slot has a `security:` key and each `_(forker:)_` note (pass 1 secrets source, pass 2 stack examples, pass 3 auth model, pass 5 scanner count, severity, hard rules) maps to a `security / <pass>` example or the unkeyed severity/hard-rule bullets. Same for `docs` (passes 1–4 keyed, gates stated none per the pass file's "skip if no doc tooling"). Zero unset slots → silent no-op → pass 1. A live `/audit` run was not executed (it would file PLAN rows); the PLAN line's verify is satisfied structurally.
- Quality: no duplication / dead text; stale `<operator to fill>` lines removed.

External review — `/code-review medium` on `.claude/skills/audit/SKILL.md`, 10 findings, all graded **note** (no Acceptance criterion failed), all fixed:
1. security scope missed `landing/astro.config.mjs` (bind) + `justfile` → added
2. landing `npm audit` gate missing (CI has two) → added
3. gitleaks archive pipe lacked `pipefail` / toplevel → added `set -o pipefail` + `git -C $(git rev-parse --show-toplevel)`
4. backend error example over-broad (other messages are legitimate) → narrowed to confinement failures
5. "user-facing strings outside useWorkspace" over-broad → narrowed to error/confirm strings
6. frontend scope missed client `lib/` modules → every non-route `lib/*`
7. backend scope missed route suites in `lib/` → added `lib/imagegen*.test.ts`
8. docs scope missed `.flaitron/tasknote/README.md`, `brand/*.md` → added
9. `listRounds` "on each poll" false premise → corrected to link/mount/action
10. `node:fs` hard rule had no mechanical check → grep added to security gates (also run by backend/structure)

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — README.md no change · AGENTS.md no change · CLAUDE.md no change · PLAN.md stub flip only · VISION.md no change · docs/ADOPT.md, WORKFLOW.md, REVIEW-LOOP.md, GROK-AGENT.md no change (overlay is not in the AI-referenced set; nothing describes its fill state) — per `.flaitron/tasknote/README.md` §"AI-referenced docs" entry: "no change" or the update

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files, verification results, refactors, doc verdict, `touches:` reconciliation (`git diff --name-only` vs declared), maintainability effect

- [x] **Learnings** — N/A: the gitleaks parity form lives in the overlay where audits read it

**Final Summary:**

- Changed: `.claude/skills/audit/SKILL.md` (`## Domains` line; `## Deltas` filled for all seven slotted domains, `context` declared on defaults). Plus tasknote + PLAN stub.
- Verification: all named gates exit 0 (receipt above); review's 10 notes fixed.
- Refactors: none. Docs: no AI-referenced doc changed.
- `touches:` reconciliation: declared `.claude/skills/audit/SKILL.md`; `git diff --name-only` → that file + `.flaitron/PLAN.md` + tasknote (workflow files) — matches.
- Maintainability: `/audit <any domain>` now dispatches straight to pass 1; the BI-072 confinement rule is grep-checkable at every security/backend/structure run.

**Archived:** 2026-10-19
