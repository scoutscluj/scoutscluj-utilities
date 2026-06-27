# Design: AWSLogs Container Logging

## Context

The production AWS deployment currently uses CDK-managed EC2 plus RDS. GitHub
Actions builds Docker images, pushes them to ECR, then runs
`deploy/ec2-deploy.sh` on the EC2 host through Systems Manager. The API and web
containers are started by the deploy script; the Caddy reverse proxy container is
started from EC2 user data.

The EC2 image already installs `amazon-cloudwatch-agent`, and the host role has
`CloudWatchAgentServerPolicy`, but no agent configuration starts shipping Docker
container logs. Docker's `awslogs` logging driver is a smaller fit for the
current architecture because the application logs are emitted to container
stdout/stderr.

## Goals

- Make production API, web, and Caddy logs visible in CloudWatch Logs.
- Preserve the current single-host EC2 deployment model.
- Keep log configuration in CDK and the existing deploy/bootstrap scripts.
- Use retention settings to avoid unbounded log storage.
- Avoid logging runtime secrets or sensitive authentication values.

## Non-Goals

- ECS task definitions or Fargate services.
- Application performance monitoring.
- Distributed tracing.
- Custom log aggregation infrastructure.
- Full JSON request logging in application code.

## Proposed Approach

CDK provisions one CloudWatch Log Group per runtime service:

- `/scoutscluj/production/api`
- `/scoutscluj/production/web`
- `/scoutscluj/production/caddy`

Each group should use a defined retention period, initially 30 days, and a
retention/removal policy consistent with production operations.

The EC2 host role should be allowed to create log streams and publish log events
to those groups. The existing `CloudWatchAgentServerPolicy` may be retained, but
the Docker `awslogs` driver requires the instance role to have CloudWatch Logs
write permissions for the target groups.

The API and web `docker run` commands in `deploy/ec2-deploy.sh` should add:

- `--log-driver awslogs`
- `--log-opt awslogs-region=<AWS_REGION>`
- `--log-opt awslogs-group=<service-log-group>`
- `--log-opt awslogs-stream=<stable-service-or-container-name>`

The Caddy container should receive the same Docker log options in EC2 user data.
Caddy should also be configured with an access `log` block that writes request
logs to stdout so reverse-proxy traffic reaches the Caddy CloudWatch Log Group.

## Deployment Considerations

The API and web logging changes are applied on the next GitHub Actions
deployment because those containers are recreated by `deploy/ec2-deploy.sh`.

Caddy is currently created from EC2 user data. Updating Caddy logging for an
already-running host may require a one-time SSM command or a deploy-script step
that recreates the Caddy container with the new log driver and refreshed
Caddyfile.

## Security

Logs must not include secrets, OAuth tokens, session cookies, authorization
headers, database URLs, or raw request bodies by default. Caddy access logs
should capture operational request metadata without exposing sensitive headers.
