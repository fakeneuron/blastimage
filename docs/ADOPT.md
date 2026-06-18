# blastimage — Submodule Adoption Guide

This guide walks through adding blastimage as a git submodule so you can generate coordinated AI images for a project's website assets. Once set up, [`docs/WORKFLOW.md`](WORKFLOW.md) is the directed operating loop for actually producing a set of images.

## Prerequisites

- Git
- Node.js ≥ 18 (Next.js 15 requirement)
- npm
- **For real image generation:** a Grok Build session with a SuperGrok subscription — see [`docs/GROK-AGENT.md`](GROK-AGENT.md)
- **blastimage must be pushed to GitHub first.** If the remote repository is empty, `git submodule add` will fail with "fatal: unable to checkout submodule". Confirm at least one push has been made to `origin/main` before proceeding.

## 1. Add the submodule

From your project root:

```bash
git submodule add --name _project/blastimage \
  https://github.com/fakeneuron/blastimage.git \
  blastimage
```

This clones blastimage into `blastimage/` and adds an entry to `.gitmodules`:

```ini
[submodule "_project/blastimage"]
    path = blastimage
    url = https://github.com/fakeneuron/blastimage.git
```

Commit the two new files the command stages (`.gitmodules` + `blastimage`):

```bash
git add .gitmodules blastimage
git commit -m "chore: add blastimage submodule"
```

## 2. Initial setup after cloning

When a fresh clone of the parent project needs blastimage:

```bash
git submodule update --init blastimage
```

## 3. Install dependencies

blastimage manages its own `node_modules` — it doesn't share with the parent project:

```bash
cd blastimage
npm install
```

## 4. Run the dev server

```bash
npm run dev   # → http://localhost:3003
```

blastimage is entirely frontend — no backend, no accounts. All session state persists in the browser's `localStorage`.

Port **3003** is dedicated; it doesn't conflict with common project ports (Next.js 3000–3002, Astro 4321).

## 5. Wire up Grok Imagine

For real image generation inside a Grok Build session, follow [`docs/GROK-AGENT.md`](GROK-AGENT.md). The integration contract: install a provider function on `globalThis.__grokImagineProvider` before the user triggers generation. All other app logic (review, iterate, export) is already wired and requires no changes.

### 5.1 Terminal generation skills (review loop)

When generation runs in a **Grok Build terminal session** and blastimage is only
the viewer/selector (see [`docs/REVIEW-LOOP.md`](REVIEW-LOOP.md)), install the
bundled terminal skills from the submodule into your **host repo**:

```bash
# From the host project root (sibling to blastimage/)
mkdir -p .grok/skills
ln -sf ../blastimage/.grok/skills/blast-generate .grok/skills/blast-generate
ln -sf ../blastimage/.grok/skills/blast-iterate .grok/skills/blast-iterate
```

Copy instead of symlink if your tooling does not follow symlinks. Skills appear
in the slash menu within a few seconds.

| Skill | Purpose |
|---|---|
| `/blast-generate` | Read `imagegen/tasks.json` + `refs/`, run `image_gen`/`image_edit`, write `rounds/r<N>/` + `batch.json`. Includes round-0 ref bootstrap when `refs/` is empty. |
| `/blast-iterate` | Read `rounds/r<N>/selection.json`, generate the next round from keeper + edited prompt. |

**Operating loop:** `/blast-generate` → blastimage review (🔗 Link imagegen, ↻ Load
round) → iterate selections write `selection.json` → `/blast-iterate` → repeat.
Pure planning helpers live in `blastimage/lib/terminalRound.ts`.

## 6. Stage prompt tasks from the parent project

Instead of creating tasks and pasting prompts one at a time, stage a batch from
a task-import JSON file and load it via the sidebar's **⇪ Import** button. The
sidebar's **🛠 Build** action composes this file in-app — upload your
`prompts/*.txt` files or paste prompts, edit the names, and download
`tasks.json` — so you don't need to hand-roll a script. The contract:

```json
{
  "version": 1,
  "tasks": [
    { "name": "pressure-injuries — hero", "basePrompt": "Flat-vector body map showing…" },
    { "name": "pressure-relief — hero", "basePrompt": "Technique illustration of…" }
  ]
}
```

- `version` must be `1`.
- Each task needs a non-empty `name`; `basePrompt` must be a string (an empty
  prompt is allowed but the task won't be eligible for ⚡ Generate All until it
  gets a prompt or a reference).
