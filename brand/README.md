# brand/

This project's public identity kit — four files with fixed names, so any
consumer can copy them without asking what they are called here.

| File | What | Minimum |
|---|---|---|
| `BRAND.md` | The blurb: `tagline` / `one_liner` / `description` front-matter + free body | Three fields filled |
| `logo.svg` | The mark, transparent ground | Legible at 32 px; no embedded raster |
| `favicon.svg` | Tab icon (optional `favicon.png` fallback, not counted) | Square; reads at 16 px |
| `promo-16x9.webp` | One hero still for cards, link previews, posts | 1600 × 900 |

`PROMPTS.md` is provenance for mined or generated assets (origin date,
optional model, per-asset source path or prompt, what not to change).
Present, **not counted** — same class as this README, never a fifth kit
file.

This kit was filled and visually confirmed in
[CORE-6](../.flaitron/tasknote/archive/core/CORE-6.md) on 2026-09-24.
Presence of the four counted files is reported (never enforced) by natabula's
`/natabula-layer-drift`. Standard (SSOT):
`~/Code/natabula/docs/DESIGN-STANDARDS.md` §"Brand kit". Tab-trio magick:
`~/Code/natabula/docs/STACK-TENDENCIES.md` §Favicons.

## Manifest and evidence

[`assets.json`](assets.json) is the optional v2 producer declaration. It is
not a fifth counted kit file. Schema v2 stores each review as an object
(`state`, `updated_on`, `evidence_paths`). Project ID
`2c478fff-f154-46f1-8efe-98c8680d3d3e` belongs to blastimage and stays fixed
across name, path and remote changes; a distinct product or fork allocates
its own UUID. Asset IDs `symbol`, `favicon` and `promo` identify the existing
files. `chamber-reference` identifies `brand/chamber-reference.jpg`, an
uncounted visual reference. It is not `promo-16x9.webp` and does not
replace that hero. Copy stays in [`BRAND.md`](BRAND.md); manifest evidence paths point
to the committed product and generation-mode docs rather than duplicate copy.
Evidence supports owner assertions, not an automatic semantic-freshness verdict.

The logo is a symbol, not a wordmark or horizontal lockup. SVG dimensions
are the 100×100 viewBox extents, not a recommended display size. The promo
is an original 1600×900 landscape composition, not a product screenshot.
It supports `card-landscape` and `promo-landscape`; `social-og` remains
missing because 16:9 is not 40:21. No optional screenshot, social asset,
separate card, crop guidance or lifecycle/release/visibility/availability/URL
claim is declared.

All three assets retain the historical `generated` origin from
[`PROMPTS.md`](PROMPTS.md): code-drawn in-session, with no image model.
The logo is original geometry. The favicon is a manual simplification of
that mark, and the promo is a new composition incorporating it; their
`source_paths` identify the committed logo reference. They are not recorded
as reproducible `derived` assets: no recipe/version/parameters are recoverable.
The promo's intermediate SVG was not retained; PROMPTS records its layout,
renderer and encoding, not a missing source file. Installed `app/` icons
are documented in PROMPTS and remain outside this brand manifest.
`chamber-reference` is `origin: generated` (Grok Imagine, 2026-10-16).
[`PROMPTS.md`](PROMPTS.md) records the prompt, the flaitron chamber still
used as the image input, and why `source_paths` names `brand/logo.svg`
even though that file was not placed in the frame. The person
confirmed these pixels on 2026-10-17. Review is `approved`.

`audience: public` records the intended public identity-kit use.
`review: approved` on `symbol`, `favicon` and `promo` records the
producer's suitability/taste review: CORE-6 documents the operator's
concept B selection and final logo, favicon, promo, tab-icon and blurb
confirmation ("go"). That history applies to the unchanged kit landed
in commit `a57d31f4a128481c4856a4dc6c62d3d772f255b1`. Those three reviews
are v2 objects dated 2026-09-24, evidenced by the CORE-6 tasknote.
`chamber-reference` stays `draft` until a person confirms its pixels.
Neither field authorizes an export. Natabula NAT-415.5 owns a later separate
approval of exact selected items and source revisions, bundle export and
consumer import/derivation receipts. CORE-011 adds producer metadata only.

Validation reads committed blobs from an exact producer revision:

```sh
bash ~/Code/natabula/scripts/validate-brand.sh . --revision <full-commit>
# Optional coverage input: --requests /path/to/requests.json
```

Contract and validator for CORE-011 were read at Natabula commit
`a78a1d9562f8aafb6c6c9a7b1c746d76f895c4cc`; see DESIGN-STANDARDS §"Brand
manifest v1" for schema, coverage and permission boundaries. This
manifest is schema v2; the validator accepts v1 and v2. Validation
does not approve, export or import anything.

## When replacing artwork (producer session)

Run this from **this repo**, attended. Do not run it from natabula HQ.
Do not run it unattended. Caobunga is not the runner.

1. **Classify.** Mine an in-repo mark; generate if there is none; no-op
   if the four counted files plus `PROMPTS.md` already exist. Leave a
   working tab trio in place even when the names are pre-standard.
2. **Never** mine `fakeneuron.com/public/projects/` (cropped, recolored,
   640×360). Never embed a raster inside `logo.svg` / `favicon.svg`.
3. **Mine.** Convert the producer original → `logo.svg` (legible at
   32 px) + `favicon.svg` (square, reads at 16 px, **filled shapes** if
   ImageMagick will cut the trio). Promo only at a real 1600 × 900.
4. **Generate.** Still → 👁️ CONFIRM → **code-drawn** SVG (paths/shapes,
   filled, no PNG inside). Converter or operator-trace are fallbacks.
   Promo stays webp or is omitted.
5. **Copy** natabula's `templates/brand/PROMPTS.md` to `brand/PROMPTS.md`
   and fill origin + per-asset `source:` or prompt. Caps on `BRAND.md`
   still apply (tagline ≤ 8 / one_liner ≤ 25 / description ≤ 80).
6. **Derive** the tab trio from `brand/favicon.svg` only if this repo
   has a frontend (STACK-TENDENCIES recipe). Skip if there is no
   frontend. natabula's dashboard `data:` favicon is not drift.
7. 👁️ CONFIRM new pixels. Commit here.
