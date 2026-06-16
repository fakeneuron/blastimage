# blastimage — Hosted-Mode Generation: Findings & Decision

This document is the output of the **BI-023** spike: can Grok-Imagine image
generation work in the **deployed hosted-mode browser** (Cloudflare Pages +
Supabase), where the Grok Build sandbox the generation seam depends on does not
exist? It records the wall, the now-public xAI image API, the key-delivery
problem, the options, and the decision.

**Decision (2026-06-16): defer the hosted-generation build.** Generation stays
**local-only** (Grok Build). Hosted mode is **review / persist / import** only:
generate locally, export, and import into the hosted app for review and sharing.
The rest of this doc is the reasoning, and a sketch of the deferred path so a
future task can pick it up without re-spiking.

---

## 1. The wall

blastimage's entire generation model is the **Grok Build sandbox**:

- `lib/generate.ts` — `generateBatch()` delegates to an **agent-installed**
  provider, `globalThis.__grokImagineProvider`, and **throws** if none is
  present.
- The provider (installed by a Grok Build agent — see `docs/GROK-AGENT.md`)
  calls the built-in `image_gen` capability and reads the results off the
  **filesystem** (`node:fs`), converting them to `data:` URLs.

A deployed user browser on Cloudflare Pages has **none** of that — no agent, no
`image_gen` built-in, no filesystem. BI-013's live test already confirmed
(gap #2) that there is **no transparent client-side Grok Imagine global** in the
page; the `__grokImagineProvider` bridge is agent-orchestration-only.

Result: the deployed hosted **Generate** action throws, which the caller
(`lib/useWorkspace.ts`) catches and surfaces as a non-fatal *"Generation failed"*
toast. Hosted generation is therefore **unavailable** today — by architecture,
not by bug.

---

## 2. What changed since the deploy shipped — the xAI public image API

When BI-022.5 shipped the deploy, the read was "generation is impossible in a
deployed browser." That is now **too strong**. As of 2026 xAI exposes image
generation **publicly** through the xAI API platform (auth = an **xAI API key**):

| Surface | Model | Notes |
|---|---|---|
| `/v1/images/generations` (OpenAI-compatible) | `grok-2-image` | ~$0.07 / image, up to 10 variations per request, returns JPG URLs / data |
| **Grok Imagine API** (announced 2026-01-28) | `grok-imagine-image-quality` (the `-pro` model deprecates 2026-05-15) | batch generation, **aspect-ratio control**, and **image-to-image editing** |

The Grok Imagine API maps almost 1:1 onto blastimage's needs: `batchSize` →
batch/variations, the `3:2` hero aspect → aspect-ratio control, and
`referenceImages` (data URLs) → image-to-image editing. So a drop-in xAI-API
provider that satisfies the existing `lib/generate.ts` seam contract is genuinely
feasible.

**So the honest finding is:** hosted-browser generation is no longer
*impossible* — it is *possible but requires solving key-delivery*, which collides
with how the app is deployed.

---

## 3. The collision: where does the API key live?

The hosted deploy is a **static export** to Cloudflare Pages (`docs/DEPLOY.md`):
no server, no edge worker, no server-held secrets. Calling the xAI API needs a
key somewhere, and every option carries a cost.

### Option A — Browser-side key (BYO)

User pastes **their own** xAI API key → stored in `localStorage` → the browser
fetches `https://api.x.ai/...` directly.

- ✅ Stays serverless; each user funds their own generation.
- ❌ The key is **visible** in the browser, devtools, and network tab — a class
  of secret-handling the app has so far avoided. BI-022.1 made an
  *operator*-funded key an explicit non-goal; a *user*-supplied key is a
  different shape but was **also declined** this session (local-only stance).

### Option B — Server / edge proxy

A Cloudflare Worker or Pages Function holds the key as a **secret**; the browser
calls `/api/generate`, which calls xAI.

- ✅ The key is never exposed to the browser.
- ❌ **Adds a backend** to a deliberately-static deploy — new infra to build,
  secure (rate-limit, abuse, CORS), and **fund** (operator pays for every user's
  images). Breaks the "pure static export, no server secrets" simplicity that
  made the BI-022.5 deploy cheap and safe.

### Option C — Local-only (status quo) ✅ chosen

Generation stays in **Grok Build** (local mode). Hosted mode is
**review / persist / import** only. The **session importer (BI-022.7)** already
makes this a complete loop:

```
generate locally (Grok Build)  →  export session  →  import into hosted
                                                       (review / share / persist)
```

- ✅ No key in the browser, no new backend, no operator billing exposure.
- ✅ Matches the BI-022.1 non-goal and keeps the deploy serverless.
- ❌ Hosted users cannot generate in-place; they must round-trip through local
  mode. Acceptable given blastimage's solo / adopter usage model.

---

## 4. Decision

**Defer the hosted-generation build. Adopt Option C (local-only).**

Rationale: the only options that put generation in the deployed browser require
either exposing a key in the client (Option A — declined) or standing up and
funding a backend (Option B — breaks the static-export model and adds ongoing
cost). Neither is justified by current usage. The session importer already
delivers the practical workflow (generate locally → import to hosted), so hosted
mode loses nothing essential by staying review/persist/import-only.

No app code changes in this spike; the existing *"Generation failed"* toast in
deployed hosted mode is the documented, known limitation. (Turning it into a
friendlier *"generate locally and import"* affordance is small, optional UI work
a future task can own — it was offered and declined here.)

---

## 5. The deferred path (if the decision ever flips)

If hosted generation is later wanted, **start here, not from a new spike.** The
existing `lib/generate.ts` provider seam is the integration point — an xAI-API
provider satisfies the same `GenerationRequest` / `GeneratedCandidate` contract
(`docs/GROK-AGENT.md`), so nothing downstream changes.

Recommended shape if it's built:

1. **Pick the key-delivery model first** — Option A (BYO key) for a serverless
   build, or Option B (edge proxy) if the key must be hidden and the operator
   funds generation. This is the load-bearing decision, not the API wiring.
2. **Write an xAI Imagine provider** — install a `__grokImagineProvider`-shaped
   function (or a parallel hosted-mode provider behind the same seam) that calls
   `grok-imagine-image-quality` with `batchSize`, the `3:2` aspect, and
   `referenceImages` as image-to-image inputs; map the returned JPG URLs/data to
   `GeneratedCandidate { url, prompt }`.
3. **Gate it on hosted mode** — only wire the xAI provider when
   `isHostedMode()` is true; local mode keeps the Grok Build sandbox provider.
4. **Handle the key UI / proxy + cost** — BYO-key settings + localStorage (A), or
   a Worker/Pages Function + secret + rate-limiting (B). Account for ~$0.07/image
   billing and `localStorage` data-URL bloat (already a known pressure — BI-013
   gap #5).

Until then, this decision stands: **generation is local-only.**
