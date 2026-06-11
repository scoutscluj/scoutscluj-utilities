# OpenSpec Instructions

Instructions for AI coding assistants using OpenSpec for spec-driven development.

## Quick Checklist

- Search existing work: `openspec list`, `openspec list --specs`
- Decide scope: new capability vs modify existing capability
- Pick a unique verb-led `change-id`: `add-`, `update-`, `remove-`, `refactor-`
- Scaffold `proposal.md`, `tasks.md`, optional `design.md`, and spec deltas under `openspec/changes/<change-id>/`
- Write deltas with `## ADDED|MODIFIED|REMOVED Requirements`
- Include at least one `#### Scenario:` per requirement
- Validate with `openspec validate <change-id> --strict`
- Do not implement large architecture or feature work until the proposal is approved

## When To Create A Proposal

Create a proposal for:

- New capabilities
- Breaking API/schema changes
- Architecture or platform changes
- Major security, auth, data migration, or performance work
- Feature migrations from the legacy Firebase/Next.js application

Skip proposals for:

- Typo fixes
- Formatting-only changes
- Small bug fixes that restore already-specified behavior
- Non-breaking dependency updates

## Project Direction

This repository is the fresh implementation of Scouts Cluj Utilities:

- `apps/web`: SvelteKit frontend
- `apps/api`: NestJS backend
- `packages/*`: shared packages, added only when needed
- Database: Postgres via MikroORM

The legacy application at `/Users/florin/Projects/scouts/utilities-scouts-cluj` is the behavior and data reference. Do not import runtime code from it without an explicit migration decision.

The pnpm/NestJS workspace at `/Users/florin/Projects/scouts/contingent-management-app` is a local reference for monorepo conventions.
