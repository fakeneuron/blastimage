# blastimage — CLAUDE.md

## Project

Local Next.js application for coordinated AI image generation workflows. Users define prompt tasks, attach reference photos, generate batches with Grok Imagine, review and iterate, then export approved images with a JSON provenance manifest.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **State:** localStorage by default (frontend-only; no accounts). An optional **hosted mode** (`NEXT_PUBLIC_BLASTIMAGE_MODE=hosted`, BI-EPIC-022) swaps in a Supabase backend (auth + owner-scoped Postgres/RLS + private image storage buckets) behind the `lib/persistence.ts` adapter seam; local mode is unaffected. OAuth login UI (BI-022.6) is in; deploy (BI-022.5) is still in progress.
- **Target API:** Grok Imagine via an agent-installed provider bridge (`globalThis.__grokImagineProvider`); see `docs/GROK-AGENT.md`
- **Dev port:** `next dev -p 3003`

## Workflow

Active tasks live in `.flowtron/PLAN.md`. Task lifecycle is governed by flowtron (`/ft-task`).
