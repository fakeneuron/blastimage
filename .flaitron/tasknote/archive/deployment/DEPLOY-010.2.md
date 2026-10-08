---
title: runtime-advisories
status: completed
tags: [deps, security, ci]
created: 2026-10-08
due:
related-tasks: [DEPLOY-EPIC-010, DEPLOY-007.2]
touches:
  - package.json
  - package-lock.json
---

# DEPLOY-010.2 | runtime-advisories

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-010]]

## 🎯 Goal

Clear the high/critical runtime advisories (next, sharp, source-map-js) so `npm audit --omit=dev --audit-level=high` exits 0 on the committed lockfile, with every gate still green.

## ✅ Acceptance

- [x] Runtime audit clean — `npm audit --omit=dev --audit-level=high` → exit 0
- [x] `next` floor raised to the first patched release (16.3.8) and lockfile resolves sharp ≥ 0.35.5, source-map-js ≥ 1.2.2 — `npm ls next sharp source-map-js` (exit 0, versions match)
- [x] Clean install from lockfile — `npm ci` → exit 0
- [x] Type-check — `npm run typecheck` → exit 0
- [x] Lint — `npm run lint` → exit 0
- [x] Unit tests — `npm test` → exit 0
- [x] Production build — `npm run build` → exit 0
- [x] E2E — `npm run test:e2e` → exit 0

## 🧩 Subtasks

- [x] `npm install next@16.3.8` (writes `^16.3.8` floor + lockfile pin to the patch, no minor jump)
- [x] `npm update sharp source-map-js` to lift the transitive resolutions inside their existing ranges
- [x] `npm ci` for a clean tree (local node_modules currently holds a stale next 16.3.4)
- [x] Run audit + typecheck / lint / test / build / e2e

## 🔗 Related

