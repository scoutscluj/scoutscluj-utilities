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

The root Compose file currently runs PostgreSQL only:

```bash
docker compose up -d db
docker compose logs -f db
docker compose down
```

Build production-style local images:

```bash
docker build -f deploy/docker/api.Dockerfile -t scoutscluj-api:local .
docker build -f deploy/docker/web.Dockerfile -t scoutscluj-web:local .
```

When running those images against the Compose database on Docker Desktop, use
`host.docker.internal` for the database host:

```bash
docker run --rm \
  --env-file .env \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/scoutscluj_utilities \
  scoutscluj-api:local \
  node apps/api/dist/migrate.js
```

Run the API image:

```bash
docker run --rm \
  --name scoutscluj-api \
  --env-file .env \
  -e DATABASE_URL=postgresql://postgres:postgres@host.docker.internal:5432/scoutscluj_utilities \
  -p 3000:3000 \
  scoutscluj-api:local
```

Run the web image:

```bash
docker run --rm \
  --name scoutscluj-web \
  --env-file .env \
  -e HOST=0.0.0.0 \
  -e PORT=3000 \
  -e PUBLIC_API_BASE_URL=http://localhost:3000 \
  -p 5173:3000 \
  scoutscluj-web:local
```

The production deployment uses the same Dockerfiles, builds ARM64 images, pushes
them to ECR, and runs them on the EC2 host.

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
pnpm --filter infra destroy
```

Override CDK context when deploying a fork or alternate environment:

```bash
pnpm --filter infra deploy \
  --context environmentName=staging \
  --context domainName=scoutscluj.ro \
  --context appHostName=staging-resurse.scoutscluj.ro \
  --context manageDns=false \
  --context githubRepository=owner/repository \
  --context githubBranch=main
```

If `manageDns=true`, the hosted zone must already exist in Route53. If DNS is
managed elsewhere, deploy with `--context manageDns=false` and point an external
`A` record at the `AppHostPublicIp` stack output.

After the first deploy, update the application secret with real runtime values:

```bash
aws secretsmanager update-secret \
  --region eu-central-1 \
  --secret-id scoutscluj/production/app \
  --secret-string '{"AUTH_SESSION_SECRET":"...","ORGO_OAUTH_BASE_URL":"https://membri.scout.ro","ORGO_OAUTH_CLIENT_ID":"...","ORGO_OAUTH_CLIENT_SECRET":"...","ORGO_OAUTH_REDIRECT_URI":"https://resurse.scoutscluj.ro/api/orgo/callback","PUBLIC_API_BASE_URL":"https://resurse.scoutscluj.ro","PUBLIC_APP_VERSION":"0.0.0","PUBLIC_COMMIT_HASH":"unknown","WEB_ORIGIN":"https://resurse.scoutscluj.ro","WEB_ORIGINS":"https://resurse.scoutscluj.ro","VAPID_PUBLIC_KEY":"...","VAPID_PRIVATE_KEY":"...","VAPID_SUBJECT":"mailto:admin@scoutscluj.ro","KEEZ_DOCUMENT_EMAIL_EXPECTED_SENDER":"cluj.napoca@scout.ro","KEEZ_DOCUMENT_EMAIL_RECIPIENT":"...","FINANCE_GMAIL_CLIENT_ID":"...","FINANCE_GMAIL_CLIENT_SECRET":"...","FINANCE_GMAIL_REFRESH_TOKEN":"...","FINANCE_GMAIL_SENDER_EMAIL":"cluj.napoca@scout.ro"}'
```

The production GitHub Actions workflow lives at
`.github/workflows/deploy-production.yml`. It runs on pushes to `main` and can
also be triggered manually. It verifies the API, web, and infra packages, builds
ARM64 Docker images, pushes them to ECR, sends `deploy/ec2-deploy.sh` to the EC2
host through SSM, runs migrations, imports the kitchen catalog seed, restarts
containers, and checks local health endpoints.

Set this repository variable after CDK creates the GitHub deploy role:

```text
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::<account-id>:role/<github-deploy-role>
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

See `docs/infrastructure/aws.md` and
`docs/adr/0001-use-ec2-rds-for-initial-aws-infrastructure.md` for the detailed
infrastructure notes.

Use OpenSpec proposals for major migrated capabilities before implementation.
