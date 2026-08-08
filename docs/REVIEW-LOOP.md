# blastimage — Terminal-Generate / Frontend-Review Loop

This is the SSOT for blastimage's **adopter generation workflow**: generation runs
in a **terminal Grok Build session** (where `image_gen` and the provider bridge
exist), and the blastimage frontend is a **viewer / selector / prompt-editor** —
never a generator. It exists because in-browser generation depends on the
Grok Build provider bridge (`lib/generate.ts` `generateBatch` needs
`globalThis.__grokImagineProvider`), which is absent in a plain browser.

Status: **shipped** (BI-EPIC-024, 2026-06-18). Both file-handoff seams (§4) are
implemented; terminal skills ship in `.grok/skills/`.

---

## 1. The loop

```
imagegen/refs/<task-slug>.<ext>        ← optional 1:1 reference per prompt
imagegen/tasks.json + prompts/*.txt    ← the prompt set (host repo owns these; BI-019/BI-020)
        │
   [skill ①  /blast-generate]  ── terminal (Grok Build) ──────────┐
        │  reads prompts (+ 1:1 ref), runs image_gen ×N per task   │
        ▼                                                          │
   imagegen/rounds/r<N>/  <slug>-NNN.<ext>  +  batch.json          │
        │                                                          │
   [blastimage frontend]  ── browser, VIEWER ONLY ──               │
        │  view batch · keep/approve/discard · rate · edit prompt  │
        ▼                                                          │
   imagegen/rounds/r<N>/selection.json                             │
        │  per task: chosen image (→ next 1:1 ref) + edited prompt │
   [skill ②  /blast-iterate]  ── terminal ────────────────────────┘
        ▼
   imagegen/rounds/r<N+1>/ …   (repeat until satisfied)
        ▼
   imagegen/approved/ + manifest.json   →   host repo promotes → public/…
```

**Round 0 (optional ref bootstrap).** If `imagegen/refs/` is empty, run `/blast-generate`
prompt-only as "round 0", pick one winner per task in the frontend, and promote each to
`imagegen/refs/<task-slug>.<ext>`. The real run then seeds 1:1 from those. (The frontend
does not generate the refs — it selects them; the terminal skill generates.)

---

## 2. Division of labour

| Actor | Does | Does **not** |
|---|---|---|
| **Host repo** | owns `imagegen/tasks.json`, `prompts/*.txt`, `refs/`; promotes finals from `imagegen/approved/` into `public/…` | generate or review |
| **`/blast-generate` (terminal)** | read prompts + 1:1 refs, run `image_gen` ×N, write `rounds/r<N>/` + `batch.json` | review / select |
| **blastimage frontend** | view a round, keep/approve/discard/rate, edit next-round prompt, write `selection.json` | generate images |
| **`/blast-iterate` (terminal)** | read `selection.json`, generate the next round from keeper-as-ref + edited prompt | review / select |

**The browser never generates.** Its only change from today's app: the iterate action
**emits a request file** instead of calling `generateBatch`.

---

## 3. File contracts

All paths are relative to the host repo's `imagegen/`. Images are referenced **by path**,
never embedded as base64 in the JSON (see §5).

### `rounds/r<N>/batch.json` — written by `/blast-generate`, read by the frontend

```json
{
  "schemaVersion": 1,
  "round": 1,
  "generatedAt": "2026-06-18T00:00:00Z",
  "tasks": [
    {
      "slug": "pressure-injuries-hero",
      "name": "Pressure Injuries — hero",
      "prompt": "…the exact prompt sent…",
      "ref": "refs/pressure-injuries-hero.jpg",
      "images": ["pressure-injuries-hero-001.jpg", "pressure-injuries-hero-002.jpg", "..."]
    }
  ]
}
```

**`slug` is the join, and only one side of it is app state (BI-030.3).** `/blast-generate`
derives each slug from `imagegen/tasks.json` and `/blast-iterate` carries it forward from the
prior `batch.json`; the frontend re-derives it as `slugify(task.name)` to match tasks on load
and to address them in `selection.json`. Renaming a task in the app therefore moves one end of
the join and nothing reconciles it — the next **↻ Load round** mints a duplicate task, and
**⟳ Iterate** writes a slug `/blast-iterate` won't match. The frontend now raises a blocking
confirm before any rename that would change a joined task's slug; **keep `imagegen/tasks.json`
in step** when you accept one. Slug-preserving renames (`Hero Banner` → `hero banner!`) are safe
and pass silently.