- [[DEPLOY-EPIC-010]] — parent epic (gates-green, Milestone 0)
- [[DEPLOY-007.2]] — predecessor advisory bump (sharp via next's optionalDependencies pin)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Audit still fails (2 high, 1 critical) on the committed lockfile; the CI `Audit` step is a required gate for DEPLOY-010.5's push.

- [x] Read relevant source files — `package.json`, `package-lock.json` (next/eslint-config-next entries), `npm audit` + `npm ls` output, npm registry dist-tags.

- [x] **Best Practices Review** — N/A: dependency-version change only, no code or module boundaries touched.

- [x] **Archive skim** — `archive/deployment/` (confirmed `DEPLOY-*` → `archive/deployment/` in README table). DEPLOY-007.2 cleared an earlier sharp advisory with a broad `npm update` (lockfile +1076/−741) and noted `package.json` needed no edit then. This time a targeted bump keeps the lockfile diff small. Other hits (007.3/008.x/009.3, 002–004) are CI/push tasks with nothing load-bearing here.

- [x] **Drift check** — PLAN line cites next 16.3.5 / sharp 0.35.4 / source-map-js 1.2.1: lockfile matches. **Drift:** the next advisory range has widened to 16.0.0–16.3.7 (six more GHSAs since the audit, incl. image-optimization SSRF and cache poisoning), so the floor must reach **16.3.8**, not just "patched for GHSA-vcvr". Still within the PLAN line's "raise the `next` floor if the fix needs it", so no re-scope. `next@16.3.8` keeps `optionalDependencies.sharp ^0.35.4` (0.35.5 satisfies) and pins `postcss 8.5.23`, whose `source-map-js` range accepts 1.2.2. Local `node_modules/next` is a stale 16.3.4 (`npm ls` ELSPROBLEMS) — `npm ci` resolves it.

- [x] No clarifications needed (--fast) — assumptions: pin to the 16.3.8 patch rather than jump to 16.4.0 latest (smallest change that clears the audit); leave `eslint-config-next` at `^16.3.5` (not flagged, dev-only, out of scope).

- [x] Subtasks above populated with concrete, ordered steps, and YAML `touches:` declared with the paths this task expects to edit

**Discovery Notes:** See drift check — advisory range widened; 16.3.8 is the first clean `next`. Discovery surfaced no significant deviation → skip 🛠️.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended an established pattern or justified a new shape; checked DRY and single-responsibility (SRP) boundaries; preferred composition when it reduced coupling

- [x] **Minimal refactor gate** — refactored only for Acceptance or to prevent duplication, obscured responsibility, or a dependency-boundary violation in the touched path; recorded the reason and deferred unrelated cleanup

- [x] Implemented the minimal solution

- [x] Updated/added tests for non-trivial behavior

**Implementation Notes:** Pattern: standard npm pin bump, no new shape; no refactor (dependency-only). `npm install next@16.3.8` wrote the `^16.3.8` floor and pinned the lockfile to the patch (no 16.4.0 minor jump); `npm update sharp source-map-js` lifted the transitives in-range; `npm ci` rebuilt a clean tree (replacing the stale 16.3.4). Lockfile scope verified: only `next` + `@next/swc-*` (16.3.8), `sharp` + `@img/sharp-*` (0.35.5), `@img/sharp-libvips-*` (1.3.4, the librsvg fix), `source-map-js` (1.2.2) moved — 162+/162−. No tests added: no behavior change; the existing suites are the regression net. Pre-existing `npm warn install-scripts` (fsevents, unrs-resolver) are unrelated to this bump.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code

- [x] Ran lint/type-check on changed code

- [x] **Verification receipt** — recorded each Acceptance verify command in Testing Notes as `command → exit code`, with the first failure line when non-zero; and, for changed code, confirmed no avoidable duplication, dead code, unexplained complexity, unnecessary public-surface growth, or stale code-facing documentation (otherwise `N/A` with reason)

- [x] **External review** — a context that did not write the diff graded it against `## ✅ Acceptance`, and every finding is recorded below with its disposition (**blocker** → back to Phase 2; **note** → fixed or filed). `N/A` with a one-line reason when the diff is too small to grade

- [x] (frontend) Asked the user for visual confirmation (emphasized `👁️ **CONFIRM**` ask on its own line)

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Verification receipt:
- `npm audit --omit=dev --audit-level=high` → 0 (found 0 vulnerabilities)
- `npm ls next sharp source-map-js` → 0 (next 16.3.8, sharp 0.35.5, source-map-js 1.2.2)
- `npm ci` → 0
- `npm run typecheck` → 0
- `npm run lint` → 0
- `npm test` → 0 (33 files / 668 tests)
- `npm run build` → 0
- `npm run test:e2e` → 0 (10 passed)

Structural: no source changed, so there is no duplication, dead code, or public-surface growth to check.

External review: N/A — the diff is a one-line `package.json` floor bump plus a generated lockfile. It is graded by the eight Acceptance commands above, and a reviewer has no source to judge.

👁️ visual confirmation: N/A — no UI change (framework patch release only). The e2e suite exercises the rendered shell, and the ask is suppressed under --fast in any case.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — for each entry in `.flaitron/tasknote/README.md` §"AI-referenced docs", state "no change" or the update

- [x] Closed — every `## ✅ Acceptance` criterion ticked or explicitly annotated (`N/A` / not-met with a one-line reason), YAML `status:` flipped to `completed`, PLAN.md line flipped to stub form `Completed YYYY-MM-DD.` and placed (standalone → top of `## Completed`; epic child → kept nested beneath its active parent — see SPEC/plan-filing.md §"`## Completed` archive convention" if unclear), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — changed files/LOC where meaningful, verification commands/results, refactors made or deferred with rationale, documentation verdict, the `touches:` scope reconciliation (`git diff --name-only` vs declared; name undeclared paths), and concrete maintainability effect (surfaces at the 📦 ready-to-commit gate, or inline on conditional skip)

- [x] **Learnings** — did this task teach something the always-loaded layer (AGENTS.md / README §AI-referenced docs) should carry? `N/A` or the line

Doc-drift sweep: `README.md` no change · `AGENTS.md` no change ("Next.js 16" stays accurate) · `CLAUDE.md` no change · `.flaitron/PLAN.md` gets this task's stub flip · `VISION.md` no change · `docs/ADOPT.md` no change (Node ≥ 20.9 unchanged) · `docs/WORKFLOW.md` no change · `docs/REVIEW-LOOP.md` no change · `docs/GROK-AGENT.md` no change.

Learnings: N/A.

**Final Summary:**

The runtime audit is clean again. `next` moved 16.3.5 → 16.3.8 (the floor is now `^16.3.8`), `sharp` 0.35.4 → 0.35.5 (libvips 1.3.4) and `source-map-js` 1.2.1 → 1.2.2. `npm audit --omit=dev --audit-level=high` exits 0. One drift from the PLAN line: the `next` advisory range had grown to 16.0.0–16.3.7 (six more GHSAs, including an image-optimization SSRF and SSG/ISR cache poisoning), so 16.3.8 is the first clean release. That was still within the line's "raise the floor if needed".

**Changed:** `package.json` (1 line) and `package-lock.json` (162+/162−, generated). This is a much narrower lockfile diff than DEPLOY-007.2's broad `npm update`.

**Verification:** audit, `npm ci`, typecheck, lint, unit tests (668/668), build and e2e (10/10) all exit 0.

**Refactors:** none made, none deferred. `eslint-config-next` stays at `^16.3.5` on purpose: it is dev-only, has no advisory, and is out of scope.

**Scope:** `git diff --name-only` = `package.json` and `package-lock.json`, matching the declared `touches:`. PLAN.md and this tasknote are the closure writes.

**Maintainability:** the required CI `Audit` gate is green again ahead of DEPLOY-010.5's push.

**Archived:** 2026-10-08
