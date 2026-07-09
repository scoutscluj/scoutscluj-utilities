# ⚜️ Scouts Cluj Utilities

Scouts Cluj Utilities is the operational platform for Scouts Cluj resources,
activities, finance workflows, kitchen planning, notifications, and local
administration.

## 🧱 Stack

- pnpm 10 workspace with Turborepo
- `apps/api`: NestJS 11, MikroORM 7, PostgreSQL 16, Swagger/OpenAPI
- `apps/web`: SvelteKit 2, Svelte 5, TypeScript, SvelteKit node adapter
- `infra`: AWS CDK 2 stack for the production AWS environment
- `deploy`: production Dockerfiles and EC2 deployment script

## ✨ Features

- Orgo SSO login with API-owned sessions.
- Role-based access for `moderator`, `admin`, `finance_manager`, and
  `super_admin`.
- Admin user list and role management.
- Activity management with activity-scoped department toggles.
- Activity workspaces for overview, finance, kitchen, and audit.
- Kitchen planning for activities: shared ingredients and recipes, meals,
  attendance, quantity adjustments, procurement, document links/uploads, CSV
  exports, and printable reports.
- Finance document workflow: upload/list/download documents, status changes,
  audit trail, finance settings, and Keez handoff through Gmail.
- Central audit journal for sensitive app writes.
- Web Push notifications with user subscriptions, test sends, and super-admin
  broadcasts.
- PWA manifest, offline route, and production service worker.
- Static reference pages for Scouts Cluj resources.
- API health endpoint at `http://localhost:3000/api/health`.
- Swagger UI at `http://localhost:3000/api/docs`.

## ✅ Prerequisites

- Node.js 22 or newer.
- pnpm 10.28.0. The repo uses Corepack, so `corepack enable` is enough on a
  normal Node 22 install.
- Docker and Docker Compose for the local PostgreSQL service and optional image
  builds.
- Orgo OAuth/SSO credentials for the real login flow.
- AWS CLI credentials with CDK permissions when managing infrastructure.

## 🛠️ Local Setup

Install dependencies and create a local environment file:

```bash
corepack enable
pnpm install
cp .env.example .env
```

Start PostgreSQL:

```bash
pnpm db:up
```

Run database migrations:

```bash
pnpm --filter api migration:up
```

Start both apps:

```bash
pnpm dev
```

The API defaults to `http://localhost:3000`.
The web app defaults to `http://localhost:5173`.

The Orgo OAuth callback for local development should be:

```text
http://localhost:3000/api/orgo/callback
```

After the first login, assign the first super-admin manually:

```sql
update users set roles = array['super_admin']::user_role[] where email = 'user@example.com';
```

## 🔐 Environment Variables

The API and web app both load values from the root `.env` file. The checked-in
`.env.example` is the source of truth for a sample local environment.

Required for normal local development:

```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities
API_PORT=3000
WEB_PORT=5173

WEB_ORIGIN=http://localhost:5173
WEB_ORIGINS=http://localhost:5173,http://localhost:5174
PUBLIC_API_BASE_URL=http://localhost:3000
PUBLIC_APP_VERSION=0.0.0-dev
PUBLIC_COMMIT_HASH=local
PUBLIC_ENABLE_DEV_PWA=false

AUTH_SESSION_SECRET=replace-with-a-long-random-secret
ORGO_OAUTH_BASE_URL=https://membri.scout.ro
ORGO_OAUTH_CLIENT_ID=replace-me
ORGO_OAUTH_CLIENT_SECRET=replace-me
ORGO_OAUTH_REDIRECT_URI=http://localhost:3000/api/orgo/callback
```

Optional or feature-specific values:

