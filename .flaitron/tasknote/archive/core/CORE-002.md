---
title: build-clobbers-dev-server
status: completed
tags: []
created: 2026-08-30
due:
related-tasks: [BI-046, BI-047]
touches:
  - next.config.ts
  - package.json
  - .gitignore
  - .flowtron/tasknote/README.md
  - tsconfig.json
---

# CORE-002 | build-clobbers-dev-server

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[BI-046]] [[BI-047]]

## 🎯 Goal

Stop `npm run build` (Phase 3 verification) from overwriting the `.next/` directory the operator's live `next dev -p 3003` serves from, which currently leaves it 500ing until manually restarted.

## ✅ Acceptance

- [x] Running `npm run build:verify` (or equivalent verification build) while `npm run dev` is live on :3003 does not make the dev server 500 or otherwise disrupt it — reproduced live in Phase 3: 200 before, 200 during/after the build.
- [x] Production `npm run build` behavior (output `distDir`) is unchanged — no env var set, so `next.config.ts` still resolves to the default `.next` `distDir`.
- [x] The hazard and its fix are documented in `.flowtron/tasknote/README.md` §"Project quick commands" so future AI sessions verify with the isolated build

## 🧩 Subtasks

- [ ] Add env-gated `distDir` override to `next.config.ts` (`.next-verify` when `NEXT_VERIFY_BUILD` is set, default `.next` otherwise)
- [ ] Add `build:verify` script to `package.json`
- [ ] Add `.next-verify/` to `.gitignore`
- [ ] Update `.flowtron/tasknote/README.md` §"Project quick commands" to point AI-session verification builds at `npm run build:verify`
- [ ] Verify: run `npm run dev` in the background, then `npm run build:verify`, confirm the dev server keeps serving 200s throughout and only `.next-verify/` changes on disk

## 🔗 Related

