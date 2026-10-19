---
title: landing-go-live
status: completed
tags: []
created: 2026-10-18
due:
related-tasks: [DEPLOY-EPIC-014, DEPLOY-011]
touches:
  - landing/README.md
  - landing/wrangler.toml
  - brand/assets.json
---

# DEPLOY-014.6 | landing-go-live

[← PLAN.md](../PLAN.md) · ✅ Completed · 🔗 [[DEPLOY-EPIC-014]] · [[DEPLOY-011]]

## 🎯 Goal

Take the `landing/` Astro page live at the `blastimage.com` apex (Worker + custom domain + `www` → apex 301) and tick the `landing/README.md` operator checklist.

## ✅ Acceptance

- [x] Zone `blastimage.com` is active on Cloudflare — `GET /zones?name=blastimage.com` → `status: active` (verified at Discovery)
- [x] Worker `blastimage-landing` deployed — `npm --prefix landing run build && (cd landing && npx wrangler deploy)` exit 0
- [x] Apex serves the page — `curl -sI https://blastimage.com` → `HTTP/2 200`, body contains the `noindex` robots meta
- [x] `www.blastimage.com` 301s to the apex keeping path and query — `curl -sI 'https://www.blastimage.com/x?y=1'` → `301`, `location: https://blastimage.com/x?y=1`
- [x] `public_metadata.homepage_url` declared in `brand/assets.json` (optional step; operator accepted) — `grep -q homepage_url brand/assets.json`
- [x] `landing/README.md` §"Operator steps" ticked and its "(not yet done)" heading reconciled — awk over the section piped to `grep -c '\[ \]'` → 0
- [x] Doc-drift sweep across `.flaitron/tasknote/README.md` §"AI-referenced docs" — `judgment`, no command decides it

## 🧩 Subtasks

- [x] Step 1 — zone on Cloudflare (already satisfied; confirm at close)
- [x] Step 2 — build + `wrangler deploy` (creates `blastimage-landing`)
- [x] Step 3 — custom domain `blastimage.com` on the Worker
- [x] Step 4 — proxied `www` DNS record + 301 redirect rule (keep path and query)
- [x] Step 5 — `homepage_url` in `brand/assets.json` once the apex serves
- [x] Tick `landing/README.md` checklist

## 🔗 Related

- [[DEPLOY-EPIC-014]] — parent epic (upkeep-honesty)
- [[DEPLOY-011]] — built the landing and left the checklist untracked

---

## 📝 Phase 1: Discovery

- [x] Reviewed the task entry in PLAN.md

- [x] **Relevance Assessment**

  **Verdict:** Proceed
  **Rationale:** The checklist is still open and the apex does not serve (no A record, `curl` returns nothing).

- [x] Read relevant source files — `landing/README.md`, `landing/wrangler.toml`, `brand/assets.json`

- [x] **Best Practices Review** — `N/A`: operator/infra steps, no code or module-boundary change

- [x] **Archive skim** — `archive/deployment/` (area per README table): DEPLOY-011 built the landing and deferred deploy/domain/redirect to operator steps by design (agent publishes nothing); DEPLOY-012/013/014.3 touch it only incidentally. Nothing load-bearing beyond that.

- [x] **Drift check** — README checklist, `wrangler.toml` (`name = "blastimage-landing"`, assets `./dist`), and PLAN line agree; `landing/dist` already exists locally (rebuild before deploy). No drift.

- [x] Asked clarifying questions OR logged "No clarifications needed" with explicit assumptions — No clarifications needed: scope is fixed by the README checklist. Assumption: the operator's go at the Phase 1→2 gate authorizes the public deploy, DNS record, and redirect rule; `homepage_url` stays optional and is confirmed separately.

- [x] Subtasks above populated with ordered steps; YAML `touches:` declared (omit only with no file deliverable)

**Discovery Notes:**

- Live state (read-only, 2026-10-18): zone `blastimage.com` active (id `d74633d9…`), NS `dan`/`arushi.ns.cloudflare.com`; **zero DNS records**; no `http_request_dynamic_redirect` ruleset; Worker list has no `blastimage-landing`. So step 1 is done, steps 2–5 are open.
- Account: Cloudflare MCP is authenticated as the Apple-relay account that owns the zone.
- Steps 2–5 are outward-facing (public deploy, DNS, redirect) — each needs the operator's go before it runs.

## 🛠️ Phase 2: Execution

- [x] **Pattern survey** — extended the fleet pattern: committed `[[routes]] custom_domain = true` (adppro, bidviz, marscharts, judedelparte) and natabula NAT-433's `cf-www-redirect.sh` for `www`; no new shape

- [x] **Minimal refactor gate** — no refactor; config and doc edits only

- [x] Implemented the minimal solution — apex route + explicit `workers_dev`/`preview_urls` in `landing/wrangler.toml`; `homepage_url` in `brand/assets.json`; README checklist ticked. Cloudflare writes (deploy, `www` record + redirect rule, Always Use HTTPS) were operator-run: the agent's `wrangler deploy` and MCP writes were denied (auto-mode classifier; MCP token read-only).

- [x] Updated/added tests for non-trivial behavior — N/A: no code behavior changed

**Implementation Notes:**

