# AGENTS.md instructions for scoutscluj-utilities

## Git Safety

At the start of every new work session, run `git fetch --all --prune` before
making decisions from remote branch state.

Before pushing directly to `main`, always run `git fetch --all --prune` and
confirm local `main` is up to date with `origin/main`. Do not push to `main`
from a stale local branch.

<!-- OPENSPEC:START -->

# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:

- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:

- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->
