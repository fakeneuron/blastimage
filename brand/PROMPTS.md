---
origin: generated
date: 2026-09-24
model: "" # code-drawn in-session; no image model (CORE-6)
---

# Brand prompts

Provenance for this kit's assets so a later model or a redesign does not
start from a chat transcript. Present, not counted — same class as
`README.md`. Keep prompts here, never in `public/`. Standard:
`~/Code/natabula/docs/DESIGN-STANDARDS.md` §"Brand kit".

Fill **one** origin. Per asset, record either a `source:` path in this
repo plus the converter, or the prompt text plus any reference-image
notes. Omit a section when that asset is absent (promo is optional
until a real 1600 × 900 exists).

## logo.svg

- generated: this session had no image-generation tool, so the raster
  👁️ CONFIRM ran on `rsvg-convert` renders (256 / 32 / 16 px, light and
  dark ground) of three code-drawn "burst + frame" concepts: A, a frame
  with a starburst breaking out of its corner; B, a photo tile ringed by
  rays; C, fanned batch cards with a burst. The operator picked **B**,
  and the SVG was kept as drawn. Design brief used in place of a prompt:
  "A flat two-colour app icon: a solid rounded-square photo tile with a
  mountain and sun knocked out, ringed by twelve short tapered rays
  bursting outward. Violet tile, plasma-orange rays, no strokes, no
  text, no gradient, transparent ground."
- reference: the product itself. One image idea blasts out into a batch
  of candidates.
- vector pass: 100-unit box. Tile `27..73` square, corner `r=7`,
  built from cubic quarter-circles (`κ = 0.5522847498`). Mountain
  polygon `(31,69) (44,50) (52,60) (58,53) (69,69)` and sun `r=5` at
  `(60,39)` are cut out with one `fill-rule="evenodd"` path, with no
  masks and no `<image>`. There are 12 rays, filled quads from `r=34`
  (half-width 3.2) to `r=48` (half-width 6.5), with the first ray at
  −75°. Tile fill is `#7c3aed` and rays are `#ff4d00`, both from the
  fakeneuron palette. On `#0a0a0a` the original navy ink `#1f1147`
  disappeared, so it was replaced.

## favicon.svg

- generated: the same mark, simplified so it reads at 16 px. It keeps
  the same brief and colours, with a larger tile (`22..78`, `r=8`),
  mountain `(27,72) (43,48) (53,61) (60,53) (73,72)`, sun `r=6.5` at
  `(62,36)`, and **8** thicker rays from `r=37` (half-width 5.5) to
  `r=49.5` (half-width 10), with the first ray at −67.5°. The 12-ray
  logo mushes at 16 px, but this cut stays legible.
- ImageMagick tab-trio cuts need filled shapes (`fill="none"` + stroke
  rasterizes blank). Every shape here is filled.
- derived install: `app/favicon.ico` (48/32/16), `app/icon.png` (32²,
  transparent), `app/apple-icon.png` (180², opaque `#0a0a0a`), cut via
  `rsvg-convert -w 256` → the STACK-TENDENCIES §Favicons magick recipe.
  These replaced the create-next-app default `favicon.ico`, which was
  never a brand icon.

## promo-16x9.webp

- generated: code-drawn SVG rendered natively at 1600 × 900 with
  `rsvg-convert` → `magick -quality 88` webp (~43 KB). It was not
  upscaled or cropped, and was not mined from
  `fakeneuron/public/projects/`.
- design brief: it follows the fakeneuron card-banner style
  (`fakeneuron/ASSETS.md`: dark void, neon accents, procedural
  SVG → webp). That was a style reference only, and no pixels were
  reused. The layout is:
  - Ground is `#0a0a0a` with an orange→violet radial halo behind the
    mark.
  - The logo mark sits on the left at 5.2× with a Gaussian glow.
  - `blastimage` wordmark in bone-white `#f5f0e6`, Helvetica Neue Bold
    128 px.
  - The tagline sits beneath it in `#ff4d00`.
  - A `GENERATE · REVIEW · ITERATE · EXPORT` kicker in `#a78bfa`.
  - Two bands of dim violet candidate cards, top and bottom right, with
    one card outlined in orange as the "keeper".
- The text is set in a system font at render time. Re-render on a
  machine with Helvetica Neue, or accept the fallback metrics.

## What not to change

- Violet tile + orange rays. The two colours are the brand: violet is
  the image and orange is the blast. Do not swap to a single colour or
  darken the violet, because it has to read on dark tab bars.
- Filled shapes only, no strokes. Mountain and sun are knockouts
  (evenodd), not overlaid shapes.
- The favicon keeps 8 rays and the logo 12. Do not unify them: the
  count differs on purpose so each reads at its size.