- Step 2 done (operator ran it, after the auto-mode classifier denied the agent's `wrangler deploy`): `blastimage-landing` live at `https://blastimage-landing.7fndrh47p8.workers.dev` (version `4425599f-ed9b-4939-b4bf-b2eff4fa958c`); `curl` → 200 with the `noindex` robots meta.
- Step 3 (custom domain) attempted via Cloudflare API `PUT /accounts/{id}/workers/domains`; classifier denied it. Not worked around. Fleet pattern found instead (adppro/bidviz/marscharts/judedelparte): declare `[[routes]] custom_domain = true` in the wrangler config. Added the apex route to `landing/wrangler.toml`; operator re-ran `wrangler deploy` → `blastimage.com (custom domain)`; `curl -I https://blastimage.com` → 200, `noindex` meta present. Also set `workers_dev = false` / `preview_urls = false` explicitly (matches the deploy's defaults, silences the warnings).
- The Cloudflare MCP (re-authorized once) still returns `10000: Authentication error` on writes; reads work.
- Step 4 (`www` → apex 301) waits on natabula NAT-433's `scripts/cf-www-redirect.sh` (dry-run by default, `--apply` with a zone-scoped `CLOUDFLARE_API_TOKEN`: Zone Read, DNS Edit, Single Redirect Edit). Not committed in natabula yet (staged, uncommitted, another session). `www` is deliberately not bound in `routes`, to follow the standard being written. Always Use HTTPS still to confirm.
- NAT-433 filed in natabula (`cd4c437`) as the follow-up for the reusable standard.
- Remaining: `www` record + redirect, `homepage_url` (optional, ask first), tick README checklist, verify with `curl`, close.

## 🧪 Phase 3: Testing & Linting

- [x] Ran targeted test suite for changed code — N/A: no source changed; `npm --prefix landing run check` run instead (below)

- [x] Ran lint/type-check on changed code — `astro check` (landing): 0 errors, 0 warnings, 0 hints

- [x] **Verification receipt** — recorded in Testing Notes; no duplication/dead code (config + docs only)

- [x] **External review** — `N/A`: the diff is ~25 lines of config, JSON and docs, with each line directly verified live by the receipt below

- [x] (frontend) Asked the user for visual confirmation — `N/A`: no frontend source changed; the page is unchanged from DEPLOY-011's confirmed build, now live at https://blastimage.com

**Choosing a test strategy:** see SPEC.md §"🧪 Phase 3: Testing & Linting".

**Testing Notes:**

Receipts (2026-10-19):

- `curl -sI https://blastimage.com/` → `HTTP/2 200`; body has `<meta name="robots" content="noindex">` (count 1) → 0
- `curl -sI 'https://www.blastimage.com/x?y=1'` → `HTTP/2 301`, `location: https://blastimage.com/x?y=1` → 0
- `curl -sI http://blastimage.com/` → `301`, `Location: https://blastimage.com/` → 0 (Always Use HTTPS on)
- `grep -q homepage_url brand/assets.json` → 0; `jq -e '.public_metadata.homepage_url.value'` → `"https://blastimage.com"`, 0
- README §"Operator steps" unchecked count → 0
- `npm --prefix landing run check` → 0 errors, 0 warnings, 0 hints
- Zone active and no `blastimage-landing` Worker at Discovery (MCP read); Worker deployed by operator `npx wrangler deploy` (versions `4425599f…` then `54a374e9…`, custom domain reported).
- Early note: the first `www` `curl` failed locally with "Could not resolve host" (resolver negative cache); resolving via 1.1.1.1 showed the 301 and later local checks passed.

## 🚀 Phase 4: Closure

- [x] **Doc-drift sweep** — README.md, AGENTS.md, CLAUDE.md, PLAN.md, VISION.md, docs/*: no change (none claims the landing is undeployed; `landing/README.md` itself updated)

- [x] Closed — Acceptance ticked or annotated (`N/A` / not met + reason), YAML `status: completed`, PLAN.md line → `Completed YYYY-MM-DD.` stub (standalone → top of `## Completed`; epic child → stays nested under its parent), then tasknote moved to `.flaitron/tasknote/archive/<area>/`

- [x] **Evidence-based recap** drafted — see Final Summary

- [x] **Learnings** — N/A for AGENTS.md; the reusable recipe is natabula NAT-433 (committed), with the exec-bit follow-up NAT-436

**Final Summary:**

blastimage.com now serves the landing page. The `blastimage-landing` Worker is deployed with the apex as a committed custom-domain route; `www` 301s to the apex (path and query kept) via a proxied `AAAA www 100::` and a zone Redirect Rule applied by natabula's `cf-www-redirect.sh`; `http://` 301s to https (Always Use HTTPS). `homepage_url` is declared and the README checklist is ticked.

- Changed files: `landing/wrangler.toml` (apex `[[routes]]`, `workers_dev`/`preview_urls` false), `landing/README.md` (checklist ticked, heading reconciled, custom-domain line), `brand/assets.json` (`homepage_url`).
- Verification: all Acceptance commands passed (Testing Notes).
- `touches:` reconciliation: declared `landing/README.md`, `brand/assets.json`; actual also `landing/wrangler.toml` (added to `touches:`); plus workflow files PLAN/tasknote.
- Not done by the agent: every Cloudflare write was operator-run. The agent's `wrangler deploy` and Cloudflare-MCP writes were denied (auto-mode classifier; MCP grant read-only even after re-auth). That friction produced natabula NAT-433 (standard, `cf-www-redirect.sh`, short-lived zone token) and NAT-436 (script exec bit).
- Follow-ups: NAT-436 (natabula). The short-lived token was revoked.

**Archived:** 2026-10-19
