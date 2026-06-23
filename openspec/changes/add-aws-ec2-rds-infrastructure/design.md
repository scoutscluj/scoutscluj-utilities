# Design: AWS EC2 And RDS Infrastructure

## Context

The repository contains a SvelteKit web app, a NestJS API, and PostgreSQL via
MikroORM. Deployment orchestration should live in GitHub Actions; CDK should own
only AWS infrastructure.

The API does not need a separate public port or hostname. It still needs public
HTTP reachability under the web domain because browser login redirects and Orgo
callbacks use `/api/*` routes.

## Goals

- Keep the first production-like AWS environment inexpensive.
- Use managed PostgreSQL through RDS.
- Expose a single public hostname: `resurse.scoutscluj.ro`.
- Avoid public SSH and use Systems Manager Session Manager for host access.
- Keep a documented path to ECS Fargate.

## Non-Goals

- High availability across multiple app hosts.
- Multi-AZ RDS in the first environment.
- Public API subdomain.
- NAT Gateway.
- Application Load Balancer.

## Infrastructure

CDK provisions:

- VPC with public subnets and isolated database subnets.
- EC2 `t4g.small` app host in a public subnet.
- Public Elastic IP attached to the app host.
- Route53 `A` record for `resurse.scoutscluj.ro`.
- EC2 security group allowing only `80` and `443` from the internet.
- RDS PostgreSQL `db.t4g.micro` in isolated subnets.
- RDS security group allowing `5432` only from the EC2 host security group.
- ECR repositories for API and web images.
- Secrets Manager secret for app runtime values.
- IAM role for EC2 with SSM, CloudWatch Agent, ECR pull, and secret read access.
- Optional GitHub Actions OIDC role for ECR push and SSM deploy commands.

## Runtime Routing

Caddy terminates TLS on the EC2 host:

- `https://resurse.scoutscluj.ro/api/*` proxies to `127.0.0.1:3000`.
- Other requests proxy to `127.0.0.1:3001`.

The API process should bind only to localhost. The web process should also bind
only to localhost. No direct API port is opened on the EC2 security group.

## Deployment Boundary

GitHub Actions is responsible for:

- build and verification,
- container image build,
- ECR push,
- database migrations,
- app restart on EC2 through SSM.

CDK does not build app images or run migrations.

## Future Fargate Path

A later Fargate stack should reuse RDS and ECR, then replace the EC2 host with:

- ECS cluster,
- one web Fargate service,
- one API Fargate service,
- Application Load Balancer,
- listener rules for `/api/*` and web traffic,
- ACM certificate,
- CloudWatch logs per service.

The main trade-off is cost versus operations: Fargate adds an always-on load
balancer and managed service runtime but removes most host patching and Docker
runtime management.
