---
name: blast-generate
description: >
  Terminal batch generation for blastimage's review loop: read imagegen/tasks.json
  and refs/, run image_gen or image_edit per task, write imagegen/rounds/r<N>/
  images + batch.json. Includes round-0 ref-bootstrap when refs/ is empty.
  Invoke with /blast-generate. Triggers: "blast generate", "generate round",
  "run imagegen batch", "terminal generate", "round 0 bootstrap".
metadata:
  short-description: "Generate an imagegen round in Grok Build"
---

# /blast-generate — Terminal round generation

Generate a batch round for the blastimage **terminal-generate / frontend-review**
loop. Design SSOT: `blastimage/docs/REVIEW-LOOP.md`. File contracts match
`lib/roundBatch.ts` (schema v1).

**You run in the host repo root** — `imagegen/` sits beside the `blastimage/`
submodule. Generation uses Grok Build `image_gen` / `image_edit` (load the
`imagine` skill first).

## Preconditions

1. **Cwd** = host project root (directory containing `imagegen/`).
2. **`imagegen/tasks.json`** exists (§6 contract in `blastimage/docs/ADOPT.md`).
3. Optional: **`imagegen/prompts/<name>.txt`** — when a prompt file exists for a
   task name, prefer its contents over `basePrompt` in `tasks.json`.
4. **`blastimage/lib/terminalRound.ts`** — pure helpers for slug/ref/round
   planning (`TERMINAL_BATCH_SIZE = 4`, filename pattern `<slug>-NNN.<ext>`).

## Round-0 ref bootstrap (when `imagegen/refs/` is empty)

Per `docs/REVIEW-LOOP.md` §1: seed 1:1 references before the real run.

1. Confirm `imagegen/refs/` has no image files.
2. Run this skill in **bootstrap mode** (round **0**, **no refs**):
   - Generate prompt-only variants (`image_gen` only).
   - Write to `imagegen/rounds/r0/` + `batch.json` with `round: 0` and no `ref`
     fields on tasks.
3. Tell the operator: open blastimage (`npm run dev` in submodule), **🔗 Link
   imagegen**, **↻ Load round r0**, review, and save `selection.json` (iterate or
   approve keepers per task).
4. **Promote refs** — after `selection.json` exists, copy each keeper to
   `imagegen/refs/<slug>.<ext>` (preserve keeper extension). Use
   `planRefBootstrapCopies()` from `terminalRound.ts` or copy manually:
   `rounds/r0/<keeper>` → `refs/<slug>.<ext>`.
5. Re-run `/blast-generate` for the real round (now with refs).

Skip steps 1–4 when `refs/` already has `<slug>.<ext>` files.

## Standard generation flow

### 1. Discover tasks and refs

```bash
# Verify layout
ls imagegen/tasks.json imagegen/refs/ imagegen/rounds/ 2>/dev/null
```

- Parse `imagegen/tasks.json` (`version: 1`, `tasks[].name`, `tasks[].basePrompt`).
- For each task, compute `slug = slugify(name)` (same rule as
  `blastimage/lib/storage.ts`: lowercase, non-alphanumerics → `-`).
- Build ref index: files matching `imagegen/refs/<slug>.<ext>` →
  `refs/<slug>.<ext>` path in batch.json.
- Override prompts from `imagegen/prompts/<name>.txt` when the file exists.

### 2. Pick round number

- List `imagegen/rounds/r*/` directories.
- `nextRound = max(existing) + 1`, or `1` if none (use `nextRoundNumber()`).
- Bootstrap mode always uses round `0`.

### 3. Create output directory

```bash
mkdir -p imagegen/rounds/r<N>
```

### 4. Generate per task (batch size 4)

For each task in order:

| Condition | Tool | Inputs |
|-----------|------|--------|
| Has `refs/<slug>.<ext>` | `image_edit` | `image` = absolute path to ref; `prompt` = task prompt |
| No ref (bootstrap) | `image_gen` | `prompt` = task prompt; `aspect_ratio` per use case |

- Make **4 separate** tool calls per task (no `n` parameter).
- Save each result to `imagegen/rounds/r<N>/<slug>-00K.<ext>` (K = 1..4).
- Prefer `.jpg` or `.png` consistently; match the source ref extension when editing.

**Prompt craft:** load `imagine` skill. Default `append` iteration is irrelevant
here — these are fresh variants from the base prompt (+ ref when present).

### 5. Write `batch.json`

Build with `buildRoundBatch()` / `serializeRoundBatch()`:

```json
{
  "schemaVersion": 1,
  "round": <N>,
  "generatedAt": "<ISO-8601>",
  "tasks": [
    {
      "slug": "<slug>",
      "name": "<display name>",
      "prompt": "<exact prompt sent>",
      "ref": "refs/<slug>.<ext>",
      "images": ["<slug>-001.<ext>", "..."]
    }
  ]
}
```

Omit `ref` when prompt-only. Image filenames are **relative to the round dir**.

### 6. Hand off to blastimage

Tell the operator:

1. `cd blastimage && npm run dev` → http://localhost:3003
2. Sidebar → **🔗 Link imagegen** → pick the host `imagegen/` folder
3. **↻ Load round r<N>** → review keep/approve/discard
4. Iterate selections write `selection.json` → run `/blast-iterate` next

## Error handling

- Missing `tasks.json` → stop; point to ADOPT.md §6–7.
- Empty task list → stop.
- `image_gen` / `image_edit` moderation block → report task slug, continue others
  if the operator agrees.
- Partial failures → still write `batch.json` for successful tasks; note gaps.

## References

- `blastimage/docs/REVIEW-LOOP.md` — loop diagram + contracts
- `blastimage/lib/terminalRound.ts` — `planGenerateTasks`, `indexRefPaths`,
  `buildRoundBatch`, `planRefBootstrapCopies`
- `blastimage/lib/roundBatch.ts` — schema validator the frontend uses on ingest