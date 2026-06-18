# blastimage

Local Next.js app for coordinated AI image generation workflows. Define prompt tasks, attach reference photos, generate batches, review and iterate, then export approved images with a full provenance manifest.

## Install & Run

```bash
npm install
npm run dev   # http://localhost:3003
```

## Workflow

### Adopter loop (terminal generate → frontend review)

For submodule adopters, generation runs in a **Grok Build terminal session** and
blastimage is the viewer/selector — the browser never generates. Full contract:
[`docs/REVIEW-LOOP.md`](docs/REVIEW-LOOP.md).

1. **Stage** — `imagegen/tasks.json` + optional `refs/` in the host repo (see [`docs/ADOPT.md`](docs/ADOPT.md) §7).
2. **Generate** — `/blast-generate` in a terminal session writes `imagegen/rounds/r<N>/` + `batch.json`.
3. **Link & load** — in blastimage, **🔗 Link imagegen** then **↻ Load round** to ingest the batch into the review UI.
4. **Review & iterate** — keep/approve/discard, rate, edit prompts; iterate writes `selection.json` (not in-browser generation).
5. **Next round** — `/blast-iterate` reads `selection.json` and writes the next round; repeat until satisfied.
6. **Export** — approved images land in `imagegen/approved/`; promote to your site assets.

Install terminal skills from the submodule: [`docs/ADOPT.md`](docs/ADOPT.md) §5.1.

### In-app loop (local Grok Build session)

When blastimage runs inside Grok Build with the provider bridge wired
([`docs/GROK-AGENT.md`](docs/GROK-AGENT.md)), generation stays in-browser:

1. **Create a project** — a default session opens on first launch; rename it or create a new one from the sidebar.
2. **Add tasks** — each task has a base prompt and an optional reference photo selection (up to 3 active at once from the session library). To stage many at once, **🛠 Build** composes a `tasks.json` from pasted prompts or `prompts/*.txt` files, and **⇪ Import** loads such a file into the session.
3. **Generate** — click **Generate** to produce a batch of candidate images via Grok Imagine. **⚡ Generate All** in the sidebar fires a batch for every eligible task at once and opens a stacked bulk-review view for one-pass review across tasks.
4. **Review** — keep, discard, or approve each image. Add star ratings and feedback notes. Toggle **Use as reference** to seed the keeper into the next round.
5. **Iterate** — click **Iterate →** on a kept image to open the refine modal, edit the prompt, and generate a new round seeded by that image as the primary reference.
6. **Export** — approved images collect in the Gallery panel. **Folder** writes every approved image plus a `manifest.json` provenance file (full prompt history and reference metadata) into a directory you pick, in one step — falling back to individual downloads on browsers without folder access. **JSON** downloads the provenance manifest on its own. **Sheet** downloads a self-contained `review.html` (embedded thumbnails + prompt, rating, and provenance per image) for a repo-durable house-style/consistency pass.

Sessions persist in `localStorage` — no backend required. Use **↓ Export** / **↑ Import** in the Project section to back up a whole workspace to a `.json` file and restore it (Import lands it as a fresh copy), so a project can move between browsers or devices.

## Docs

- [`docs/REVIEW-LOOP.md`](docs/REVIEW-LOOP.md) — terminal-generate / frontend-review loop (adopter SSOT)
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md) — the directed adopter operating loop, stage to landed assets
- [`docs/USAGE.md`](docs/USAGE.md) — prompt-writing conventions and reference image preparation
- [`docs/ADOPT.md`](docs/ADOPT.md) — how to add blastimage as a git submodule in another project
- [`docs/GROK-AGENT.md`](docs/GROK-AGENT.md) — Grok Build integration guide for wiring real Grok Imagine
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — hosted-mode deploy runbook (Cloudflare Pages + Supabase)
- [`docs/HOSTED-GENERATION.md`](docs/HOSTED-GENERATION.md) — why hosted-mode generation stays local-only (BI-023 spike findings + decision)
- [`CLAUDE.md`](CLAUDE.md) — coding standards and AI workflow
- [`.flowtron/PLAN.md`](.flowtron/PLAN.md) — task plan and status
