# blastimage — VISION.md

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. It lets the user define multiple prompt tasks for a project, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

It exists because one-by-one interfaces in chat tools are inefficient when a site needs a coordinated set of visuals, and because reference photos (site shots, brand elements, mood references) are frequently available but difficult to carry consistently through multiple refinement steps.

The primary user is the developer for personal website work (construction, tech SaaS, and similar projects).

## Product surface

A self-contained browser app with:

- A workspace that holds multiple prompt tasks for one website project
- A global reference photo library with per-task selection (up to three active references)
- Editable base prompt per task
- Batch generation of 3–5 candidate images via Grok Imagine
- Visual review grid supporting keep, discard, star rating, and feedback on individual images
- Iteration support: keepers plus feedback drive the next refined batch
- Approved gallery that automatically files keepers with task name and final prompt history
- One-click export of approved images plus a JSON manifest containing prompts, iterations, and references used

## Generation modes

Generation is real Grok Imagine — not mocked. Two mutually exclusive modes ship today:

| Mode | Where generation runs | Frontend role | Contract |
|---|---|---|---|
| **Adopter** | Terminal Grok Build session (`/blast-generate`, `/blast-iterate`) | Viewer / selector / prompt editor only | [`docs/REVIEW-LOOP.md`](docs/REVIEW-LOOP.md) |
| **In-app** | Inside a Grok Build session with the provider bridge wired (`globalThis.__grokImagineProvider`) | Full generate → review → iterate loop in-browser | [`docs/GROK-AGENT.md`](docs/GROK-AGENT.md) |

A plain browser tab (including a submodule adopter's default tab) has no provider bridge, so in-app Generate stays disabled. Adopter installs use the terminal loop instead — see [`docs/ADOPT.md`](docs/ADOPT.md) §5.1.

## Persistence

All state lives in the browser (`localStorage`). No accounts or cloud project are required. An optional Supabase-backed hosted mode once existed and was removed (BI-028). The async persistence seam (`lib/persistence.ts`) is reserved for a future server-backed Neon + Cloudflare R2 adapter; that backend is not shipped and is not a third generation mode.
