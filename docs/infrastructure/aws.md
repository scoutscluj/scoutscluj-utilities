# AWS Infrastructure

The first AWS target uses CDK-managed infrastructure with GitHub Actions-owned
deployment orchestration.

## Initial Architecture

- Public hostname: `resurse.scoutscluj.ro`
- Compute: one EC2 `t4g.small` Amazon Linux 2023 instance
- Database: one private RDS PostgreSQL `db.t4g.micro` instance
- Reverse proxy: Caddy on the EC2 host
- Container registry: ECR repositories for API and web images
- Secrets: Secrets Manager for app runtime configuration and RDS credentials
- Access: AWS Systems Manager Session Manager, no public SSH

Only ports `80` and `443` are open to the internet. The API port is not exposed
directly. Caddy proxies public `/api/*` requests to `127.0.0.1:3000`, and all
other requests to the SvelteKit web server on `127.0.0.1:3001`.

The deployed app should use:

```bash
PUBLIC_API_BASE_URL=https://resurse.scoutscluj.ro
WEB_ORIGIN=https://resurse.scoutscluj.ro
WEB_ORIGINS=https://resurse.scoutscluj.ro
ORGO_OAUTH_REDIRECT_URI=https://resurse.scoutscluj.ro/api/orgo/callback
```

## CDK Commands

Run from the repository root:

```bash
pnpm install
pnpm infra:synth
pnpm infra:diff
pnpm infra:deploy
```

The stack defaults to `eu-central-1`, `scoutscluj.ro`, and
`resurse.scoutscluj.ro`. Override values with CDK context when needed:

```bash
pnpm --filter infra deploy \
  --context domainName=scoutscluj.ro \
  --context appHostName=resurse.scoutscluj.ro \
  --context hostedZoneId=Z1234567890 \
  --context githubRepository=owner/repository
```

If `manageDns=true`, CDK expects the `scoutscluj.ro` hosted zone to exist in
Route53. If DNS is managed elsewhere, deploy with `--context manageDns=false`
and create an external DNS `A` record using the `AppHostPublicIp` stack output.

The zone-file import seed for the new AWS account is stored at
`docs/infrastructure/route53/scoutscluj.ro.zone`. It excludes the old hosted
zone `NS`/`SOA` records and leaves `resurse.scoutscluj.ro` to the CDK stack.

## Runtime Secrets

CDK creates:

- `scoutscluj/production/app`
- a generated RDS credential secret

After the first deploy, update `scoutscluj/production/app` with the real Orgo
client id and secret. The CDK-generated values set the web/API origins to
`https://resurse.scoutscluj.ro`.

## GitHub Actions Boundary

GitHub Actions should:

1. Build and test the monorepo.
2. Build ARM64 API and web images.
3. Push images to the CDK-created ECR repositories.
4. Use the optional GitHub OIDC deploy role to run an SSM deploy command on the
   EC2 host.
5. Run database migrations before or during the application restart.

The CDK stack creates the GitHub OIDC deploy role only when
`githubRepository=owner/repository` is provided as context.

## Deployment Workflow

The production deploy workflow lives at
`.github/workflows/deploy-production.yml`. It runs on pushes to `main` and can
also be started manually.

The workflow:

1. Installs dependencies.
2. Verifies the API, typechecks the web app, and verifies the infra package.
3. Builds ARM64 API and web Docker images.
4. Pushes both images to ECR with the commit SHA and `latest` tags.
5. Sends `deploy/ec2-deploy.sh` to the EC2 host through Systems Manager.
6. Runs database migrations from the new API image.
7. Restarts the API and web containers bound to localhost only.
8. Checks `http://127.0.0.1:3000/api/health` and
   `http://127.0.0.1:3001/health` on the host.

Set this GitHub Actions repository variable after the CDK stack creates the
deploy role:

```text
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::<account-id>:role/<github-deploy-role>
```

Deploy the stack with `githubRepository` so the OIDC role is created:

```bash
pnpm --filter infra deploy \
  --context githubRepository=owner/repository \
  --context githubBranch=main
```

The app secret must contain real Orgo credentials before the first deployment:

```bash
aws secretsmanager update-secret \
  --secret-id scoutscluj/production/app \
  --secret-string '{"AUTH_SESSION_SECRET":"...","ORGO_OAUTH_BASE_URL":"https://membri.scout.ro","ORGO_OAUTH_CLIENT_ID":"...","ORGO_OAUTH_CLIENT_SECRET":"...","PUBLIC_API_BASE_URL":"https://resurse.scoutscluj.ro","WEB_ORIGIN":"https://resurse.scoutscluj.ro","WEB_ORIGINS":"https://resurse.scoutscluj.ro","ORGO_OAUTH_REDIRECT_URI":"https://resurse.scoutscluj.ro/api/orgo/callback"}'
```

## Future Fargate Option

The Fargate version should keep RDS and replace the EC2 host with:

- ECS cluster
- two Fargate services: `web` and `api`
- two running tasks in production: one web task and one API task initially
- Application Load Balancer
- ALB listener rules:
  - `resurse.scoutscluj.ro/api/*` -> API target group
  - `resurse.scoutscluj.ro/*` -> web target group
- ACM certificate for `resurse.scoutscluj.ro`
- CloudWatch log groups per service
- ECR repositories reused from the EC2 version

This costs more because the Application Load Balancer and extra managed runtime
surface are always on. It removes most host management and gives a cleaner path
to horizontal scaling and rolling deployments.
