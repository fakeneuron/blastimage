# blastimage — Grok Build Integration Guide

This document tells a Grok Build agent everything it needs to wire up the real
Grok Imagine API. The seam in `lib/generate.ts` is already in place: `generateBatch`
delegates to an agent-installed provider (`globalThis.__grokImagineProvider`).
**You only need to install that provider** — the interface and the caller in
`lib/useWorkspace.ts` are done (see §The provider bridge).

---

## App context

blastimage is a local **Next.js 15** (App Router, TypeScript) app for coordinating
AI image generation workflows. It runs entirely in the browser — no backend, no
server, no API proxy. All state is persisted to **localStorage**.

**User flow:**

1. User creates a *Session* (one website project) and adds named *PromptTasks*.
2. Each task has an editable base prompt and can pin up to 3 reference photos from
   a global *RefImage* library.
3. User triggers generation → a batch of candidate images appears.
4. User reviews each candidate: **discard**, **keep** (seeds the next iteration),
   or **approve** (auto-filed into the gallery and export manifest).
5. Keepers can seed the next round with a refined prompt and/or a promoted primary
   reference image.
6. Approved images export together with a JSON provenance manifest.

**Key types (`lib/types.ts`):**

| Type | Shape summary |
|---|---|
| `Session` | `{ tasks: PromptTask[]; refLibrary: RefImage[]; … }` |
| `PromptTask` | `{ basePrompt: string; activeRefImageIds: ID[]; iterations: Iteration[]; … }` |
| `Iteration` | `{ prompt: string; refImageIds: ID[]; primaryRefImageId: ID \| null; images: GeneratedImage[]; … }` |
| `GeneratedImage` | `{ url: string; prompt: string; status: GenerationStatus; decision: ReviewDecision; … }` |
| `RefImage` | `{ id: ID; name: string; dataUrl: string; mimeType: string; … }` — `dataUrl` is a base64 data URL |
| `BatchSize` | `3 \| 4 \| 5` |

---

## Auth and execution context

The app is designed to run inside **Grok Build** with a **SuperGrok subscription**.
Grok Imagine is available as a built-in — no separate API key is needed. The
generation call runs client-side inside the Grok Build sandbox.

---

## The seam: `lib/generate.ts`

