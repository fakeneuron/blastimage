---
name: audit
description: blastimage (Next.js 16 / TypeScript) audit — thin overlay over flowtron's bundled `ft-audit` (runs its passes by reference, applies the project deltas below). Forked from flowtron's audit-overlay template; see `docs/MIGRATION.md` §1.2.1.
flaitron-reconciled: v5.33.0
flaitron-tracks: ft-audit
---

# audit — thin overlay over `ft-audit`

> **Overlay skill.** This file does NOT restate the audit procedure. It points
> at flowtron's bundled scaffold and supplies only what diverges for this
> project. First action on every run: read the referenced scaffold below and
> run **its** procedure, finding format, closing sections, and hard rules —
> substituting the `## Deltas` values for the scaffold's `<placeholder>` slots.

**Referenced scaffold (read first, always):**
`.flaitron/core/claude/skills/ft-audit/SKILL.md`

**Pass files:** the scaffold loads its per-domain pass definitions from a
`passes/<domain>.md` sibling. This overlay has no `passes/` directory of its
own — resolve those reads **relative to the referenced scaffold's directory**,
i.e. `.flaitron/core/claude/skills/ft-audit/passes/<domain>.md`.

_(The adopter path is the read-only submodule — the audit scaffold is
forked-not-symlinked, so this submodule path is the stable, clone-independent
reference.)_

## Domains

All eight. Only `general` has project deltas filled so far; other domains fall back to their own pass-file slots.

Domain tokens are `general` (default) · `backend` · `frontend` · `security` ·
`performance` · `docs` · `structure` · `context`. Invoked as `/audit <domain> [scope]`; a bare
invocation resolves to `general`.

## Deltas

These fill the bundled scaffold's §0-forker-checklist surface. Every fillable
slot lives in the pass files — the §"Scope & rubric hints" / §"The 5 passes" /
§"Severity guide" / §"Specialist additions" placeholders resolve to the values
here; everything else (the dispatcher's §1 resolution steps, pass order, capped
findings, finding format, closing sections, write-to-PLAN step, hard rules) is
inherited verbatim.

Where a value differs per domain, key it by domain (`backend: …`); an unkeyed
value applies to every domain this overlay covers.

- **Scope glob** (default-`all` target): general: `{app,components,lib,e2e}/**/*.{ts,tsx}` (repo layout; `.flaitron/`, `node_modules/`, `.next*/` excluded)
- **Rubric files** (audit-against contracts): `CLAUDE.md`, `AGENTS.md`, `README.md`, `VISION.md`, `docs/REVIEW-LOOP.md`, `docs/GROK-AGENT.md`, `docs/ADOPT.md`, `docs/WORKFLOW.md`, `docs/USAGE.md`
- **Verification gates** (run before passes): `npm run typecheck` · `npm run lint` · `npm test` (`.github/workflows/ci.yml` steps at lines 48 / 51 / 54)
- **Sacred invariants → Critical** (severity guide): an imagegen route reaching a path outside the linked root · browser-exposed DB/storage credentials · a dev/start/e2e server binding off loopback · a project's `selection.json`/`approved/` writes aimed at a different project's root (BI-047) · an e2e run dirtying the committed `test-fixtures/imagegen/` (confirmed by operator 2026-09-25)
- **Per-pass examples** (concrete stack anti-patterns to add under each pass): `<operator to fill — not derivable from repo metadata>`
- **Extra hard rules** (appended project-specific rules): `<operator to fill, or "—" if none>`