### `rounds/r<N>/selection.json` — written by the frontend, read by `/blast-iterate`

```json
{
  "schemaVersion": 1,
  "round": 1,
  "selectedAt": "2026-06-18T00:10:00Z",
  "tasks": [
    {
      "slug": "pressure-injuries-hero",
      "decision": "iterate",
      "keeper": "pressure-injuries-hero-002.jpg",
      "promptMode": "append",
      "nextPrompt": "…base prompt…\n\nRefine: warmer tones, tighter crop"
    }
  ]
}
```

- `decision`: `approve` → promote the keeper to `imagegen/approved/` (final, leaves the loop)
  · `iterate` → `/blast-iterate` generates the next round using `keeper` as the 1:1 reference
  and `nextPrompt` · `skip` → leave the task untouched this round.
- `promptMode`: `append` (default — base prompt unchanged + a `Refine:` delta) or `overhaul`
  (prompt rewritten; the carried reference is dropped so they don't fight). See §6.

**Approve is reversible (BI-030.2).** Clearing an `approved` decision in the frontend deletes
the keeper from `imagegen/approved/` and rewrites the task's entry to `{ slug, decision: "skip" }`
— so a mis-click never leaves an orphan file in the host repo. Two guards keep the undo from
clobbering a sibling approval: the entry is only rewritten when no other image of that task is
still approved in that round, and the file is only deleted when no other still-approved image
maps to the same (flat, filename-keyed) `approved/` name.

---

## 4. Frontend seams (BI-EPIC-024 — shipped)

The viewer/selector already existed (keep/approve/discard, rating, `IterateModal`'s
keeper→reference + `base + "Refine: <delta>"` composition). Two seams now wire the
terminal loop:

1. **Load a round** (BI-024.1) — Sidebar **🔗 Link imagegen** + **↻ Load round** read
   `rounds/r<N>/batch.json` + images through the File System Access folder seam (BI-021).
   Images stay as `imagegen:` path URLs — never embedded in `localStorage`.
2. **Emit a next-round request** (BI-024.2) — the iterate modal writes
   `selection.json` (keepers + `promptMode` + `nextPrompt`) instead of calling
   `generateBatch`. Approve promotes keepers to `imagegen/approved/`; clearing an approve
   undoes both halves of that write (BI-030.2 — see §3).

---

## 5. Why path-based, not localStorage

A real run (dozens of tasks × 3–5 variants × multiple rounds) embeds hundreds of base64
data URLs. Slurping them into `localStorage` is what corrupted adopter sessions and forced
the ad-hoc `sanitizeSession()` + nuclear "Clear" workarounds during early adoption. This
loop keeps round images **on disk in `imagegen/rounds/`** and holds only paths + metadata
in app state — so the bloat (and those hacks) never arise.

---

## 6. Iteration method (the carry-forward rule)

The kept image is passed as a **primary reference** (image-to-image), so it anchors
composition and house-style continuity. Therefore:

- **Default `append`:** keep the base prompt stable; add a short `Refine:` line describing
  only the *change* ("warmer tones, more steam, tighter crop"). The reference carries the
  look; the line steers the nudge. Best for keeping a figure family consistent.
- **`overhaul` only when the base prompt was wrong** (wrong subject/composition) — and drop
  the carried reference, or the new prompt and the old image fight each other.
- Mental model: **iterate = reference + delta. overhaul = fresh prompt, no reference.**

---

## 7. References

- [`GROK-AGENT.md`](GROK-AGENT.md) — the `generateBatch` seam contract the terminal skills satisfy
- [`ADOPT.md`](ADOPT.md) §6–§7 — the `imagegen/` layout + `tasks.json` import contract
- `lib/workspace.ts` · `lib/useWorkspace.ts` (`generate`) · `components/IterateModal.tsx` — the existing review/iterate model
