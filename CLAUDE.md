# blastimage — CLAUDE.md

## Project

Local Next.js application for coordinated AI image generation workflows. Users define prompt tasks, attach reference photos, generate batches with Grok Imagine, review and iterate, then export approved images with a JSON provenance manifest. **Adopter mode** (BI-EPIC-024): generation runs in a Grok Build terminal session via `/blast-generate` and `/blast-iterate`; the frontend is viewer/selector only — see `docs/REVIEW-LOOP.md`.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **State:** localStorage only (frontend-only; no accounts, no cloud project). The old optional Supabase hosted mode was removed in BI-028; keep `lib/persistence.ts` as the async seam for a future server-backed Neon + Cloudflare R2 adapter, but do not add browser-exposed database/storage credentials.
- **Target API:** Grok Imagine via an agent-installed provider bridge (`globalThis.__grokImagineProvider`); see `docs/GROK-AGENT.md`. Adopter submodule installs use the terminal review loop instead (`docs/REVIEW-LOOP.md`, `docs/ADOPT.md` §5.1).
- **Dev port:** `next dev -p 3003`

## Workflow

Active tasks live in `.flowtron/PLAN.md`. Task lifecycle is governed by flowtron (`/ft-task`).
