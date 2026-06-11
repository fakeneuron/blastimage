# blastimage — Submodule Adoption Guide

This guide walks through adding blastimage as a git submodule so you can generate coordinated AI images for a project's website assets.

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

## 6. Keep up to date

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
