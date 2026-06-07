# blastimage

Local Next.js app for coordinated AI image generation workflows. Define prompt tasks, attach reference photos, generate batches, review and iterate, then export approved images with a full provenance manifest.

## Install & Run

```bash
npm install
npm run dev   # http://localhost:3003
```

## Workflow

1. **Create a project** — a default session opens on first launch; rename it or create a new one from the sidebar.
2. **Add tasks** — each task has a base prompt and an optional reference photo selection (up to 3 active at once from the session library).
3. **Generate** — click **Generate** to produce a batch of candidate images. Currently uses mock picsum images; the Grok Imagine integration path is documented in `.flowtron/tasknote/archive/bi/BI-011.md`.
4. **Review** — keep, discard, or approve each image. Add star ratings and feedback notes. Toggle **Use as reference** to seed the keeper into the next round.
5. **Iterate** — click **Iterate →** on a kept image to open the refine modal, edit the prompt, and generate a new round seeded by that image as the primary reference.
6. **Export** — approved images collect in the Gallery panel. **Export JSON** downloads a provenance manifest with the full prompt history and reference metadata for every approved image.

Sessions persist in `localStorage` — no backend required.

## Docs

- [`CLAUDE.md`](CLAUDE.md) — coding standards and AI workflow
- [`.flowtron/PLAN.md`](.flowtron/PLAN.md) — task plan and status
