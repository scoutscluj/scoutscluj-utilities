# Change: Add AWSLogs Container Logging

## Why

The current AWS deployment runs the API, web app, and Caddy reverse proxy as
Docker containers on a single EC2 host. Their runtime logs are only available
through host-local `docker logs` or as a short deploy-failure tail in GitHub
Actions. Operators need centralized production logs that can be inspected
without opening an EC2 session.

## What Changes

- Add CloudWatch Log Groups for the production API, web, and Caddy containers.
- Route Docker stdout/stderr from each runtime container to CloudWatch Logs
  using Docker's `awslogs` log driver.
- Configure Caddy access logging so proxied HTTP requests are visible in
  CloudWatch.
- Ensure the EC2 host role has the permissions required to publish log events.
- Document how operators can view and tail production logs.

## Out Of Scope

- Migrating the deployment to ECS/Fargate.
- Adding external observability products.
- Adding distributed tracing, metrics dashboards, or alerting.
- Replacing the NestJS logger or adding full application-level structured
  logging.
- Logging secrets, OAuth tokens, session cookies, or raw authorization headers.

## Impact

This keeps the current low-cost EC2 deployment model while making production
runtime logs available in CloudWatch Logs. It adds small CloudWatch ingestion and
retention costs and gives operators a practical path to debug API, web, and
reverse-proxy failures after deployment.
