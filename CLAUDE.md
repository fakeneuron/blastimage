# blastimage — CLAUDE.md

## Project

Local Next.js application for coordinated AI image generation workflows. Users define prompt tasks, attach reference photos, generate batches with Grok Imagine, review and iterate, then export approved images with a JSON provenance manifest. **Adopter mode** (BI-EPIC-024): generation runs in a Grok Build terminal session via `/blast-generate` and `/blast-iterate`; the frontend is viewer/selector only — see `docs/REVIEW-LOOP.md`.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **State:** localStorage by default (frontend-only; no accounts). An optional **hosted mode** (`NEXT_PUBLIC_BLASTIMAGE_MODE=hosted`, BI-EPIC-022) swaps in a Supabase backend (auth + owner-scoped Postgres/RLS + private image storage buckets) behind the `lib/persistence.ts` adapter seam; local mode is unaffected. OAuth login (BI-022.6) and the Cloudflare Pages + Supabase deploy story (BI-022.5, see `docs/DEPLOY.md`) are in; in-browser **hosted-mode generation** stays **local-only** (BI-023 decision: the Grok Build sandbox the provider seam needs is absent in a deployed browser; the xAI public image API could fill it but requires browser-side keys or an edge proxy — both declined). Hosted mode is review/persist/import only; generate locally then import. See `docs/HOSTED-GENERATION.md`.
- **Target API:** Grok Imagine via an agent-installed provider bridge (`globalThis.__grokImagineProvider`); see `docs/GROK-AGENT.md`. Adopter submodule installs use the terminal review loop instead (`docs/REVIEW-LOOP.md`, `docs/ADOPT.md` §5.1).
- **Dev port:** `next dev -p 3003`

## Workflow

Active tasks live in `.flowtron/PLAN.md`. Task lifecycle is governed by flowtron (`/ft-task`).
