# Project command interface — uniform verbs across the fleet.
#
# The same verbs work in every repo (`just dev`, `just test`, …); each one
# delegates to whatever the stack actually uses underneath. Standardizes the
# *interface*, not the implementation — so muscle memory is portable when you
# jump between apps, while each app's stack stays free to grow organically.
#
# Prerequisite: `just` (one-time `brew install just`). Run `just` with no args
# to list recipes. This file auto-adapts to the layout present — the
# `frontend/` · `backend/` · `landing/` subdir convention, OR a single-stack
# app at the repo root (`package.json` → npm, `pyproject.toml` → uv). Nothing
# to trim; delete a recipe only if it genuinely doesn't apply.
#
# Note: `lint` / `test` / `typecheck` / `e2e` / `coverage` here call the native
# tools (eslint/vitest/ruff/pytest/tsc/playwright/diff-cover) so they work for
# humans, agents, and CI alike. `coverage` mirrors the CI changed-line gate.
#
# blastimage is a root Next app plus a `landing/` Astro page (DEPLOY-011), a
# layout the auto-adapt does not cover: a `landing/` dir would make `dev` start
# the landing and `setup` / `lint` / `build` skip the root app. Those four
# recipes are hand-authored here (STACK-TENDENCIES §"Command interface") — the
# root app stays primary and the landing is additive.

# list available recipes
default:
    @just --list

# install dependencies for the root app and the landing page
setup:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "› root: npm install";    npm install
    echo "› landing: npm install"; (cd landing && npm install)

# run the primary dev surface — the root Next app (`just landing` for the landing page)
dev:
    npm run dev

# run the backend dev server (fullstack repos: pair with `just dev` in another terminal)
api:
    cd backend && uv run python main.py

# run the landing-page dev server
landing:
    cd landing && npm run dev

# run tests for every stack present
test:
    #!/usr/bin/env bash
    set -euo pipefail
    ran=0
    if [ -d backend ];  then echo "› backend: pytest";  (cd backend  && uv run pytest); ran=1; fi
    if [ -d frontend ]; then echo "› frontend: vitest"; (cd frontend && npm test); ran=1; fi
    if [ "$ran" = 0 ]; then
      if   [ -f package.json ];   then echo "› root: test";   npm test
      elif [ -f pyproject.toml ]; then echo "› root: pytest"; uv run pytest
      else echo "no tests"; fi
    fi

# run end-to-end tests (Playwright) — frontend subdir, else root, if a config exists
e2e:
    #!/usr/bin/env bash
    set -euo pipefail
    if   [ -d frontend ] && ls frontend/playwright.config.* >/dev/null 2>&1; then cd frontend && npx playwright test
    elif [ -f package.json ] && ls playwright.config.* >/dev/null 2>&1; then npx playwright test
    else echo "no Playwright config found — e2e not wired up for this repo"; fi

# lint the root app and check the landing page
lint:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "› root: lint";           npm run lint
    echo "› landing: astro check"; (cd landing && npm run check)

# type-check the TypeScript surface(s) present (tsc via `npm run typecheck`)
typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    ran=0
    if [ -d frontend ]; then echo "› frontend: tsc"; (cd frontend && npm run typecheck); ran=1; fi
    if [ "$ran" = 0 ] && [ -f package.json ]; then echo "› root: tsc"; npm run typecheck; ran=1; fi
    if [ "$ran" = 0 ]; then echo "nothing to type-check"; fi

# changed-line coverage for every stack present (mirrors the CI gate)
# Usage: `just coverage` (vs. origin/main) or `just coverage HEAD~3`.
coverage BASE="origin/main":
    #!/usr/bin/env bash
    set -euo pipefail
    # Same gate CI runs, same tool, same threshold. Pin matches
    # DIFF_COVER_VERSION in .github/workflows/ci.yml; bump both together.
    DC="diff-cover@10.5.1"; MIN=80
    ran=0; main=0
    if [ -d backend ]; then
      echo "› backend: pytest --cov + diff-cover"
      (cd backend && uv run pytest -q --cov=. --cov-report=xml >/dev/null)
      uvx "$DC" backend/coverage.xml --compare-branch="{{BASE}}" --fail-under=$MIN --show-uncovered
      ran=1; main=1
    fi
    if [ -d frontend ]; then
      echo "› frontend: vitest --coverage + diff-cover"
      (cd frontend && npm test -- --run --coverage >/dev/null)
      # lcov SF: paths are stack-dir-relative; git diff paths are repo-root
      # relative, and diff-cover's --src-roots does not remap lcov.
      sed -i.bak 's|^SF:|SF:frontend/|' frontend/coverage/lcov.info && rm -f frontend/coverage/lcov.info.bak
      uvx "$DC" frontend/coverage/lcov.info --compare-branch="{{BASE}}" --fail-under=$MIN --show-uncovered
      ran=1; main=1
    fi
    if [ -d worker ]; then
      echo "› worker: vitest --coverage + diff-cover"
      (cd worker && npm test -- --run --coverage >/dev/null)
      sed -i.bak 's|^SF:|SF:worker/|' worker/coverage/lcov.info && rm -f worker/coverage/lcov.info.bak
      uvx "$DC" worker/coverage/lcov.info --compare-branch="{{BASE}}" --fail-under=$MIN --show-uncovered
      ran=1
    fi
    if [ "$main" = 0 ]; then
      if [ -f package.json ]; then
        echo "› root: vitest --coverage + diff-cover"
        npm test -- --run --coverage >/dev/null
        # Root layout: SF: paths are already repo-root-relative, no rewrite.
        uvx "$DC" coverage/lcov.info --compare-branch="{{BASE}}" --fail-under=$MIN --show-uncovered
        ran=1
      elif [ -f pyproject.toml ]; then
        echo "› root: pytest --cov + diff-cover"
        uv run pytest -q --cov=. --cov-report=xml >/dev/null
        uvx "$DC" coverage.xml --compare-branch="{{BASE}}" --fail-under=$MIN --show-uncovered
        ran=1
      fi
    fi
    if [ "$ran" = 0 ]; then echo "nothing to measure"; fi

# build the root app and the landing page
build:
    #!/usr/bin/env bash
    set -euo pipefail
    echo "› root: build";    npm run build
    echo "› landing: build"; (cd landing && npm run build)
