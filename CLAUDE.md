# blastimage — CLAUDE.md

## Project

Local Next.js application for coordinated AI image generation workflows. Users define prompt tasks, attach reference photos, generate batches with Grok Imagine, review and iterate, then export approved images with a JSON provenance manifest.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript)
- **State:** localStorage (frontend-only; no accounts, no backend)
- **Target API:** Grok Imagine (mocked initially; real integration path in BI-011)
- **Dev port:** `next dev -p 3003`

## Workflow

Active tasks live in `.flowtron/PLAN.md`. Task lifecycle is governed by flowtron (`/ft-task`).
