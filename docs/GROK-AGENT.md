# blastimage — Grok Build Integration Guide

This document tells a Grok Build agent everything it needs to wire up the real
Grok Imagine API. **You only need to touch `lib/generate.ts`** (and one call-site
in `lib/useWorkspace.ts` if you change the reference-image field — see §References).

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

## The mock→real seam: `lib/generate.ts`

**This is the only file you need to change.**

The current implementation returns themed [picsum.photos](https://picsum.photos)
URLs with a simulated 600 ms delay. Replace the body of `generateBatch` with the
real Grok Imagine call. Everything downstream (the React hook, the review grid,
the iteration loop, the gallery, the export) is already wired and will work
unchanged.

### Interface contract — what you MUST preserve

```typescript
// lib/generate.ts  ← the only file you swap

import type { BatchSize } from './types';

/** A request to generate one batch of candidates. */
export interface GenerationRequest {
  /** The driving prompt; may be empty string when generating from a reference alone. */
  prompt: string;
  /** Number of candidates the caller expects back: 3, 4, or 5. */
  batchSize: BatchSize;
  /**
   * Currently carries opaque ID strings (mock only).
   * For the real API: change to actual image data — see §References below.
   */
  referenceSeeds?: string[];
}

/** One produced candidate. The caller assembles these into GeneratedImage records. */
export interface GeneratedCandidate {
  /** A URL (remote or data URL) the browser can render with <img src>. */
  url: string;
  /** Carry the request prompt through unchanged — used for provenance. */
  prompt: string;
}

/**
 * ★ THE FUNCTION YOU REPLACE.
 *
 * Must return a Promise that resolves to exactly `batchSize` candidates.
 * Throw (or reject) on error — the caller catches and surfaces a non-fatal
 * "Generation failed" message to the user.
 */
export async function generateBatch(req: GenerationRequest): Promise<GeneratedCandidate[]> {
  // … your real Grok Imagine call here …
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
// lib/useWorkspace.ts  (touch only if you change the reference field)

const candidates = await generateBatch({
  prompt,                       // trimmed string; may be empty if refs are present
  batchSize: DEFAULT_BATCH_SIZE, // = 4
  referenceSeeds,               // currently: string[] of RefImage IDs
});
const images = candidates.map((c) => newGeneratedImage(c.url, c.prompt));
```

`newGeneratedImage` is a pure factory in `lib/workspace.ts` — you don't touch it.

---

## References: adapting `referenceSeeds` for the real API

The mock used `referenceSeeds?: string[]` as opaque ID strings. The real Grok
Imagine API needs actual image bytes. Here is the recommended adaptation:

**1. Change the field on `GenerationRequest`:**

```typescript
// Before (mock)
referenceSeeds?: string[];

// After (real)
referenceImages?: string[];   // base64 data URLs, or whatever Grok Imagine expects
```

**2. Update the caller in `lib/useWorkspace.ts` (~line 219):**

```typescript
// Resolve IDs → base64 data URLs from the session's reference library
const referenceImages = [
  ...(primaryRefImageId ? [primaryRefImageId] : []),
  ...task.activeRefImageIds,
]
  .map((id) => session.refLibrary.find((r) => r.id === id)?.dataUrl)
  .filter((d): d is string => Boolean(d));

const candidates = await generateBatch({
  prompt,
  batchSize: DEFAULT_BATCH_SIZE,
  referenceImages,
});
```

`RefImage.dataUrl` is always a base64 data URL of the form `data:<mimeType>;base64,…`.

**What the app guarantees:**

- References are always **optional** — the caller guards: if `!prompt && !hasRef` it
  returns before calling `generateBatch`. You will never receive an empty-everything call.
- `batchSize` is always `3`, `4`, or `5` — never outside this range.
- `prompt` is always `.trim()`'d before the call.
- The function is `await`'d inside a `try/catch`. Throw on any error; the UI
  handles it gracefully with a non-fatal toast and never leaves a half-written
  iteration in state.

---

## Checklist for the Grok Build agent

- [ ] Replace `generateBatch` body in `lib/generate.ts` with the real Grok Imagine call
- [ ] Return exactly `batchSize` `{ url, prompt }` candidates
- [ ] If using reference images: rename `referenceSeeds` → `referenceImages` (or equivalent) and update the caller in `lib/useWorkspace.ts` (~line 219) to resolve IDs from `session.refLibrary`
- [ ] Throw (don't swallow) on API errors
- [ ] Verify `npx tsc --noEmit` passes (TypeScript strict mode is on)
- [ ] Run `npm run lint` to confirm no new ESLint violations
