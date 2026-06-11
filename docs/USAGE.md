# blastimage — Usage Guide

Practical guidance for writing effective prompts and preparing reference images. This guide covers the craft layer that README.md's 6-step workflow overview leaves implicit.

---

## Prompt writing

### Base prompt structure

A strong base prompt answers three questions: **what** to show, **where or how** it's shown, and **what style or mood** it should carry.

```
<subject or scene>, <context or setting>, <visual style or mood>
```

Examples:

- `A glass of cold brew coffee on a marble countertop, morning light, editorial food photography, soft shadows`
- `A woman working at a laptop in a bright home office, natural window light, warm tones, slightly candid`
- `Abstract background with flowing curved lines, midnight blue and gold, premium brand feel, minimal`

**Tips:**

- Be specific about the **end use** — mention "hero image", "product thumbnail", "icon", or "background" to steer composition and headroom.
- Describe **what should be absent** if needed: `no text`, `no people`, `clean background`.
- Include **color guidance** when brand consistency matters: `forest green and cream color palette`.
- Avoid vague amplifiers (`very beautiful`, `amazing`) — concrete descriptors (`high contrast`, `shallow depth of field`, `matte finish`) travel better through the model.

### Iteration prompts

Iteration starts from a single keeper image as the primary reference. The goal is refinement, not a restart.

**What works well:**

- State what to **preserve**: `same composition and lighting, warmer tones`
- Describe what to **change specifically**: `replace the background with a plain white wall`, `add soft bokeh to the background`
- Reference the style you want to move toward: `more editorial, less commercial`
- Keep iteration prompts shorter than base prompts — the reference image carries most of the visual context; the prompt steers what changes.

**Avoid:**

- Wholesale rewrites that fight the reference image — the visual seed dominates; big prompt pivots work better as a new task with a fresh base prompt.
- Leaving the prompt identical across iterations — if the last round was close, small targeted tweaks produce better convergence than running the same prompt again.

**Using the feedback notes field:**

The feedback notes on a kept image travel with it into the next iteration. Use them to record what specifically worked — `great color grading, composition too centered` — so the refined prompt can build on the notes.

---

## Reference image preparation

Reference images provide visual context (style, color palette, composition, subject) to ground generation. Up to **3 active refs** per task influence each batch.

### Resolution and file size

- **Target 800–1200 px on the long edge.** Enough detail for style and composition guidance; larger files don't add meaningful signal.
- **Hard cap: 2 MB per image** (enforced at upload). Smartphone photos often run 4–10 MB — resize before uploading. Most image editors or the macOS Preview `File → Export` at 70–80% JPEG quality will produce a file well under 2 MB at adequate resolution.
- **What gets stored:** every reference image is stored as a base64 data URL in `localStorage` (roughly 1.33× the raw file size). A 500 KB JPEG occupies ~665 KB of storage quota. The more references you load, the less budget remains for accumulated generated images.

### localStorage budget

blastimage stores everything in the browser's `localStorage`:

| What | Soft limit |
|---|---|
| Generated images (advisory warning) | 4 MB accumulated data URLs |
| Browser localStorage hard limit | ~5 MB total |

To stay under the limit: keep individual reference images small (ideally under 500 KB after resizing), discard unwanted generated images to reclaim quota, and export approved images before accumulating many iterations.

### Subject framing

- **Close-crop over wide scene** for style references: a tightly framed shot of a fabric texture, a color palette swatch, or a focal-point object reads more precisely than a room scene with many competing elements.
- **One subject per reference** where possible — multiple subjects in one reference dilute the guidance.
- **Mood boards:** a single image that captures the overall tone (lighting, color grading, atmosphere) can be more effective than several product shots.

### Naming

Reference image names appear in the UI and in the export manifest's `references` array. Descriptive names make the manifest self-documenting and the session easier to navigate:

| Instead of | Use |
|---|---|
| `IMG_4291.jpg` | `hero-mood-cinematic.jpg` |
| `Screen Shot 2026-06-01.png` | `brand-palette-forest-gold.png` |
| `photo.jpeg` | `model-hands-warm-light.jpeg` |

### Choosing which refs to activate

Active refs for a task should be **task-specific**: activate only the images that are directly relevant to the current task's subject or style. Having three unrelated refs active often produces incoherent results. Swap refs between tasks via the per-task active selection rather than loading everything to a single global selection.