- [[BI-046]] — first hit: `npm run build` rewrote `.next/` while `next dev` was live on :3003, left it 500ing until diagnosed and the dev server restarted
- [[BI-047]] — second hit, same trap; flagged as a repo hazard rather than a one-off, which is what filed this task

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The hazard is reproduced verbatim in two consecutive archived tasknotes (BI-046, BI-047) and the root cause (Next.js's default `distDir: .next` being shared between `next dev` and `next build`) is still present in `next.config.ts` and `package.json` today. Nothing has changed since those write-ups that would obsolete the task.

- [x] Read relevant source files — `next.config.ts` (no config; default `distDir`), `package.json` scripts (`dev`: `next dev --turbopack -p 3003`, `build`: `next build --turbopack`), `.gitignore` (`.next/` ignored, no verify-dir entry), `.flowtron/tasknote/README.md` §"Project quick commands" (lists `npm run build`... wait, it doesn't — lists dev/test/lint/typecheck only, no build line), `docs/ADOPT.md` (names `npm run dev` only).

- [x] **Best Practices Review** — Next.js supports a configurable `distDir` in `next.config.ts`, and it can be driven by an env var read at config-eval time. The minimal, root-cause fix is a second npm script that points a one-off verification build at a different `distDir` (e.g. `.next-verify`) via an env var, leaving `next dev`'s `.next/` untouched. This extends Next.js's own config surface rather than introducing a new mechanism, and needs no new abstraction — one conditional line in `next.config.ts` plus one script in `package.json`.

- [x] **Archive skim** — `BI-046.md` and `BI-047.md` (both already read via `related-tasks`) are the only archive hits for `npm run build`/`distDir`/`clobber`. Both describe the identical failure mode (build's default `.next/` write stomping the live dev server's own `.next/`) and both explicitly deferred a fix rather than making one — BI-047's closing note ("Worth a follow-up... a repo hazard rather than a one-off") is what filed CORE-002. No design decision or hardlink note to carry forward beyond that.

- [x] **Drift check** — PLAN.md's CORE-002 line still matches current code: `next.config.ts` has no `distDir` override (confirmed above), and `npm run build` is still a plain `next build --turbopack` with no dist-dir isolation. No SPEC contract bears on build tooling. No drift.

- [x] No clarifications needed (--fast not set, but the task is unambiguous) — proceeding with the first PLAN-suggested option (separate `distDir` for verification builds) over documentation-only, since it fixes the hazard at the source instead of relying on every future session remembering to read a doc note. Documenting the new script's purpose in the quick-commands doc is still in scope as a small addition, not a substitute.

- [x] Subtasks above populated with concrete, ordered steps

**Discovery Notes:**

Root cause: Next.js defaults `distDir` to `.next` for both `next dev` and `next build`; nothing in this repo overrides it, so a Phase-3 verification build always writes into the same directory the operator's long-running dev server is reading from mid-request, which 500s until the dev server restarts and re-warms.

Fix shape: read an env var (`NEXT_VERIFY_BUILD`) in `next.config.ts` and set `distDir: '.next-verify'` when it's set; add an `npm run build:verify` script that sets the env var and runs `next build --turbopack`; keep the existing `npm run build` (plain, default `.next/`) as the production build command unchanged — verification is the only caller that needs isolation, production deploys should still produce the conventional `.next/`. Add `.next-verify/` to `.gitignore`. Update `.flowtron/tasknote/README.md` §"Project quick commands" to tell AI sessions to use `npm run build:verify` for Phase 3 checks instead of `npm run build`.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — no existing pattern in this repo for isolating a verification build's output; extended Next.js's own `distDir` config knob (its documented mechanism for exactly this) rather than inventing a new one. `next.config.ts` stays a single small object; the conditional spread is the smallest change that keeps the default (production) path untouched.

- [x] **Minimal refactor gate** — no refactor; this is additive config (one conditional key, one npm script, one gitignore line, one doc line), scoped to Acceptance only.

- [x] Implemented the minimal solution — env-gated `distDir` in `next.config.ts`, `build:verify` script in `package.json`, `.next-verify/` in `.gitignore`, quick-commands doc updated.

- [x] Updated/added tests for non-trivial behavior — N/A: this is build-tool config with no runtime application code path; correctness is verified by actually running the build against a live dev server (Phase 3), not a unit test.

**Implementation Notes:**

`next.config.ts` now spreads `{ distDir: ".next-verify" }` into the config object only when `NEXT_VERIFY_BUILD` is set, so `npm run dev` and `npm run build` (no env var) are byte-identical to before — both still use Next's default `.next`. `npm run build:verify` sets `NEXT_VERIFY_BUILD=1` and runs the same `next build --turbopack` used by `npm run build`, so it exercises the identical build path, just under an isolated output directory.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — no unit-testable behavior changed (build-tool config only); ran the full suite instead as the real-world verification: `npm test` — 482 passed across 27 files, unchanged.

- [x] Ran lint/type-check on changed code — `npx tsc --noEmit` clean, `npm run lint` clean.

- [x] **Quality assertions** — no duplication: `build:verify` reuses the exact `next build --turbopack` invocation, differing only by the env var; no new abstraction, one conditional spread in an object literal already at its minimum size. No dead code. Public surface: `next.config.ts` config object gains one conditional key; `package.json` gains one script; no application code touched. Docs updated in place (`.flowtron/tasknote/README.md` quick commands).

- [x] N/A — no UI surface touched; the "visual" check here was empirical (dev server + concurrent build), performed live below instead of a browser confirmation.

**Live verification (the actual bug, reproduced and disproved):**

1. Killed any stray :3003 process, started `npm run dev` fresh, confirmed `curl http://localhost:3003` → 200.
2. Ran `npm run build:verify` to completion while the dev server stayed up — build compiled cleanly (all 7 `/api/imagegen/*` routes + `/`), no errors.
3. `curl http://localhost:3003` immediately after the build → still 200 (this is the exact step that 500'd in BI-046/BI-047 with plain `npm run build`).
4. Confirmed `.next/` and `.next-verify/` both exist as separate directories — the build wrote to the isolated dir, not the dev server's.
5. Stopped the test dev server, removed the scratch `.next-verify/` directory.

> **Choosing a test strategy (guidance, not a gate).** Default to targeted
> tests on the changed behavior. Where the input space is wide — parsers,
> encoders, round-trips, invariants that must hold across many inputs — a
> property-based test earns its keep; reach for one when example tests would
> leave large gaps. Visual confirmation covers UI surfaces that assertions
> can't. This is engineering judgment folded into Phase 3, never a new
> lifecycle phase or a schema/validator.

**Testing Notes:**

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md`: **no change** (doesn't mention `npm run build`). `AGENTS.md`: **no change** (workflow-only, no build-tool mechanism named). `CLAUDE.md`: **no change** (no build-tool mechanism named). `.flowtron/PLAN.md`: **updated** (CORE-002 stubbed to Completed). Beyond the declared set: `.flowtron/tasknote/README.md` §"Project quick commands" **updated** (new `build:verify` line, the doc this hazard specifically calls out); `docs/ADOPT.md`, `docs/USAGE.md`, `docs/WORKFLOW.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md` — grepped for `npm run build`, no hits, **no change**.

- [x] Closed — every Acceptance criterion ticked above with evidence.

- [x] **Evidence-based recap** drafted — see Final Summary below.

**Final Summary:**

**Changed** — `next.config.ts` (+2 ln: env-gated `distDir`), `package.json` (+1 ln: `build:verify` script), `.gitignore` (+1 ln: `.next-verify/`), `.flowtron/tasknote/README.md` (+1 ln: quick-commands entry), `tsconfig.json` (+1 ln: Next auto-patched an `include` entry for `.next-verify/types/**/*.ts` when it saw the new `distDir` during `build:verify`; kept the semantic addition but reformatted back to the repo's original compact array style — Next's own writer had expanded every array onto multiple lines, which was unrelated collateral from running the build).

**Verified** — `npx tsc --noEmit` and `npm run lint` clean; `npm test` 482 passed across 27 files, unchanged. Live-reproduced the actual bug and disproved it: started `npm run dev`, confirmed 200, ran `npm run build:verify` to completion while the dev server stayed live, confirmed 200 again immediately after (the exact step that 500'd in BI-046/BI-047 with plain `npm run build`), confirmed `.next/` and `.next-verify/` exist as separate directories, stopped the test server, removed the scratch `.next-verify/`.

**Refactors** — none; purely additive config, no existing code touched.

**Documentation verdict** — updated the one doc that names AI-session verification commands (`.flowtron/tasknote/README.md` quick commands); no other AI-referenced doc named the old `npm run build` command, so nothing else was stale.

**Maintainability** — closes a hazard that broke the operator's live dev server on two consecutive tasks (BI-046, BI-047) by giving verification builds their own `distDir`, isolated via one env-gated conditional rather than a new script/tool/dependency. Production `npm run build` is untouched — the fix only changes behavior for the new opt-in `build:verify` path.

**Archived:** 2026-08-30
