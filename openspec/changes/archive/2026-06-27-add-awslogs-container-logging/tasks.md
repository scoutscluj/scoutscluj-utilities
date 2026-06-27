# Tasks

## 1. Infrastructure

- [x] Add CloudWatch Log Groups for API, web, and Caddy containers.
- [x] Set an explicit retention period for each log group.
- [x] Grant the EC2 host role permission to create log streams and publish log
      events to the service log groups.
- [x] Expose or derive log group names for the EC2 bootstrap and deploy script.

## 2. Runtime Logging

- [x] Configure the API container to use Docker's `awslogs` log driver.
- [x] Configure the web container to use Docker's `awslogs` log driver.
- [x] Configure the Caddy container to use Docker's `awslogs` log driver.
- [x] Add Caddy access logging to stdout.
- [x] Preserve local `docker logs` usefulness where Docker supports it, or
      document any limitation introduced by the selected logging driver.

## 3. Documentation

- [x] Document how to view and tail production logs in CloudWatch Logs.
- [x] Document the one-time rollout path for updating Caddy logging on an
      existing EC2 host if user data does not rerun automatically.
- [x] Document sensitive data that must not be emitted to logs.

## 4. Verification

- [x] Run infra typecheck.
- [x] Run CDK synth and confirm log groups and IAM permissions are present.
- [ ] Deploy to AWS or run an equivalent SSM command in production.
- [ ] Confirm API, web, and Caddy log events appear in CloudWatch Logs.
- [x] Run OpenSpec validation.
