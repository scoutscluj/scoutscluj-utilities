# Scouts Cluj Utilities

Fresh monorepo for the Scouts Cluj utilities platform.

## Stack

- pnpm workspace + Turborepo
- `apps/api`: NestJS, MikroORM, Postgres, Swagger
- `apps/web`: SvelteKit, Svelte 5, TypeScript

## Local Setup

```bash
pnpm install
cp .env.example .env
pnpm db:up
pnpm dev
```

The API defaults to `http://localhost:3000`.
The web app defaults to `http://localhost:5173`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm verify
pnpm db:up
pnpm db:down
pnpm --filter api mikro-orm debug --config ./mikro-orm.config.cjs
pnpm --filter api migration:create
pnpm --filter api migration:up
```

## References

- Legacy behavior/data source: `/Users/florin/Projects/scouts/utilities-scouts-cluj`
- Local monorepo pattern reference: `/Users/florin/Projects/scouts/contingent-management-app`

Use OpenSpec proposals for major migrated capabilities before implementation.
