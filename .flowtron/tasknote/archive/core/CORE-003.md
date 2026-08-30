---
title: eslint-next-verify-ignore
status: completed
tags: [lint, build-config]
created: 2026-08-30
due:
related-tasks: [CORE-002, BI-001]
touches:
  - eslint.config.mjs
---

# CORE-003 | eslint-next-verify-ignore

[← PLAN.md](../PLAN.md) · 🟢 In progress

## 🎯 Goal

Add `".next-verify/**"` to `eslint.config.mjs`'s `ignores` array so the lint gate stops traversing the isolated verification-build output CORE-002 introduced.

## ⚡ Notes

**Relevance:** Proceed — the PLAN claim is verifiable by inspection and confirmed by archive precedent; the fix is one array entry in one file.

**Best Practices Review:** N/A for structural change — this is a single additive entry to an existing `ignores` array that already holds four build-output globs (`node_modules/**`, `.next/**`, `out/**`, `build/**`) plus `next-env.d.ts` and `.flowtron/**`. No responsibilities move, no dependency direction changes, no abstraction is introduced or duplicated. The only judgment call is placement: adjacent to `.next/**`, since the two are the same artifact under two `distDir` values.

**Drift check:** PLAN.md's claim holds exactly. `eslint.config.mjs:22-30` lists `.next/**` but not `.next-verify/**`; `next.config.ts:4` sets `distDir: ".next-verify"` under `NEXT_VERIFY_BUILD`; `.gitignore:10` has `.next-verify/`; `tsconfig.json:26` includes `.next-verify/types/**/*.ts`. Three of four wired, ESLint missing — no drift, the claim is current. No SPEC contract bears on lint config.

**Archive skim:** Two load-bearing hits.
- `CORE-002.md` §"🧩 Subtasks" enumerates exactly four wiring points (`next.config.ts`, `package.json`, `.gitignore`, `.flowtron/tasknote/README.md`). `eslint.config.mjs` appears nowhere in the tasknote — the omission was an oversight, not a considered decision, so there is no prior rationale to preserve. Its Phase 3 step 5 also records that the scratch `.next-verify/` was removed after verification, which is why the directory is absent today and the gap has not yet bitten.
- `BI-001.md:76` is the governing precedent: "added `.flowtron/**` to ignores so lint doesn't reach into the read-only flowtron submodule's `viz/` source." This repo has already established empirically that ESLint flat config does **not** auto-ignore dot-directories, and that the remedy is an explicit `ignores` entry. `.next-verify` is the same situation.

**Pattern survey:** Extended the existing `ignores` array rather than introducing a second config object or an `.eslintignore` file. Placed `".next-verify/**"` immediately after `".next/**"` so the two `distDir` outputs read as a pair — matching how `.gitignore:9-10` already orders them.

**Implementation:** One entry (`".next-verify/**"`) added to `eslint.config.mjs`'s `ignores` array, beside `".next/**"`, with a three-line comment recording why each `distDir` needs its own entry.

Verified empirically rather than by inspection, and the result was **more severe than PLAN.md filed it**. PLAN.md (and the audit-repo sweep that produced it) predicted a slower lint traversing generated output. The actual behavior is a **hard gate failure**:

- Reproduced via CORE-002's own recipe — `npm run build:verify`, producing 89 generated `.js` files under `.next-verify/`.
- **Control probe** (the decisive evidence): the *same* generated file under each directory. `npx eslint .next/postcss.js` → `File ignored because of a matching ignore pattern`. `npx eslint .next-verify/postcss.js` → `1 error @typescript-eslint/no-require-imports`.
- **Real gate, before the fix:** `npm run lint` → **✖ 5040 problems (275 errors, 4765 warnings)**, mostly `@typescript-eslint/ban-ts-comment` and `no-unused-vars` in Next's generated route/type shims. ESLint exits non-zero on errors, so CI's Lint step fails.
- **After the fix:** `npm run lint` clean, exit 0, with `.next-verify/` still present; the probe now returns the identical `File ignored` message as the `.next/` control — exact parity.
- Removed the scratch `.next-verify/` and re-ran lint + typecheck clean, matching CORE-002 Phase 3 step 5.

Why it had not yet bitten: `.next-verify/` only exists between a `build:verify` and its cleanup, and CORE-002 removed its own scratch directory at the end of Phase 3. Any session that ran `build:verify` and then `lint` without cleaning up first — the natural Phase 3 order — would have hit 275 errors with no obvious cause.

`tsconfig.json`'s `.next-verify/types/**/*.ts` include is deliberate (CORE-002 added it so typecheck sees generated route types) and is left untouched — only ESLint needed the exclusion.

**Docs touched:** no change. `.flowtron/tasknote/README.md` §"Project quick commands" already points verification builds at `npm run build:verify` (written by CORE-002); nothing in README.md, AGENTS.md, CLAUDE.md, or `docs/` documents the ESLint ignore list.

## ✅ Recap

**Changed:** `eslint.config.mjs` only (+5/−1 LOC) — `".next-verify/**"` added to `ignores` beside `".next/**"`, plus a comment naming why flat config needs both.

**Verification:** lint clean (exit 0) with `.next-verify/` present — down from **275 errors / 5040 problems** before the change; control probe confirms `.next-verify/postcss.js` now returns the same `File ignored` verdict as `.next/postcss.js`. Typecheck clean, 482/482 tests pass, scratch directory removed and gates re-run clean afterward.

**Severity correction for future audit passes:** PLAN.md filed this as a hygiene/performance issue ("lint would start walking generated chunks"). It is actually a **CI-breaking gate failure** — ESLint exits non-zero on the 275 errors, so `npm run lint` and the CI Lint step fail outright for any session or runner that has a `.next-verify/` present. It stayed latent only because CORE-002's verification flow deleted its scratch directory before anyone ran lint. Worth weighting higher than "Low" if a similar config-fanout gap surfaces again.

**Refactors:** none. Single additive array entry; no responsibilities moved, no abstraction introduced. `tsconfig.json`'s `.next-verify/types/**` include is intentional (CORE-002) and deliberately left alone — the two tools want opposite things from that directory, which is itself the reason the omission was easy to make.

**Maintainability:** closes the last of CORE-002's four wiring points, and the inline comment plus BI-001's `.flowtron/**` precedent now make the "flat config does not auto-ignore dot-directories" rule discoverable at the point of use rather than only in tasknote history. A future `distDir` would need the same treatment.

**Archived:** 2026-08-30
