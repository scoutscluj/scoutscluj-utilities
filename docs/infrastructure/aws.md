# AWS Infrastructure

The first AWS target uses CDK-managed infrastructure with GitHub Actions-owned
deployment orchestration.

## Initial Architecture

- Public hostname: `resurse.scoutscluj.ro`
- Compute: one EC2 `t4g.small` Amazon Linux 2023 instance
- Database: one private RDS PostgreSQL `db.t4g.micro` instance
- Reverse proxy: Caddy on the EC2 host
- Container registry: ECR repositories for API and web images
- Secrets: Secrets Manager for core app runtime configuration and RDS credentials; KMS-encrypted PostgreSQL records for administrator-managed payment credentials
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
# Empty until Orgo issues the local center's scoped server-to-server token.
ORGO_API_TOKEN=
# Prefer the stable ORGO local-center ID over a display-name match.
ORGO_LOCAL_CENTER_ID=
ORGO_LOCAL_CENTER_NAME=Centrul Local Cluj
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
`resurse.scoutscluj.ro`. It also defaults the GitHub deployment role to the
`scoutscluj/scoutscluj-utilities` repository on the `main` branch, so the root
`pnpm infra:synth`, `pnpm infra:diff`, and `pnpm infra:deploy` scripts produce
the same stack shape for the main production repository.

Override values with CDK context when needed:

```bash
pnpm --filter infra run deploy \
  --context domainName=scoutscluj.ro \
  --context appHostName=resurse.scoutscluj.ro \
  --context hostedZoneId=Z1234567890 \
  --context githubRepository=owner/repository
```

When using a named local AWS profile, pass it to the package script:

```bash
pnpm --filter infra run diff --profile scouts-cluj
pnpm --filter infra run deploy --profile scouts-cluj --require-approval never
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
- a retained, automatically rotating KMS key for payment-provider configuration

After the first deploy, update `scoutscluj/production/app` with the real Orgo
client id and secret. The CDK-generated values set the web/API origins to
`https://resurse.scoutscluj.ro`.

The deployment passes only the KMS key ARN and AWS region to the API container.
The EC2 role can encrypt and decrypt with that key. NETOPIA and Stripe
credentials entered in the administration page are stored only as KMS
ciphertext in PostgreSQL; the KMS key material cannot be exported. Historical
ciphertext revisions are retained so callbacks for already-started payments can
still be verified after credential rotation.

The production payment key uses the alias
`alias/scoutscluj-production-payment-configuration`. Automatic rotation and a
retention policy are enabled. Its ARN is exposed through the
`PaymentConfigurationKeyArn` CloudFormation output and is injected into the API
container by the deployment workflow.

## Safe Infrastructure Updates

The production app currently runs on one stateful EC2 host. Its Amazon Linux
2023 AMI is pinned in CDK rather than resolved from the public "latest AMI"
parameter. Resolving that parameter during an unrelated stack update can replace
the instance after the change set is created. AMI upgrades must therefore be
explicit maintenance changes with a database backup, a planned replacement, and
post-deployment health checks.

The EC2 launch template shape is preserved to match the existing production
resource. Removing or restructuring it can also force an instance replacement.
Before every infrastructure deployment, inspect the diff and stop if an
additive change unexpectedly modifies or replaces EC2, RDS, or the application
secret:

```bash
pnpm --filter infra run diff --profile scouts-cluj
```

The real values in `scoutscluj/production/app` are maintained in Secrets
Manager. Do not add manually configured values to the CDK
`GenerateSecretString.SecretStringTemplate` after the secret exists: changing
that template creates a new secret version and can overwrite runtime values.
CDK should define only safe generated defaults and the application should read
the current secret version at deployment time.

After an infrastructure deployment, verify the stack output and both public
health endpoints:

```bash
aws cloudformation describe-stacks \
  --stack-name ScoutsClujEc2RdsProductionStack \
  --profile scouts-cluj \
  --region eu-central-1

curl --fail https://resurse.scoutscluj.ro/health
curl --fail https://resurse.scoutscluj.ro/api/health
```

## GitHub Actions Boundary

GitHub Actions should:

1. Build and test the monorepo.
2. Build ARM64 API and web images.
3. Push images to the CDK-created ECR repositories.
4. Use the optional GitHub OIDC deploy role to run an SSM deploy command on the
   EC2 host.
5. Run database migrations before or during the application restart.

The CDK stack creates the GitHub OIDC deploy role for the repository configured
by `githubRepository`.

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

## Runtime Logs

### NETOPIA IPN verification

The application secret `scoutscluj/production/app` must contain
`NETOPIA_IPN_PUBLIC_KEY`, the public RSA PEM confirmed by NETOPIA for both
SANDBOX and LIVE. Update only this field, preserving the existing secret values.
The deploy script converts multiline PEM to literal `\n` before writing the
Docker API env-file; the API reconstructs newlines. The key is not passed to the
web container or used to initiate payments. API keys and POS signatures remain
in the existing encrypted payment configurations. Caddy removes the
`Verification-Token` header from access logs without removing it from requests
forwarded to the API.

### Membership checkout origins

