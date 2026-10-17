---
title: personal-config-audit
status: completed
tags: []
created: 2026-10-17
due:
related-tasks: [DEPLOY-011]
---

# DEPLOY-012 | personal-config-audit

[← PLAN.md](../PLAN.md) · 🟢 In progress · 🔗 [[DEPLOY-011]]

## 🎯 Goal

Confirm git tracks no personal or machine-specific configuration — every hit untracked, genericized, or justified — because blastimage is public and adopter-checked-out as a submodule.

## ✅ Acceptance

- [x] No tracked local-state or secret-bearing files, and nothing tracked that `.gitignore` excludes — `! git ls-files | grep -E '(^|/)(\.idea|\.history|\.mcp\.json|settings\.local\.json|\.env($|\.(local|bak))|.*\.(pem|key))$' && test -z "$(git ls-files -ci --exclude-standard)"`
- [x] No tracked symlink is absolute — `git ls-files -s | awk '$1==120000{print $4}' | while read -r p; do case "$(readlink "$p")" in /*) echo "ABS $p";; esac; done` prints nothing
- [x] No username-bearing home path in live tracked files (archived tasknotes and the `.flaitron/core` pin excluded, `/Users/dev/…` test fixtures allowed) — `git grep -nIE '[/]Users[/][A-Za-z]' -- . ':!.flaitron/core' ':!.flaitron/tasknote' ':!package-lock.json' ':!landing/package-lock.json' | grep -vE '[/]Users[/]dev[/]'` prints nothing
- [x] No operator email or personal hostname in live tracked files — `git grep -nIiE 'judedelparte|gmail|fakeneuron-nas|synology|[A-Za-z0-9._-]+@[A-Za-z0-9-]+[.](com|net|org|io|dev)' -- . ':!.flaitron/core' ':!.flaitron/tasknote' ':!.flaitron/sidequest' ':!package-lock.json' ':!landing/package-lock.json'` prints nothing
- [x] Every tracked editor/agent config file and every remaining pattern hit has a recorded disposition (untracked / genericized / justified) — `judgment`: a prose table in Implementation Notes, no command decides whether a justification is sound
- [x] Sidequest stub retired on promotion — `test ! -e .flaitron/sidequest/DEPLOY-012.md`

## 🧩 Subtasks

- [x] Inventory tracked config: `git ls-files` for editor/agent/env/dotfile candidates
- [x] Sweep tracked content for home paths, emails, hostnames, account IDs, secrets
- [x] Check symlink targets and `.gitignore` coverage
- [x] Record a disposition per hit (Implementation Notes)
- [x] Run the Acceptance commands; record the receipt
- [x] Close: PLAN stub, archive, retire the sidequest stub, atomic commit

## 🔗 Related

- [[DEPLOY-011]] — landing-page (parent; the operator raised this audit during it)

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** Open, unblocked `[light] [unattended]` row under `## Low`; nothing since DEPLOY-011 changed the tracked tree (working tree clean at start, HEAD `9de835c`), and the audit is read-only on the evidence side.

- [x] Read relevant source files — the tracked-config inventory below, read in full; no broad read set, so no probe.

- [x] **Best Practices Review** — `N/A` — no code or module boundary in scope.

- [x] **Archive skim** — `archive/deployment/` (README row `DEPLOY-*` → `archive/deployment/`) holds one relevant hit: `DEPLOY-011.md`, the parent, which filed this audit (Acceptance line "Personal-config audit follow-up filed", filed in 487f9f8). No prior config audit, no decision to honor or reverse. The archive *content* is itself audit scope (see Implementation Notes).

