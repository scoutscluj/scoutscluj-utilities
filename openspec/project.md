# Project Context

## Purpose

Scouts Cluj Utilities is a fresh monorepo rewrite of the existing internal utilities portal for Centrul Local Cluj. The new implementation separates frontend, backend, and persistence concerns so future modules can be migrated by OpenSpec-governed vertical slices.

## Target Stack

- **Package manager:** pnpm workspace
- **Task runner:** Turborepo
- **Frontend:** SvelteKit 2 + Svelte 5 + TypeScript
- **Backend:** NestJS 11 + TypeScript
- **Database:** Postgres via MikroORM
- **API documentation:** Swagger/OpenAPI from NestJS

## Repository Layout

- `apps/web`: SvelteKit application
- `apps/api`: NestJS API
- `packages/*`: shared packages when a real cross-app contract appears
- `openspec`: proposals and capability specs

## Reference Projects

- Legacy app: `/Users/florin/Projects/scouts/utilities-scouts-cluj`
- Monorepo reference: `/Users/florin/Projects/scouts/contingent-management-app`

## Migration Approach

Each major legacy capability should be migrated through an OpenSpec proposal before implementation. Proposals should include behavior parity, data migration, authorization, and acceptance criteria.

Recommended feature order:

1. Platform/auth/users/roles
2. Inventory
3. Trainings and unit meetings
4. Orgo integration
5. Notifications and PWA support
6. Financial transactions and imports

## Quality Gates

- Root: `pnpm verify`
- API: `pnpm --filter api verify`
- Web: `pnpm --filter web verify`

Backend features should include service/controller tests. Frontend features should use SvelteKit type checks and add tests once the UI testing stack is selected.
