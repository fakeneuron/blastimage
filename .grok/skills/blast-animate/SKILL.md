---
name: blast-animate
description: >
  Terminal clip generation for blastimage's review loop: animate approved 16:9
  stills from imagegen/approved/ into 16:9 MP4 promo clips with
  reference_to_video (first and last frame pinned to the still), encode and
  ffprobe-check each take, write imagegen/rounds/r<N>/ + batch.json. Also
  re-animates from a clip round's selection.json. Subscription pool only.
  Invoke with /blast-animate. Triggers: "blast animate", "animate approved",
  "make promo clip", "clip round", "re-animate".
metadata:
  short-description: "Animate approved stills into a clip round in Grok Build"
---

# /blast-animate — Clip rounds from approved stills

Generate a round of **16:9 MP4 promo clips** for the blastimage review loop.
Each clip animates one approved still and loops back to it. Design SSOT:
`blastimage/docs/REVIEW-LOOP.md` §3 "Clip rounds"; decisions in blastimage
BI-078.1. File contracts match `lib/roundBatch.ts` (schema v1, `clip` object).

**You run in the host repo root**, where `imagegen/` sits beside the
`blastimage/` submodule. Load the `imagine` skill before calling video tools.

## 0. Usage guard (run first, every time)

Clips draw on the operator's Grok **subscription pool** only. An API key in the
session would bill per second instead, so stop if one is set. Check it **by
name**, and never print its value:

```bash
[ -n "${XAI_API_KEY+set}" ] && echo "STOP: XAI_API_KEY is set" || echo "ok: no XAI_API_KEY"
```

- `STOP` → tell the operator to unset it in this session and re-run. Do not
  generate anything.
- **Never top up** or buy credits. If the pool runs out mid-round, stop
  generating, keep the takes already made, and report which takes are missing
  (§6).
- Ask the operator to note the usage meter **before** the round and **after**
  it, and report both in the hand-off.

## Preconditions

1. **Cwd** = host project root (directory containing `imagegen/`).
2. `ffmpeg` and `ffprobe` on `PATH` (`command -v ffmpeg ffprobe`).
3. Helpers in `blastimage/lib/terminalRound.ts`: `TERMINAL_CLIP_TAKES` (3),
   `nextRoundNumber`, `parseRoundDirNames`, `roundImageFilename`,
   `planReanimateTasks`, `buildRoundBatch`, `serializeRoundBatch`.

## Two modes

| Invocation | Mode | Source still | Motion prompt |
|---|---|---|---|
| `/blast-animate` | new | every 16:9 still in `approved/` | §2 |
| `/blast-animate <slug or approved/file> …` | new | the named stills | §2 |
| `/blast-animate --round N` | re-animate | `ref` of the clip task in `rounds/rN/batch.json` | `nextPrompt` from `rounds/rN/selection.json` |

## 1. Pick source stills (new mode)

- List `imagegen/approved/`. Take only stills: skip `.mp4` (approved clips).
- Each file is `<slug>-NNN.<ext>`. A slug argument matches its files. **One
  still per slug:** if a slug has more than one approved still (with or without
  arguments), ask the operator which file to animate. They may pass
  `approved/<file>` directly. Two plans for one slug would overwrite each
  other's `<slug>-00K.mp4`.