The deployment writes `MEMBERSHIP_WEB_ORIGIN=WEB_ORIGIN` and
`MEMBERSHIP_API_ORIGIN=PUBLIC_API_BASE_URL` into the API runtime. Both payment
providers need these addresses to construct return/notification URLs. Missing
origins previously prevented requests from reaching Stripe/NETOPIA and left a
checkout awaiting financial review. The adapters also fall back to the existing
public origin settings. A proven local configuration failure or explicit API
rejection closes the attempt as failed with an audit entry; network timeouts and
uncertain responses still require reconciliation. Stripe submissions carry the
checkout ID as an idempotency key. NETOPIA sandbox hosted URLs may use the exact
domain `secure-sandbox.netopia-payments.com`; this is distinct from its API host
`secure.sandbox.netopia-payments.com` and is explicitly allowed.

After deployment, verify hosted URL creation separately for Stripe test and
NETOPIA sandbox without entering a card or making a charge. Expire disposable
Stripe test sessions after the check. Keep provider switching separate from
existing attempts: those remain attached to their original provider/environment.


Production runtime logs are sent to CloudWatch Logs through Docker's `awslogs`
logging driver. CDK creates one log group per runtime container:

- `/scoutscluj/production/api`
- `/scoutscluj/production/web`
- `/scoutscluj/production/caddy`

The API and web containers are configured by `deploy/ec2-deploy.sh` on every
deployment. The deploy script also rewrites the Caddyfile and recreates the
Caddy container so existing EC2 hosts receive the CloudWatch log driver without
waiting for EC2 user data to rerun.

Tail logs with:

```bash
aws logs tail /scoutscluj/production/api --region eu-central-1 --follow
aws logs tail /scoutscluj/production/web --region eu-central-1 --follow
aws logs tail /scoutscluj/production/caddy --region eu-central-1 --follow
```

When a container uses the `awslogs` driver, `docker logs` may not be available
from the EC2 host. Use CloudWatch Logs as the source of truth for production
runtime logs.

Caddy access logs are enabled for proxied requests. The Caddyfile redacts common
OAuth query parameters and sensitive request headers before logs are shipped.

Set this GitHub Actions repository variable after the CDK stack creates the
deploy role:

```text
AWS_DEPLOY_ROLE_ARN=arn:aws:iam::<account-id>:role/<github-deploy-role>
```

Deploy the stack from this repository with:

```bash
pnpm infra:deploy
```

For a fork or a different deployment repository, override `githubRepository`
when running `synth`, `diff`, and `deploy`.

The app secret must contain real Orgo login credentials before the first deployment. Add
`ORGO_API_TOKEN` when Orgo issues a scoped server-to-server token; until then the value may be
an empty string. The roster synchronization adapter prefers this token and sends it only in the
server-side `Api-Token` header. It falls back to a delegated credential, whose permissions may be
insufficient for an administrative roster read:

The shared ORGO adapter can use a read-only API token for member discovery and
other API reads; it does not grant national payment write-back permissions.
With a server API token, `ORGO_LOCAL_CENTER_ID` is required before roster reads
to avoid retrieving members across the national tenant. Set it to the confirmed center ID and optionally
`ORGO_LOCAL_CENTER_NAME` to its ORGO display name in the existing app secret,
preserving the remaining fields. Deployment injects both into the API container.
The roster requests `localCenter=<id>` and follows all `hydra:next` pages, then
verifies each member's center ID locally. Incomplete or looping pagination fails
before any obligation is changed. Do not assume `pagination=false` returns all
members: the production tenant still returns 50-item pages.

The web container receives `ORIGIN` from `WEB_ORIGIN`, explicitly pinning the
public HTTPS origin behind Caddy. Membership forms use `Referrer-Policy:
same-origin` so browser POSTs retain their origin for SvelteKit's CSRF validation
while external payment-provider navigations receive no referrer. Using
`no-referrer` on this form page caused browsers to submit `Origin: null` and
receive `Cross-site POST form submissions are forbidden`; CSRF checks remain
enabled. After rollout, verify a browser lookup form and confirm a POST with an
unrelated Origin is still rejected with HTTP 403.

```bash
aws secretsmanager update-secret \
  --secret-id scoutscluj/production/app \
  --secret-string '{"AUTH_SESSION_SECRET":"...","ORGO_OAUTH_BASE_URL":"https://membri.scout.ro","ORGO_OAUTH_CLIENT_ID":"...","ORGO_OAUTH_CLIENT_SECRET":"...","ORGO_API_TOKEN":"","PUBLIC_API_BASE_URL":"https://resurse.scoutscluj.ro","PUBLIC_APP_VERSION":"0.0.0","PUBLIC_COMMIT_HASH":"unknown","WEB_ORIGIN":"https://resurse.scoutscluj.ro","WEB_ORIGINS":"https://resurse.scoutscluj.ro","ORGO_OAUTH_REDIRECT_URI":"https://resurse.scoutscluj.ro/api/orgo/callback"}'
```

The service worker is served by the SvelteKit web container at
`/service-worker.js`. Caddy should allow it to revalidate normally; do not add
long-lived custom cache headers for that file. Static icons and the manifest can
use normal static asset caching.

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
