# blastimage — VISION.md

blastimage is a local Next.js application that helps create the many images needed for new or refreshed websites. It lets the user define multiple prompt tasks for a project, optionally attach reference photos, generate batches of candidate images with Grok Imagine, and work through an iterative review loop: keep the best results, discard the rest, attach targeted feedback to promising ones, and generate refined batches from the keepers until satisfied. Approved images are automatically collected with full provenance and can be exported together with a manifest.

It exists because one-by-one interfaces in chat tools are inefficient when a site needs a coordinated set of visuals, and because reference photos (site shots, brand elements, mood references) are frequently available but difficult to carry consistently through multiple refinement steps.

The primary user is the developer for personal website work (construction, tech SaaS, and similar projects). A hosted webapp variation is noted as a future opportunity.

The first usable cut is a self-contained desktop application with:

- A workspace that holds multiple prompt tasks for one website project
- A global reference photo library with per-task selection (up to three active references)
- Editable base prompt per task
- Batch generation of 3–5 images (mocked for immediate use; real Grok Imagine API integration path prepared)
- Visual review grid supporting keep, discard, star rating, and feedback on individual images
- Iteration support: keepers plus feedback drive the next refined batch
- Approved gallery that automatically files keepers with task name and final prompt history
- One-click export of approved images plus a JSON manifest containing prompts, iterations, and references used

All state lives locally in the browser with downloads for keepers. No accounts or external services are required for the first cut.