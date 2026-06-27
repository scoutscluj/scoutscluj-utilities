## ADDED Requirements

### Requirement: Runtime container logs are centralized in CloudWatch Logs

The production deployment SHALL send API, web, and reverse-proxy container
stdout/stderr logs to CloudWatch Logs.

#### Scenario: API emits a runtime log

- **WHEN** the production API container writes to stdout or stderr
- **THEN** the log event is available in the API CloudWatch Log Group
- **AND** an operator can inspect it without starting an EC2 session

#### Scenario: Web server emits a runtime log

- **WHEN** the production web container writes to stdout or stderr
- **THEN** the log event is available in the web CloudWatch Log Group
- **AND** an operator can inspect it without starting an EC2 session

#### Scenario: Reverse proxy emits a runtime log

- **WHEN** the production Caddy container writes to stdout or stderr
- **THEN** the log event is available in the Caddy CloudWatch Log Group
- **AND** an operator can inspect it without starting an EC2 session

### Requirement: CloudWatch log storage is bounded

The production deployment SHALL configure explicit retention for application
CloudWatch Log Groups.

#### Scenario: CDK synthesizes logging resources

- **WHEN** an operator runs the infra synth command
- **THEN** the synthesized template includes API, web, and Caddy CloudWatch Log
  Groups
- **AND** each log group has a configured retention period

### Requirement: Docker publishes container logs with awslogs

The EC2 deployment SHALL start runtime containers with Docker's `awslogs`
logging driver.

#### Scenario: API and web containers are deployed

- **WHEN** GitHub Actions runs the EC2 deployment script
- **THEN** the API container is started with the `awslogs` log driver configured
  for the API log group
- **AND** the web container is started with the `awslogs` log driver configured
  for the web log group

#### Scenario: Caddy container is started

- **WHEN** the EC2 host starts or the reverse-proxy container is recreated
- **THEN** the Caddy container is started with the `awslogs` log driver
  configured for the Caddy log group

### Requirement: Reverse-proxy access logs are available

The production reverse proxy SHALL emit access logs for proxied HTTP requests to
its configured container log stream.

#### Scenario: User requests the web application

- **WHEN** a user opens `https://resurse.scoutscluj.ro`
- **THEN** Caddy emits an access log event for the request
- **AND** the event is available in the Caddy CloudWatch Log Group

#### Scenario: Browser calls an API route

- **WHEN** the browser calls `https://resurse.scoutscluj.ro/api/health`
- **THEN** Caddy emits an access log event for the proxied API request
- **AND** the event is available in the Caddy CloudWatch Log Group

### Requirement: Sensitive runtime values are not logged

The production logging configuration SHALL avoid emitting secrets, credentials,
OAuth tokens, session cookies, authorization headers, database URLs, or raw
request bodies by default.

#### Scenario: Operator reviews production logs

- **WHEN** an operator inspects API, web, or Caddy CloudWatch log events
- **THEN** the logs do not include runtime secret values from Secrets Manager
- **AND** the logs do not include session cookies or OAuth tokens
