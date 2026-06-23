# Change: Add AWS EC2 And RDS Infrastructure

## Why

Scouts Cluj Utilities needs a first AWS deployment target managed as
infrastructure as code. The target should keep cost low for an internal
application while preserving a managed PostgreSQL database and a clear path to a
future ECS Fargate deployment.

## What Changes

- Add a CDK TypeScript package for AWS infrastructure.
- Provision one EC2 host for the SvelteKit web app, NestJS API, and reverse
  proxy.
- Provision one private RDS PostgreSQL database.
- Expose only `resurse.scoutscluj.ro` publicly.
- Keep the API port private to the EC2 host and route `/api/*` through the
  reverse proxy.
- Create ECR repositories, Secrets Manager secrets, Route53 DNS, and IAM roles
  needed for GitHub Actions deployment orchestration.
- Document the future Fargate option for later migration.

## Out Of Scope

- Implementing the GitHub Actions workflow.
- Implementing Dockerfiles or app deployment scripts.
- Creating a separate public API domain.
- Running PostgreSQL directly on EC2.

## Impact

This establishes the AWS deployment boundary for future feature work and
replaces Railway as the intended production target. It introduces light EC2 host
operations while keeping the database managed by RDS.
