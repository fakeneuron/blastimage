---
name: blast-iterate
description: >
  Terminal next-round generation for blastimage: read imagegen/rounds/r<N>/selection.json,
  generate r<N+1> from keeper-as-ref + edited prompts via image_edit or image_gen,
  write batch.json. Invoke with /blast-iterate. Triggers: "blast iterate",
  "next round", "run selection.json", "iterate imagegen batch".
metadata:
  short-description: "Generate the next imagegen round from selection.json"
---

# /blast-iterate — Next round from selection

Read the frontend's `selection.json` and generate the **next** round for the
blastimage review loop. Design SSOT: `blastimage/docs/REVIEW-LOOP.md` §3 + §6.

**You run in the host repo root.** Load the `imagine` skill before calling
`image_gen` / `image_edit`.

## Preconditions

1. **Cwd** = host project root.
2. **`imagegen/rounds/r<N>/selection.json`** exists (written by blastimage
   after review — see BI-024.2).
3. Source round images still on disk under `imagegen/rounds/r<N>/`.
4. Helpers: `blastimage/lib/terminalRound.ts`, `blastimage/lib/roundSelection.ts`.

## Flow

### 1. Locate selection

- Default: highest `N` where both `rounds/r<N>/selection.json` and `batch.json`
  exist.
- Operator may specify `--round N` to target a specific selection file.

Read and validate with `parseRoundSelection()` logic (schema v1). Run
`validateIterateSelectionTasks()` — every `decision: "iterate"` entry needs
`keeper` + `nextPrompt`.

### 2. Plan iterate tasks

Use `planIterateTasks(selection, N)`:

| `promptMode` | Tool | Reference |
|--------------|------|-----------|
| `append` (default) | `image_edit` | keeper at `rounds/r<N>/<keeper>` |
| `overhaul` | `image_gen` | none — drop ref so prompt and old image don't fight |

Skip tasks with `decision: "skip"` or `decision: "approve"` (approved keepers
were already promoted to `imagegen/approved/` by the frontend).

**Carry-forward rule** (`REVIEW-LOOP.md` §6): iterate = reference + delta;
overhaul = fresh prompt only.

### 3. Pick output round

`nextRound = N + 1`. Create `imagegen/rounds/r<nextRound>/`.

### 4. Resolve base metadata

Read `rounds/r<N>/batch.json` for task `name` and prior `ref` fields (slug →
display name). Unknown slugs: derive name from slug.

### 5. Generate per iterate task (batch size 4)

For each planned task:

- **`useReference: true`** → 4× `image_edit` with:
  - `image` = absolute path to `imagegen/rounds/r<N>/<keeper>`
  - `prompt` = `nextPrompt` from selection
- **`useReference: false`** → 4× `image_gen` with `prompt` = `nextPrompt`

Save to `imagegen/rounds/r<nextRound>/<slug>-00K.<ext>` (K = 1..4).

For `append` mode, carry the prior `ref` path from the source batch into the new
`batch.json` `ref` field (the 1:1 house-style ref — the keeper steers this round).

For `overhaul`, omit `ref` in batch.json.

### 6. Write `batch.json`

```json
{
  "schemaVersion": 1,
  "round": <nextRound>,
  "generatedAt": "<ISO-8601>",
  "tasks": [
    {
      "slug": "<slug>",
      "name": "<from prior batch>",
      "prompt": "<nextPrompt sent>",
      "ref": "refs/<slug>.<ext>",
      "images": ["<slug>-001.<ext>", "..."]
    }
  ]
}
```

Only include tasks that were generated (iterate decisions). Use
`buildRoundBatch()` + `serializeRoundBatch()`.

### 7. Hand off

1. blastimage → **↻ Load round r<nextRound>**
2. Review → write new `selection.json` → repeat `/blast-iterate` until satisfied

## Error handling

- Missing `selection.json` → stop; operator must review prior round in blastimage first.
- No `iterate` tasks → report and exit (all skip/approve).
- Missing keeper file on disk → report slug, skip that task.
- Round mismatch (`selection.round !== N`) → warn operator before proceeding.

## References

- `blastimage/docs/REVIEW-LOOP.md` — selection.json schema + iteration method
- `blastimage/lib/roundSelection.ts` — `parseRoundSelection`, `detectPromptMode`
- `blastimage/lib/terminalRound.ts` — `planIterateTasks`, `buildRoundBatch`