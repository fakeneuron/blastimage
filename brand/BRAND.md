---
tagline: "Blast out batches. Keep the best."
one_liner: "A local app for generating, reviewing, and iterating batches of AI images for a website, then exporting the keepers with full provenance."
description: "blastimage turns a website's image list into a coordinated review loop. Define prompt tasks, attach optional reference photos, and generate batches of candidates with Grok Imagine. Keep the best, discard the rest, give feedback on the promising ones, and iterate until each task has its image. Approved images export with a JSON manifest recording every prompt, iteration, and reference used. It runs locally, keeps state in the browser, and adopts into another repo as a submodule."
---

# Brand

The three fields above are this project's public blurb — the one place a
card, a catalog entry, a README index, or a social post should quote from.
Fill all three; keep them public-safe. Caps are caps, not targets:

- `tagline` — ≤ 8 words. The catchphrase.
- `one_liner` — ≤ 25 words. One sentence: what it is and for whom.
- `description` — ≤ 80 words. The paragraph a card could carry whole.

Below this line the file is free — longer copy, voice notes, what not to
say. Standard: `~/Code/natabula/docs/DESIGN-STANDARDS.md` §"Brand kit".

## Voice notes

- The name is lowercase, one word: `blastimage` — never "BlastImage" or
  "Blast Image".
- "Blast" is the batch — many candidates at once — not destruction. Lead
  with the loop (generate → review → iterate → export), not with volume.
- Say "Grok Imagine" for the generator; do not imply blastimage hosts a
  model or holds credentials — generation runs in a Grok Build session.
- Do not call it a hosted service, a SaaS, or multi-user: it is a local,
  single-operator tool with browser-only state.
