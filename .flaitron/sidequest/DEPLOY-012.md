---
title: personal-config-audit
status: sidequest
priority: Low
pickup: next-chat
created: 2026-10-17
parent: DEPLOY-011
---

# DEPLOY-012 | personal-config-audit

[← PLAN.md](../PLAN.md) · 📌 Sidequest (filed 2026-10-17)

## Idea

Confirm git tracks no personal or machine-specific configuration. blastimage is public, and every adopter checks it out as a submodule. Sweep `git ls-files` for candidates such as `.vscode/`, `*.code-workspace`, `.claude/`, absolute `~/` or `/Users/` paths, personal emails, and local hostnames (e.g. `fakeneuron-nas`). Untrack, genericize, or justify each hit (some, like `.vscode/`, are tracked deliberately as natabula deposits). Operator request raised during DEPLOY-011.

## Resume anchor

DEPLOY-011 Phase 2: landing built, eslint fence + justfile + docs + PORT-REGISTRY edited; next was Phase 3 verification.