- [x] **Drift check** — PLAN line matches the stub's `## Idea` (same scope list). The stub names `fakeneuron-nas` as an example hostname; no tracked file contains it, and the sweep found no hostname at all. SPEC §"Cross-repo edit remit" applies: natabula-owned deposits (`.cursorrules`, `.vscode/`, workspace file) are not edited from here — a divergence there is natabula's to fix, so those are justified, not changed.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed (`--unattended`). Assumptions: (1) scope is the tracked tree at HEAD, not git history or authorship metadata (a commit's author name and email are inherent to every public repo and are not "tracked config"); (2) archived tasknotes are write-once records (`.flaitron/tasknote/README.md`, flaitron SPEC §"Tasknote frontmatter"), so a hit there is justified, not rewritten; (3) the operator's GitHub handle (`fakeneuron`) is already public via the repo URL, `.gitmodules`, `LICENSE`, and docs, so the handle alone is not a finding.

- [x] Subtasks above populated with ordered steps; YAML `touches:` omitted — `N/A — no file deliverable` (the product is this audit record; the tasknote and PLAN row are excluded from scope reconciliation by construction).

**Discovery Notes:**

Carried from the retired sidequest stub:

> **Idea** — Confirm git tracks no personal or machine-specific configuration. blastimage is public, and every adopter checks it out as a submodule. Sweep `git ls-files` for candidates such as `.vscode/`, `*.code-workspace`, `.claude/`, absolute `~/` or `/Users/` paths, personal emails, and local hostnames (e.g. `fakeneuron-nas`). Untrack, genericize, or justify each hit (some, like `.vscode/`, are tracked deliberately as natabula deposits). Operator request raised during DEPLOY-011.
>
> **Resume anchor** — DEPLOY-011 Phase 2: landing built, eslint fence + justfile + docs + PORT-REGISTRY edited; next was Phase 3 verification.

Method: 347 tracked files. Config inventory by `git ls-files` pattern; content sweeps by `git grep` over the tracked tree only (so untracked and ignored files cannot contribute false hits), with `.flaitron/core` (the flaitron submodule pin) and the two lockfiles excluded.

## 🛠️ Phase 2: Execution

✅ Phase 1 Discovery complete; entering Phase 2 Execution. (Discovery surfaced no significant deviation → skip 🛠️.)

- [x] **Pattern survey** — N/A — audit, no code written

- [x] **Minimal refactor gate** — N/A — no code touched

- [x] Implemented the minimal solution — the audit itself; **zero source edits needed** (every hit is justified below)

- [x] Updated/added tests for non-trivial behavior — N/A — no behavior change

**Implementation Notes:**

Result: **nothing to untrack or genericize.** No `/Users/<name>` path, personal email, hostname (`fakeneuron-nas`, Synology, `.local`, `.lan`), Cloudflare account ID, LAN IP, key material, or secret-shaped string is in the live tracked tree. No tracked file matches an ignore rule, no symlink is absolute, and `.env*` is ignored apart from the sanitized `.env.example`.

Tracked config and agent files (the stub's named candidates) — all deliberate:

| Path | What it holds | Disposition |
|---|---|---|
| `.vscode/settings.json`, `.vscode/extensions.json` | formatter and terminal defaults; extension recommendations | **Justified** — natabula Tier-1 deposit, project-level defaults; `.gitignore` states "tracked as SSOT … personal prefs live in VS Code user settings". No paths. |
| `blastimage.code-workspace` | watcher/search excludes, ESLint/Python settings, a commented terminal-profile example | **Justified** — natabula deposit (customize-by-design class). Cosmetic: stale `eslint.workingDirectories: frontend` and a comment naming two other projects; neither is personal config, and the file is natabula's to fix, not edited from here (SPEC §"Cross-repo edit remit"). |
| `.claude/settings.json` | one `permissions.deny` rule for the flaitron submodule's own archive | **Justified** — project-level, relative path, the dogfood-archive fence. No `settings.local.json` is tracked (and none exists in `git ls-files`). |
| `.claude/skills/*`, `.grok/skills/*` | 7 relative symlinks each into `.flaitron/core/claude/skills/`, plus the project's `audit` overlay | **Justified** — repo-scoped wiring that `/ft-task` requires; all links relative (`../../.flaitron/core/…`), none absolute. |
| `.cursorrules` | natabula deposit pointing agents at `AGENTS.md` | **Justified** — see pattern hits below. |
| `.ignore` | ripgrep fence for the submodule archive | **Justified** — repo-relative pattern only. |
| `.env.example` | comments only, no variables | **Justified** — template, no values. |
| `.pre-commit-config.yaml`, `landing/wrangler.toml` | secret-scan hook; Worker config | **Justified** — no `account_id`, route, or zone ID present. |

Pattern hits in live tracked files:

| Hit | Where | Disposition |
|---|---|---|
| `~/Code/CLAUDE.md`, `~/.claude/CLAUDE.md` | `.cursorrules:7-8` | **Justified** — tilde-relative (no username), read-if-exists pointers inside a natabula deposit; editing it here would diverge from `/natabula-layer-refresh`. Dangling on an adopter's machine is harmless: the line says "read any file that exists". |
| `~/Code/natabula/docs/…`, `~/Code/natabula/scripts/validate-brand.sh` | `brand/BRAND.md`, `brand/PROMPTS.md`, `brand/README.md`, `landing/astro.config.mjs:5` | **Justified** — provenance pointers to the standards the brand kit follows; tilde-relative, no username, no secret. An adopter simply cannot follow them. |
| `~/.claude/CLAUDE.md` | `.pre-commit-config.yaml:19` | **Justified** — comment naming where the uv convention is written. |
| `~/Code/spinalcord/imagegen` | `lib/workspace.ts:217` | **Justified** — doc-comment example of a linked root. |
| `fakeneuron/ASSETS.md`, `fakeneuron/public/projects/`, `fakeneuron.com/public/projects/` | `brand/PROMPTS.md:40,64-66,93`, `brand/README.md:95` | **Justified** — brand-provenance prose naming the operator's public site/handle and a sibling repo's relative doc; no machine path. |
| `fakeneuron` (handle) | `.gitmodules`, `LICENSE`, `docs/ADOPT.md`, `brand/assets.json` | **Justified** — the public GitHub owner and copyright holder; the repo URL itself. |
| `/Users/dev/Code/spinalcord/imagegen`, `/home/dev/…`, `/home/user/projects` | `components/Sidebar.test.tsx`, `lib/workspace.test.ts`, `components/ImagegenLinkModal.test.tsx`, `lib/imagegenClient.test.ts` | **Justified** — synthetic test fixtures with a placeholder user. |
| `$HOME` | `e2e/helpers.ts:40`, `e2e/imagegen-link-load.spec.ts:13` | **Justified** — comments about the picker's browse tree, not a value. |

Archived tasknotes (tracked history, write-once — `.flaitron/tasknote/README.md`; SPEC §"Tasknote frontmatter"): three contain the macOS username in an absolute path — `archive/bi/BI-013.md:159` (a `.grok/sessions/…` image path and its URL-encoded twin), `archive/bi/BI-059.md:106` (a `tsc -p` command), `archive/core/CORE-011.md:95` (a producer path). Others carry tilde paths (`~/Code/natabula/…`, `~/Code/_screenshots/…`). **Justified, not rewritten:** the username is the already-public GitHub handle, none of the paths is a secret or reaches anything outside the owner's own machine, and rewriting archived notes would break the write-once record. Residual risk accepted.

Out of scope, noted: git history and commit authorship metadata; the untracked `.claude/settings.local.json`-style files an operator may hold locally (not tracked, so not exposed).

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A — no code changed; the full set ran instead (`--unattended` never takes the targeted default), see receipt

- [x] Ran lint/type-check on changed code — N/A — no code changed; full set ran, see receipt

- [x] **Verification receipt** — recorded below; changed code: `N/A — no code changed` (diff is workflow files only)

- [x] **External review** — `N/A` — the diff has no source: one new tasknote, a PLAN row flip, and a deleted sidequest stub. The claims it makes are decided by the mechanical commands in the receipt, which any reader can re-run, so there is no code diff for a non-author to grade.

- [x] (frontend) Asked the user for visual confirmation — N/A — no rendered surface, so no 👁️ ask and no park

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Full validation set (`--unattended`; discovered via the `justfile`):

```text
just test       → 0   (33 files, 687 tests passed)
just lint       → 0   (eslint + landing astro check: 0 errors, 0 warnings, 0 hints)
just typecheck  → 0
```

Acceptance verify commands (run verbatim from `## ✅ Acceptance`; "prints nothing" commands wrapped to capture the output):

```text
A1 no local-state / secret-bearing files, nothing tracked that .gitignore excludes   → 0
A2 no absolute symlink (prints nothing)                                              → 0
A3 no username-bearing home path in live tracked files (prints nothing)              → 0
A4 no operator email / personal hostname in live tracked files (prints nothing)      → 0
A6 test ! -e .flaitron/sidequest/DEPLOY-012.md                                       → 0
```

A5 is `judgment` — dispositions in Implementation Notes. Sanity on A3's discrimination: with the `.flaitron/tasknote` exclusion removed it prints the three archived-note hits (BI-013, BI-059, CORE-011) recorded as justified above, so the empty result is the filter working, not the pattern missing.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — `README.md` no change · `AGENTS.md` no change · `CLAUDE.md` no change · `.flaitron/PLAN.md` updated (row flipped to the Completed stub) · `VISION.md` no change · `docs/ADOPT.md` no change · `docs/WORKFLOW.md` no change · `docs/REVIEW-LOOP.md` no change · `docs/GROK-AGENT.md` no change. No source or behavior changed, so no doc describes anything this task altered.

- [x] Closed — Acceptance ticked (A5 `judgment` ticked on the recorded dispositions), YAML `status: completed`, PLAN.md line → `Completed 2026-10-17.` stub at the top of `## Completed`, tasknote moved to `.flaitron/tasknote/archive/deployment/`

- [x] **Evidence-based recap** drafted — see Final Summary

- [x] **Learnings** — `N/A` — the finding (this repo's tracked tree is clean; archived tasknotes carry the public GitHub handle in a few absolute paths) is a one-time audit result, not a standing rule; the archive's write-once rule and the natabula deposit boundary are already recorded in the README and SPEC.

**Final Summary:**

The audit found the tracked tree clean: no personal or machine-specific configuration needs untracking or genericizing. Every editor, agent, and wiring file is a deliberate natabula or flaitron deposit with relative paths, and every remaining pattern hit — tilde-relative standards pointers, the public `fakeneuron` handle, synthetic `/Users/dev` test fixtures — is justified in Implementation Notes.

- **Changed files:** `.flaitron/tasknote/archive/deployment/DEPLOY-012.md` (new, this record), `.flaitron/PLAN.md` (row → Completed stub), `.flaitron/sidequest/DEPLOY-012.md` (deleted — retired on promotion). No source, config, or doc outside the workflow files.
- **Verification:** full set `just test` / `just lint` / `just typecheck` → 0 / 0 / 0 (687 tests); Acceptance A1–A4 and A6 → 0; A5 `judgment`.
- **Refactors:** none made, none deferred.
- **Doc verdict:** no change across the AI-referenced docs.
- **`touches:` reconciliation:** `N/A — no file deliverable` (the task's own tasknote and PLAN row are excluded by construction).
- **Residual risk, accepted:** three archived tasknotes (`archive/bi/BI-013.md`, `archive/bi/BI-059.md`, `archive/core/CORE-011.md`) carry `/Users/fakeneuron/…` paths. Archived notes are write-once, and the username is the already-public GitHub owner handle. Git history and authorship metadata are out of scope.
- **Noted, not filed:** `blastimage.code-workspace` (a natabula deposit) carries a stale `eslint.workingDirectories: frontend` and a comment naming two other projects. Neither is personal config, and the fix belongs to natabula (SPEC §"Cross-repo edit remit"). No deferred operator step exists, so nothing is filed under `SPEC.md` §"Deferred hand-off filing", and `unattended-candidates: none`.

**Archived:** 2026-10-17
