# blastimage — Adopter Workflow

The directed operating loop for producing a coordinated set of website images
with blastimage, end to end. This is the **playbook**: the order you actually
work in and the in-app affordance to reach for at each stage.

It complements the other docs rather than repeating them:

- [`README.md`](../README.md) — the 6-step feature overview (quick scan).
- [`docs/USAGE.md`](USAGE.md) — prompt-writing and reference-image **craft**.
- [`docs/ADOPT.md`](ADOPT.md) — submodule **setup** and the `imagegen/` repo layout.
- **This doc** — the **sequence** that ties those together.

Assumes blastimage is installed and (for real generation) Grok Imagine is
wired — see [`docs/ADOPT.md`](ADOPT.md) §1–5.

---

## The loop

```
stage → import → attach refs → generate → review → iterate → export → land → review
                     ↑__________________________________________|
```

A pass through the loop turns a batch of prompts into approved, provenance-rich
images landed in your repo. The keep/iterate cycle repeats per task until each
image is right; the closing review pass checks the set holds together as a whole.

### 1. Stage prompts

Author one prompt per intended image. The repo home is
`imagegen/prompts/<task-name>.txt`, one file per task (see
[`docs/ADOPT.md`](ADOPT.md) §7). Prompt craft — structure, specificity, what to
exclude — lives in [`docs/USAGE.md`](USAGE.md#prompt-writing).

### 2. Build the import file

In the sidebar, **🛠 Build** assembles a `tasks.json` without hand-rolling a
script: upload your `prompts/*.txt` files (filename → task name, contents →
prompt) or paste prompts as blank-line-separated blocks, edit the names in the
preview, then download `tasks.json`. Save it to `imagegen/tasks.json`.

### 3. Import into a session

**⇪ Import** loads a `tasks.json` into the current session — it **appends**, so
create or switch sessions first if you want a clean slate. Each task lands with
its base prompt, ready for references and generation.

### 4. Attach references

Stage reference images in `imagegen/refs/` (kebab-case names, under the 2 MB
cap), upload them through the in-app **Reference Library**, then activate up to 3
per task. Resolution, sizing, framing, and naming guidance:
[`docs/USAGE.md`](USAGE.md#reference-image-preparation).

### 5. Generate

**Generate** fires a batch for the active task. **⚡ Generate All** fires a batch
for every eligible task at once and opens a stacked bulk-review view — the
fastest path through a multi-task set.

### 6. Review

For each candidate: **keep**, **discard**, or **approve**. Add a star rating and
feedback notes. Toggle **Use as reference** on a keeper to seed it into the next
round. Approved images auto-collect in the Gallery panel with full provenance.

### 7. Iterate

**Iterate →** on a kept image opens the refine modal seeded by that image as the
primary reference. Edit the prompt to steer what changes and generate a new
round. Iteration-prompt craft (preserve vs. change):
[`docs/USAGE.md`](USAGE.md#iteration-prompts). Loop back to step 6 until the task
has an image worth approving.

### 8. Export

From the Gallery panel, once a task (or the whole set) has approved images:

- **Folder** — writes every approved image plus `manifest.json` (full prompt
  history, ratings, references used) into a directory you pick, in one gesture.
  Point it at `imagegen/approved/`. On browsers without folder access it falls
  back to downloading each file individually.
- **JSON** — downloads the provenance manifest on its own.
- **Sheet** — downloads a self-contained `review.html` (embedded thumbnails +
  prompt, rating, and provenance per image) for the consistency pass in step 10.

### 9. Land in the repo

The export lands the manifest + images in `imagegen/approved/` (the canonical
layout: [`docs/ADOPT.md`](ADOPT.md) §7). The manifest is the durable provenance
record — commit it alongside the images so the set is reproducible. From
`approved/`, copy or process images into your project's real asset pipeline
(`public/`, `src/assets/`, …) as a separate, project-owned step.

### 10. Review the set for house style

Open the exported `review.html` and scan the approved set together: consistent
lighting, palette, framing, and tone across images destined for the same site.
`review.html` is self-contained and repo-durable — commit it next to the
manifest so the house-style decision travels with the assets.

Anything off-style? Return to that task's **Iterate** loop (step 7), regenerate,
re-approve, and re-export. The provenance manifest makes it easy to see which
prompt produced an image that needs another pass.

---

## Why the closing review matters

The export and review steps exist because skipping them is the easy mistake: a
batch gets generated and pulled image-by-image into a project, the provenance
manifest never gets written, and there's no single surface to judge whether the
set holds together. Running the full loop — **export to a folder, commit the
manifest, review the sheet** — keeps the asset set reproducible and coherent
instead of a pile of one-off downloads.