`generateBatch` no longer contains the mock — it delegates to an agent-installed
provider and throws a clear error if none is present (see §The provider bridge).
The mock era returned themed [picsum.photos](https://picsum.photos) URLs with a
simulated delay; the contract below is unchanged from then, so everything
downstream (the React hook, the review grid, the iteration loop, the gallery, the
export) stays wired and works unchanged. **Preserve this contract:**

### Interface contract — what you MUST preserve

```typescript
// lib/generate.ts  ← the contract; your provider satisfies it

import type { BatchSize } from './types';

/** A request to generate one batch of candidates. */
export interface GenerationRequest {
  /** The driving prompt; may be empty string when generating from a reference alone. */
  prompt: string;
  /** Number of candidates the caller expects back: 3, 4, or 5. */
  batchSize: BatchSize;
  /**
   * Reference image data for visual guidance — base64 `data:` URLs (or whatever
   * bytes the imagine backend consumes). The caller resolves these from the
   * session before calling — see §References below.
   */
  referenceImages?: string[];
}

/** One produced candidate. The caller assembles these into GeneratedImage records. */
export interface GeneratedCandidate {
  /** A URL (remote or data URL) the browser can render with <img src>. */
  url: string;
  /** Carry the request prompt through unchanged — used for provenance. */
  prompt: string;
}

/**
 * ★ Already implemented: delegates to globalThis.__grokImagineProvider.
 *
 * Must return a Promise that resolves to exactly `batchSize` candidates.
 * Throws if no provider is installed; the installed provider throws (or
 * rejects) on error — the caller catches and surfaces a non-fatal
 * "Generation failed" message to the user.
 */
export async function generateBatch(req: GenerationRequest): Promise<GeneratedCandidate[]> {
  // delegates to your installed provider — see §The provider bridge
}
```

**Hard constraints — do not change:**

- Module path stays `lib/generate.ts`
- Function name stays `generateBatch`
- Return type stays `Promise<GeneratedCandidate[]>`
- Each candidate must carry `{ url: string; prompt: string }`
- `prompt` and `batchSize` fields on `GenerationRequest` stay as-is

---

### The only caller

```typescript
// lib/useWorkspace.ts  (inside generate(); the call site is ~line 239)

const candidates = await generateBatch({
  prompt,                       // trimmed string; may be empty if refs are present
  batchSize: DEFAULT_BATCH_SIZE, // = 4
  referenceImages,              // string[] of base64 data URLs (already resolved)
});
const images = candidates.map((c) => newGeneratedImage(c.url, c.prompt));
```

`newGeneratedImage` is a pure factory in `lib/workspace.ts` — you don't touch it.

---

## References: how `referenceImages` is resolved

The mock once used `referenceSeeds?: string[]` (opaque ID strings). That is gone:
`GenerationRequest` now carries **`referenceImages?: string[]`** — actual base64
`data:` URLs the imagine backend can consume. The caller already resolves IDs to
data URLs before calling `generateBatch`, so the provider receives ready-to-use
bytes. This is what `lib/useWorkspace.ts` does inside `generate()` (~line 232):

```typescript
// Resolve reference IDs → base64 data URLs. Covers both library RefImages
// (active refs + library primaries) and previous GeneratedImages (when a kept
// image seeds the next round as the primary reference).
const refDataById = new Map(session.refLibrary.map((r) => [r.id, r.dataUrl]));
const allGeneratedById = new Map(
  session.tasks.flatMap((t) =>
    t.iterations.flatMap((it) => it.images.map((img) => [img.id, img.url])),
  ),
);
const resolveRefData = (id) => refDataById.get(id) || allGeneratedById.get(id);

const referenceImages = [
  ...(primaryRefImageId ? [primaryRefImageId] : []),
  ...task.activeRefImageIds,
]
  .map(resolveRefData)
  .filter((d): d is string => Boolean(d));

const candidates = await generateBatch({
  prompt,
  batchSize: DEFAULT_BATCH_SIZE,
  referenceImages,
});
```

`RefImage.dataUrl` is always a base64 data URL of the form `data:<mimeType>;base64,…`.
A previous `GeneratedImage.url` may be a `data:` URL or a remote URL, depending on
what the provider returned. Because resolution already happens caller-side, **you
do not touch `lib/useWorkspace.ts`** — you only supply a provider (next section).

**What the app guarantees:**

- References are always **optional** — the caller guards: if `!prompt && !hasRef` it
  returns before calling `generateBatch`. You will never receive an empty-everything call.
- `batchSize` is always `3`, `4`, or `5` — never outside this range.
- `prompt` is always `.trim()`'d before the call.
- The function is `await`'d inside a `try/catch`. Throw on any error; the UI
  handles it gracefully with a non-fatal toast and never leaves a half-written
  iteration in state.

---

## The provider bridge: `globalThis.__grokImagineProvider`

`generateBatch` delegates to a provider you install on `globalThis`. This is the
one thing you supply. `lib/generate.ts` declares:

```typescript
type GrokImagineProvider = (req: GenerationRequest) => Promise<GeneratedCandidate[]>;

declare global {
  var __grokImagineProvider: GrokImagineProvider | undefined;
}
```

At runtime `generateBatch` reads `globalThis.__grokImagineProvider`. If present, it
calls it, asserts the result length equals `req.batchSize`, and carries `prompt`
through for provenance. If absent, it throws — so a pure-client run with no bridge
fails loudly rather than silently mocking. Your job: build a function matching
`GrokImagineProvider` and assign it before the user triggers generation:

```typescript
globalThis.__grokImagineProvider = async (req) => {
  // call Grok Imagine req.batchSize times (or once for N), passing req.prompt
  // and req.referenceImages; return exactly req.batchSize { url, prompt } items.
};
```

### FS path → data URL

Grok Imagine's `image_gen` typically writes results to the **filesystem** and hands
back paths. The app persists everything to localStorage and renders with `<img src>`,
so a bare file path is useless to it — convert each result to a self-contained
`data:` URL inside the provider before returning:

```typescript
import { readFile } from 'node:fs/promises';

async function toDataUrl(path: string, mimeType = 'image/png'): Promise<string> {
  const bytes = await readFile(path);
  return `data:${mimeType};base64,${bytes.toString('base64')}`;
}
```

The provider returns these `data:` URLs as `candidate.url`. They then flow through
`newGeneratedImage` unchanged, persist in localStorage exactly like uploaded refs,
and survive reload — no remote fetch, no broken links.

---

## Checklist for the Grok Build agent

- [ ] Build a provider matching `GrokImagineProvider` and assign it to `globalThis.__grokImagineProvider`
- [ ] Return exactly `batchSize` `{ url, prompt }` candidates
- [x] ~~Rename `referenceSeeds` → `referenceImages` and update the caller in `lib/useWorkspace.ts` to resolve IDs to data URLs~~ — done in BI-013; the interface and caller already carry data URLs
- [ ] Convert `image_gen` filesystem results to `data:` URLs in the provider (see §FS path → data URL)
- [ ] Throw (don't swallow) on API errors — `generateBatch` already throws when no provider is installed
- [ ] Verify `npx tsc --noEmit` passes (TypeScript strict mode is on)
- [ ] Run `npm run lint` to confirm no new ESLint violations
