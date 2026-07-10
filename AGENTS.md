# AGENTS.md instructions for scoutscluj-utilities

## Code Discovery

Use Codebase Memory MCP for codebase discovery and navigation whenever it fits
the task. The project should be used with
[DeusData/codebase-memory-mcp](https://github.com/DeusData/codebase-memory-mcp).

Prefer graph/code-memory tools such as `search_graph`, `trace_path`,
`get_code_snippet`, `query_graph`, and `search_code` before falling back to
plain text search. If the repository is not indexed, run `index_repository`
first.

## Planning And Discussion

When planning work, discussing ideas, or exploring tradeoffs with a developer,
use the `grill-me` skill from
[mattpocock/skills](https://github.com/mattpocock/skills) to pressure-test the
plan before implementation.

## Git Safety

At the start of every new work session, run `git fetch --all --prune` before
making decisions from remote branch state.

Do not push directly to `main`. When asked to push into `main`, create a pull
request targeting `main` using the repository's PR template, then merge that PR
into `main` after the required checks and review expectations are satisfied.

Before creating or merging a pull request targeting `main`, always run
`git fetch --all --prune` and confirm local `main` is up to date with
`origin/main`.

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
