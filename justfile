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
# Note: `lint` / `test` / `typecheck` / `e2e` here call the native tools
# (eslint/vitest/ruff/pytest/tsc/playwright) so they work for humans and CI.
# Inside Claude Code, `/ft-quality` covers the same ground for agents.

# list available recipes
default:
    @just --list

# install dependencies for every stack present
setup:
    #!/usr/bin/env bash
    set -euo pipefail
    ran=0
    if [ -d backend ];  then echo "› backend: uv sync";     (cd backend  && uv sync); ran=1; fi
    if [ -d frontend ]; then echo "› frontend: npm install"; (cd frontend && npm install); ran=1; fi
    if [ -d landing ];  then echo "› landing: npm install";  (cd landing  && npm install); ran=1; fi
    if [ "$ran" = 0 ]; then
      if   [ -f package.json ];   then echo "› root: npm install"; npm install
      elif [ -f pyproject.toml ]; then echo "› root: uv sync";     uv sync
      else echo "nothing to set up"; fi
    fi

# run the primary dev surface (frontend → landing → backend → root app)
dev:
    #!/usr/bin/env bash
    set -euo pipefail
    if   [ -d frontend ]; then cd frontend && npm run dev
    elif [ -d landing ];  then cd landing  && npm run dev
    elif [ -d backend ];  then cd backend  && uv run python main.py
    elif [ -f package.json ];   then npm run dev
    elif [ -f pyproject.toml ]; then uv run python main.py
    else echo "nothing to run (no frontend/, landing/, backend/, or root app)"; exit 1
    fi

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

# run end-to-end tests (Playwright) — frontend subdir, else root, if present
e2e:
    #!/usr/bin/env bash
    set -euo pipefail
    if   [ -d frontend ];     then cd frontend && npx playwright test
    elif [ -f package.json ]; then npx playwright test
    else echo "no e2e tests"; fi

# lint / type-check every stack present
lint:
    #!/usr/bin/env bash
    set -euo pipefail
    ran=0
    if [ -d backend ];  then echo "› backend: ruff";        (cd backend  && uv run ruff check .); ran=1; fi
    if [ -d frontend ]; then echo "› frontend: eslint";     (cd frontend && npm run lint); ran=1; fi
    if [ -d landing ];  then echo "› landing: astro check"; (cd landing  && npm run check); ran=1; fi
    if [ "$ran" = 0 ]; then
      if   [ -f package.json ];   then echo "› root: lint"; npm run lint
      elif [ -f pyproject.toml ]; then echo "› root: ruff"; uv run ruff check .
      else echo "nothing to lint"; fi
    fi

# type-check the TypeScript surface(s) present (tsc via `npm run typecheck`)
typecheck:
    #!/usr/bin/env bash
    set -euo pipefail
    ran=0
    if [ -d frontend ]; then echo "› frontend: tsc"; (cd frontend && npm run typecheck); ran=1; fi
    if [ "$ran" = 0 ] && [ -f package.json ]; then echo "› root: tsc"; npm run typecheck; ran=1; fi
    if [ "$ran" = 0 ]; then echo "nothing to type-check"; fi

# build every stack present (backend has no build step by default)
build:
    #!/usr/bin/env bash
    set -euo pipefail
    ran=0
    if [ -d frontend ]; then echo "› frontend: build"; (cd frontend && npm run build); ran=1; fi
    if [ -d landing ];  then echo "› landing: build";  (cd landing  && npm run build); ran=1; fi
    if [ "$ran" = 0 ] && [ -f package.json ]; then echo "› root: build"; npm run build; fi
