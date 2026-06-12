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

## Authentication Setup

Orgo SSO is the initial login method. Configure these values before testing the
real OAuth flow:

```bash
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
ORGO_OAUTH_BASE_URL=https://membri.scout.ro
ORGO_OAUTH_CLIENT_ID=replace-me
ORGO_OAUTH_CLIENT_SECRET=replace-me
PUBLIC_API_BASE_URL=http://localhost:3000
WEB_ORIGIN=http://localhost:5173
WEB_ORIGINS=http://localhost:5173,http://localhost:5174
```

Run the auth migration before using the login flow:

```bash
pnpm --filter api migration:up
```

The Orgo OAuth redirect URI should point to the API callback route:
`http://localhost:3000/api/orgo/callback`.

The first `super_admin` is assigned manually after that user has logged in once:

```sql
update users set roles = array['super_admin']::user_role[] where email = 'user@example.com';
```

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
