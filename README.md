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
PUBLIC_APP_VERSION=0.0.0-dev
PUBLIC_COMMIT_HASH=local
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

## Railway Deployment

This monorepo is prepared for two Railway services that both deploy from the
repository root:

- API service config file: `/railway.api.json`
- Web service config file: `/railway.web.json`

When connecting the repository in Railway, create a Postgres service plus one
API service and one web service. For each app service, leave the root directory
as `/` and set the Railway config file path to the matching file above.

The API service config builds only `apps/api`, runs compiled MikroORM migrations
as a pre-deploy step, starts `node dist/main` through the API package, and uses
`/api/health` for health checks. The web service config builds only `apps/web`,
starts the SvelteKit node adapter with `HOST=0.0.0.0`, and uses `/health` for
health checks.

Railway injects `PORT`; do not set it manually. The API also supports
`API_PORT` for local development.

Set these API service variables:

```bash
DATABASE_URL=${{Postgres.DATABASE_URL}}
AUTH_SESSION_SECRET=replace-with-a-long-random-secret
ORGO_OAUTH_BASE_URL=https://membri.scout.ro
ORGO_OAUTH_CLIENT_ID=replace-me
ORGO_OAUTH_CLIENT_SECRET=replace-me
WEB_ORIGIN=https://your-web-service.up.railway.app
WEB_ORIGINS=https://your-web-service.up.railway.app
```

Set this web service variable:

```bash
PUBLIC_API_BASE_URL=https://your-api-service.up.railway.app
PUBLIC_APP_VERSION=0.0.0-dev
PUBLIC_COMMIT_HASH=local
```

## PWA Support

The web app exposes a `ScoutsCluj` manifest and a production service worker.
Normal `pnpm --filter web dev` does not register the service worker to avoid
stale development bundles. Use a production build/preview or set
`PUBLIC_ENABLE_DEV_PWA=true` only when explicitly testing service worker
behavior.

The first PWA slice caches the app shell, static assets, and previously visited
navigations. API responses, uploads, auth routes, and data-changing operations
remain network-only unless a future feature explicitly opts in.

Install flow:

- Android Chrome: open the HTTPS site, use the browser install prompt or
  `Menu > Add to Home screen`.
- iOS Safari: open the HTTPS site, tap `Share`, then `Add to Home Screen`.

After Railway generates the API domain, configure the Orgo app callback URL as:

```text
https://your-api-service.up.railway.app/api/orgo/callback
```

The Orgo callback lands on the API service first, then redirects back to the web
service callback so the browser session cookie is stored on the web domain.

## References

- Legacy behavior/data source: `/Users/florin/Projects/scouts/utilities-scouts-cluj`
- Local monorepo pattern reference: `/Users/florin/Projects/scouts/contingent-management-app`

Use OpenSpec proposals for major migrated capabilities before implementation.

## AWS Infrastructure

The first AWS target is CDK-managed EC2 plus RDS:

- `https://resurse.scoutscluj.ro` is the only public hostname.
- The EC2 host exposes only ports `80` and `443`.
- The API is not exposed on a public port; `/api/*` is reverse-proxied locally.
- PostgreSQL runs on private RDS.
- GitHub Actions owns build, image push, migrations, and deploy orchestration.

See `docs/infrastructure/aws.md` and
`docs/adr/0001-use-ec2-rds-for-initial-aws-infrastructure.md`.

Common commands:

```bash
pnpm infra:synth
pnpm infra:diff
pnpm infra:deploy
```
