# blastimage — CLAUDE.md

## Project

Local Next.js application for coordinated AI image generation workflows. Users define prompt tasks, attach reference photos, generate batches with Grok Imagine, review and iterate, then export approved images with a JSON provenance manifest. Two mutually exclusive generation modes: **Adopter mode** (BI-EPIC-024) — generation runs in a Grok Build terminal session via `/blast-generate` and `/blast-iterate`; the frontend is viewer/selector only — see `docs/REVIEW-LOOP.md`. **In-app mode** — blastimage runs directly inside a Grok Build session with the provider bridge wired, so generation happens in-browser — see `docs/GROK-AGENT.md`.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **State:** localStorage only (frontend-only; no accounts, no cloud project). The old optional Supabase hosted mode was removed in BI-028; keep `lib/persistence.ts` as the async seam for a future server-backed Neon + Cloudflare R2 adapter, but do not add browser-exposed database/storage credentials.
- **Target API:** Grok Imagine via an agent-installed provider bridge (`globalThis.__grokImagineProvider`); see `docs/GROK-AGENT.md`. Adopter submodule installs use the terminal review loop instead (`docs/REVIEW-LOOP.md`, `docs/ADOPT.md` §5.1).
- **Dev port:** `next dev -p 3003`
- **Testing:** vitest + happy-dom; `npm test`. Tests live beside their source as `{lib,components}/**/*.test.{ts,tsx}` — component tests were unrunnable-by-config until TEST-001.2 widened the glob. `globals: true` is off, so import test functions explicitly and wire `afterEach(cleanup)` by hand. Prefer real seams and `vi.stubGlobal` over module mocks; `vi.mock` is reserved for components with no injection point (see `components/Workspace.test.tsx`).

## Workflow

Active tasks live in `.flowtron/PLAN.md`. Task lifecycle is governed by flowtron (`/ft-task`).
