# Project command interface — blastimage.
#
# Uniform fleet verbs (`just dev`, `just test`, …) so muscle memory transfers
# across repos; bodies are adapted to blastimage's layout:
#   • single Next.js app at the REPO ROOT (package.json → npm; :3003)
#   • no frontend/ · backend/ · landing/ subdirs, no pyproject
# Convention: natabula `docs/STACK-TENDENCIES.md` §"Command interface".
# Prerequisite: `just` (brew install just).

# list available recipes
default:
    @just --list

# install dependencies (npm at root)
setup:
    npm install

# run the dev server (Next.js, :3003)
dev:
    npm run dev

# run the test suite (vitest)
test:
    npm test

# lint (eslint)
lint:
    npm run lint

# type-check (tsc --noEmit)
typecheck:
    npm run typecheck

# build for production (next build)
build:
    npm run build