- **16:9 only.** Read each still's size and refuse any that is not 16:9, allowing
  1 px of rounding: `|width × 9 − height × 16| ≤ 16`.

  ```bash
  ffprobe -v error -select_streams v:0 -show_entries stream=width,height -of csv=p=0 imagegen/approved/<file>
  ```

  No approved still for a requested slug → refuse that slug ("no clip without
  its poster"). No eligible stills at all → stop.
- `ref` for the batch = `approved/<file>`; `name` = the task name from
  `imagegen/tasks.json` whose `slugify(name)` matches, else derived from the slug.
- **Confirm before spending.** With no arguments, also note which stills already
  appear as a clip task's `ref` in an earlier `rounds/r*/batch.json`. Show the
  operator the plan (stills, 3 takes each, already-animated ones marked) and
  wait for their go before §4. Every take draws on the pool.

## 2. Motion prompt (new mode)

- `imagegen/prompts/<task name>.motion.txt` when it exists (same naming as the
  `prompts/<task name>.txt` still prompt).
- Otherwise the default — one gentle move, ending where it began:

  > Subtle ambient motion only: one slow, continuous camera move or gentle
  > natural movement in the scene. The composition, palette and subject stay
  > as in the image. The clip ends on the same frame it starts on, so it loops
  > seamlessly. No text, no cuts, no new objects.

- No words or sound: the encode strips audio, and the prompt must not ask for
  on-screen text.

## 1–2. Re-animate mode (`--round N`)

1. Read `imagegen/rounds/rN/batch.json` and `selection.json`. Stop if either is
   missing; warn if `selection.round !== N`.
2. `plans = planReanimateTasks(selection, batch)`. Each `iterate` entry whose
   keeper is an `.mp4` becomes one plan: the **same** source still (`ref`, under
   `approved/`), the refined motion prompt (`nextPrompt`), and the prior `clip`
   provenance. The keeper only marks which take the feedback was about; it is
   never a reference. `promptMode` does not apply.
3. Report every `iterate` entry that produced no plan (still keeper, no clip
   task or `ref` for its slug, duplicate slug), so no feedback is dropped
   silently. No plans at all → exit.
4. Confirm each `ref` still exists on disk; skip and report any that does not.

## 3. Pick output round

- `N = nextRoundNumber(parseRoundDirNames(<dirs in imagegen/rounds/>))`.
- `mkdir -p imagegen/rounds/r<N>` and a scratch dir **outside** `imagegen/`
  for raw takes: run `mktemp -d` once, then write its printed absolute path
  literally into every later command. Shell variables do not survive between
  tool calls. `<RAW>` below stands for that path.
- Fix the target duration `D` for the round: 6 s unless the operator asks for
  another value in 4–8 s. The same `D` is requested in §4, passed to `-t` in
  §5 and recorded as `clip.durationSeconds`. In re-animate mode, `D` is the
  prior `clip.durationSeconds`.

## 4. Generate takes

For each plan, make **`TERMINAL_CLIP_TAKES` (3) separate** calls (no `n`):

| Field | Value |
|---|---|
| Tool | `reference_to_video` (not `image_to_video`) |
| Model | `grok-imagine-video-1.5` (the lite model cannot pin frames) |
| `first_frame` | absolute path to `imagegen/<ref>` |
| `last_frame` | the **same** still, so the clip loops |
| Prompt | the motion prompt |
| Duration | `D` (§3) |
| Resolution | 720p; the ratio follows the still (16:9) |

Save each raw result to `<RAW>/<slug>-00K.mp4` (K = 1..3). If the tool's
parameter names differ from the table, use the tool's own names and tell the
operator so the skill can be corrected.

Moderation block or a pool-exhausted error → record the take as missing and
continue only if the pool allows; never retry by paying.

## 5. Encode and check each take

Encode per natabula `docs/STACK-TENDENCIES.md` §"Promo clips": crop, never
stretch; drop audio; first video stream only; `+faststart`. The output name is
`roundImageFilename(slug, K, 'mp4')`:

```bash
ffmpeg -y -i "<RAW>/<slug>-00K.mp4" -map 0:v:0 -an -t <D> \
  -vf "scale=1280:720:force_original_aspect_ratio=increase:flags=lanczos,crop=1280:720,format=yuv420p" \
  -c:v libx264 -profile:v high -preset slow -crf 23 \
  -movflags +faststart imagegen/rounds/r<N>/<slug>-00K.mp4
```

Then check it. Compare the values; do not eyeball them:

```bash
ffprobe -v error -select_streams v:0 \
  -show_entries stream=codec_name,profile,pix_fmt,width,height \
  -show_entries format=duration,size -of default=nw=1 imagegen/rounds/r<N>/<slug>-00K.mp4
# one stream only: prints exactly "video"
ffprobe -v error -show_entries stream=codec_type -of csv=p=0 imagegen/rounds/r<N>/<slug>-00K.mp4
```

A take passes when it is `h264`, `High`, `yuv420p`, `1280`×`720`, a duration of
4–8 s (and within 0.1 s of `D`), `size` ≤ 4194304, and the second command prints exactly `video`.

- Over the size limit → re-encode **from the raw take** with a higher `-crf`
  (25, then 28). Never shorten below 4 s to fit.
- Raw take shorter than `D` → the take fails; never loop or pad it.
- A take that still fails → delete its encoded file and record it as missing.

When every take is done, `rm -rf <RAW>`.

## 6. Write `batch.json`

Build with `buildRoundBatch()` + `serializeRoundBatch()`. Each plan carries
`ref` and `clip`; `images` lists only the takes that passed:

```json
{
  "schemaVersion": 1,
  "round": <N>,
  "generatedAt": "<ISO-8601>",
  "tasks": [
    {
      "slug": "<slug>",
      "name": "<display name>",
      "prompt": "<exact motion prompt sent>",
      "ref": "approved/<slug>-NNN.<ext>",
      "images": ["<slug>-001.mp4", "<slug>-002.mp4", "<slug>-003.mp4"],
      "clip": { "model": "grok-imagine-video-1.5", "tool": "reference_to_video", "durationSeconds": 6 }
    }
  ]
}
```

A task with no passing take is left out of `batch.json` and reported.
`durationSeconds` is `D`, the `-t` used.

## 7. Hand off

Report, per slug: takes made and missing (with the reason), the time per take,
and the usage meter before and after. Then tell the operator:

1. blastimage → **↻ Refresh rounds** → the `r<N>` chip.
2. Review the clips. **Approve** promotes the clip to `approved/` beside its
   still, and **Iterate** writes `selection.json`. Run `/blast-animate --round <N>`
   next to re-animate.
3. Landing a clip in a producer's `brand/` is a separate, attended step
   (natabula `DESIGN-STANDARDS.md` §"Brand kit"), not this skill's.

## Error handling

- `XAI_API_KEY` set → stop before any generation (§0).
- No 16:9 approved still → stop; approve a 16:9 still in blastimage first.
- `ffmpeg`/`ffprobe` missing → stop; install them.
- Partial failures → still write `batch.json` for the passing takes; list the gaps.

## References

- `blastimage/docs/REVIEW-LOOP.md` §3 "Clip rounds" — `batch.json` clip contract
- `blastimage/lib/terminalRound.ts` — `TERMINAL_CLIP_TAKES`, `planReanimateTasks`,
  `isClipRound`, `buildRoundBatch`
- natabula `docs/STACK-TENDENCIES.md` §"Promo clips" — encode and check commands