```bash
# Enable TLS settings for remote PostgreSQL connections.
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false

# Web Push. Generate with: pnpm --filter api vapid:generate
VAPID_PUBLIC_KEY=replace-me
VAPID_PRIVATE_KEY=replace-me
VAPID_SUBJECT=mailto:admin@scoutscluj.ro

# Keez metadata. Direct API document upload is currently disabled, but these
# values are still exposed by finance settings/status surfaces.
KEEZ_ENVIRONMENT=staging
KEEZ_APP_ID=replace-me
KEEZ_CLIENT_ID=replace-me
KEEZ_CLIENT_SECRET=replace-me
KEEZ_DOCUMENT_EMAIL_EXPECTED_SENDER=cluj.napoca@scout.ro
KEEZ_DOCUMENT_EMAIL_RECIPIENT=replace-with-company-cui@keez.ro

# Gmail OAuth credentials used to send finance documents to Keez by email.
FINANCE_GMAIL_CLIENT_ID=replace-me
FINANCE_GMAIL_CLIENT_SECRET=replace-me
FINANCE_GMAIL_REFRESH_TOKEN=replace-me
FINANCE_GMAIL_SENDER_EMAIL=cluj.napoca@scout.ro

# Optional import path for a non-default kitchen legacy catalog export.
KITCHEN_EXPORTS_DIR=/absolute/path/to/exports
```

Notes:

- `PORT` can override app ports in container/runtime environments. Locally,
  prefer `API_PORT` and `WEB_PORT`.
- Keep real OAuth, Gmail, Keez, and VAPID values out of committed files.
- `PUBLIC_ENABLE_DEV_PWA=true` should only be used when explicitly testing
  service worker behavior in development.

## 🐳 Docker

Docker is only needed locally for PostgreSQL. The API and web app are normally
run with `pnpm dev`.

```bash
pnpm db:up
pnpm --filter api migration:up
pnpm dev
```

Useful database commands:

```bash
pnpm db:logs
pnpm db:down
```

The Compose database matches the sample `.env.example` connection string:
`postgresql://postgres:postgres@localhost:5432/scoutscluj_utilities`.

## 🧰 Common Commands

```bash
pnpm dev
pnpm build
pnpm lint
pnpm typecheck
pnpm test
pnpm verify

pnpm db:up
pnpm db:logs
pnpm db:down

pnpm --filter api migration:create
pnpm --filter api migration:up
pnpm --filter api migration:down
pnpm --filter api migration:pending
pnpm --filter api mikro-orm debug --config ./mikro-orm.config.cjs
pnpm --filter api kitchen:seed
pnpm --filter api vapid:generate

pnpm --filter web dev
pnpm --filter web build
pnpm --filter web preview
```

## ☁️ AWS Infrastructure

Production targets `https://resurse.scoutscluj.ro` and is managed by the CDK app
in `infra`.

The current AWS architecture is:

- one VPC with public subnets and isolated database subnets
- one public EC2 `t4g.small` Amazon Linux 2023 app host
- one private RDS PostgreSQL `db.t4g.micro` database
- one Elastic IP and optional Route53 `A` record for `resurse.scoutscluj.ro`
- Caddy on EC2 for HTTPS and reverse proxying
- ECR repositories for API and web images
- Secrets Manager secrets for app runtime configuration and RDS credentials
- CloudWatch log groups for API, web, and Caddy containers
- IAM role for the EC2 host
- optional GitHub OIDC deploy role scoped to the configured repository/branch
- SSM Session Manager access; SSH is not exposed

Only ports `80` and `443` are public. Caddy proxies `/api/*` to the API on
`127.0.0.1:3000` and all other requests to the SvelteKit web server on
`127.0.0.1:3001`.

The stack defaults are in `infra/cdk.json`:

- region: `eu-central-1`
- environment: `production`
- domain: `scoutscluj.ro`
- app host: `resurse.scoutscluj.ro`
- database name: `scoutscluj_utilities`
- GitHub repository: `scoutscluj/scoutscluj-utilities`
- GitHub branch: `main`

CDK commands from the repository root:

```bash
pnpm infra:synth
pnpm infra:diff
pnpm infra:deploy
```

Useful production log commands:

```bash
aws logs tail /scoutscluj/production/api --region eu-central-1 --follow
aws logs tail /scoutscluj/production/web --region eu-central-1 --follow
aws logs tail /scoutscluj/production/caddy --region eu-central-1 --follow
```

Open an SSM session with the stack output command:

```bash
aws ssm start-session --target <AppHostInstanceId>
```