- Import **appends** to the current session — create or switch sessions first
  if you want a clean slate. Reference photos are attached in-app afterwards.

Where this file (and everything around it) should live in your repo: see §7.

## 7. Structure your repo for blastimage

blastimage keeps all working state in browser `localStorage` — your repo is the
durable home for prompt sources, the import file, reference images, and the
approved output. The canonical layout is a single `imagegen/` directory at the
parent project root:

```
imagegen/
├─ tasks.json          ← ⇪ Import file (the §6 contract)
├─ prompts/
│  └─ <task-name>.txt  ← prompt source, one file per task
├─ refs/
│  └─ <slug>.<ext>     ← 1:1 reference per task (terminal skills + in-app upload)
├─ rounds/
│  └─ r<N>/
│     ├─ batch.json    ← written by /blast-generate or /blast-iterate
│     ├─ selection.json← written by blastimage after review
│     └─ <slug>-NNN.<ext>
└─ approved/
   ├─ manifest.json    ← export provenance manifest
   ├─ review.html      ← self-contained house-style review sheet
   └─ *.png            ← exported approved images
```

This layout is a **convention, not a requirement** — blastimage never reads the
parent repo. But treat it as canonical: agents and future tooling will look for
these exact paths, so deviating costs more than it saves.

**`tasks.json`** — the import file from §6. Compose it in-app with **🛠 Build**
(or by hand) and load it via **⇪ Import**. Task names double as filename slugs on
downloaded images, so keep them short and filesystem-friendly (e.g.
`pressure-relief — hero`).

**`prompts/<task-name>.txt`** — one prompt per file, filename matching the task
name. This is the editable source of truth; `tasks.json` is the generated (or
hand-assembled) artifact. Prompt-writing craft lives in
[`docs/USAGE.md`](USAGE.md).

**`refs/`** — reference images staged for upload through the in-app Reference
Library. Keep each under the **2 MB upload cap** and use descriptive kebab-case
names (`brand-palette-forest-gold.png`, not `IMG_4291.jpg`) — names surface in
the UI and in the export manifest. Sizing and framing guidance:
[`docs/USAGE.md`](USAGE.md).

**`approved/`** — the landing spot for gallery output. Three Gallery export
actions feed it:

- **Folder** — writes every approved image plus `manifest.json` (full
  provenance: final prompts, prompt history, ratings, and the references used per
  image) into a directory you pick, in one step. Point it straight at
  `imagegen/approved/`. On browsers without folder access it falls back to
  downloading each file individually (then move them here).
- **JSON** — downloads the provenance manifest on its own.
- **Sheet** — downloads `review.html`, a self-contained house-style review sheet
  (embedded thumbnails + prompt, rating, and provenance per image). Commit it
  alongside the manifest so the consistency decision travels with the assets.

From `approved/`, copy or process images into your project's real asset
pipeline (`public/`, `src/assets/`, …) as a separate, project-owned step. The
full directed sequence — stage, import, generate, review, iterate, export,
land, review — is [`docs/WORKFLOW.md`](WORKFLOW.md).

## 8. Keep up to date

To pull the latest blastimage into the parent project:

```bash
git submodule update --remote blastimage
git add blastimage
git commit -m "chore: bump blastimage to latest"
```

## Notes

- **Isolation.** blastimage's `node_modules`, dev server, and `localStorage` data are fully isolated from the parent project. Running `npm install` inside `blastimage/` will not affect the parent's dependencies.
- **Detached HEAD.** After `git submodule add` or `update --init`, the submodule is checked out at a pinned commit (detached HEAD). This is intentional — the parent tracks a specific blastimage version. Run `git checkout main` inside `blastimage/` to work on the latest branch.
- **Clearing state.** All blastimage sessions and generated images live in browser `localStorage` at the `localhost:3003` origin. Clearing browser storage for that origin resets all blastimage data.

## Troubleshooting

**`git submodule add` fails on a second attempt after a previous failure**

If a prior `git submodule add` attempt was aborted (e.g. because the remote was empty), git leaves stale state in two places:

1. `.git/modules/_project/blastimage/` — a partial git directory
2. `blastimage/` — an empty directory with a dangling `.git` gitlink file

Clean both before retrying:

```bash
rm -rf .git/modules/_project/blastimage
rm -rf blastimage
git submodule add --name _project/blastimage \
  https://github.com/fakeneuron/blastimage.git \
  blastimage
```
