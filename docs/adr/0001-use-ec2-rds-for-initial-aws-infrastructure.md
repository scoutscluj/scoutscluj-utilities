# ADR 0001: Use EC2 And RDS For Initial AWS Infrastructure

## Status

Accepted

## Context

Scouts Cluj Utilities is a small internal application with a SvelteKit web app,
a NestJS API, and PostgreSQL persistence. The first AWS deployment should keep
monthly cost low while staying simple enough to operate through infrastructure
as code and GitHub Actions.

The API does not need a separate public hostname or exposed port. Browser and
Orgo flows still need to reach API routes, so the public web host can proxy
`/api/*` to the API process over localhost.

## Decision

Use AWS CDK to provision one public EC2 app host and one private RDS PostgreSQL
database for the initial AWS environment.

- `resurse.scoutscluj.ro` is the only public application hostname.
- The EC2 security group exposes only ports `80` and `443`.
- The API listens on `127.0.0.1:3000` and is reached through the reverse proxy
  at `https://resurse.scoutscluj.ro/api/*`.
- The web app listens on `127.0.0.1:3001`.
- RDS PostgreSQL is private, single-AZ, encrypted, retained on stack deletion,
  and reachable only from the EC2 app host.
- GitHub Actions owns build, image publishing, migrations, and deploy commands.
- CDK owns AWS infrastructure: VPC, security groups, EC2, RDS, ECR, secrets,
  DNS, and IAM.

## Consequences

The initial bill is materially lower than a Fargate setup because there is no
Application Load Balancer, NAT Gateway, or second always-on app runtime.

The team must accept light host operations: patching the EC2 instance, watching
disk/memory, and keeping the reverse proxy/Docker runtime healthy. AWS Systems
Manager should be used for host access instead of SSH.

If uptime requirements or operational burden grow, the documented migration path
is to move both app runtimes to ECS Fargate behind an Application Load Balancer
while keeping RDS.
