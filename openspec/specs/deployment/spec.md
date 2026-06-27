# deployment Specification

## Purpose
TBD - created by archiving change add-aws-ec2-rds-infrastructure. Update Purpose after archive.
## Requirements
### Requirement: AWS infrastructure is managed by CDK

The system SHALL define the initial AWS infrastructure in a TypeScript CDK
package.

#### Scenario: Synthesizing infrastructure

- **WHEN** an operator runs the infra synth command
- **THEN** CDK produces a CloudFormation template for the AWS infrastructure

### Requirement: Public traffic uses a single web hostname

The deployed application SHALL be publicly reachable at
`resurse.scoutscluj.ro`.

#### Scenario: User opens the app

- **WHEN** a user opens `https://resurse.scoutscluj.ro`
- **THEN** the request reaches the EC2 reverse proxy over HTTPS
- **AND** the reverse proxy forwards web requests to the SvelteKit process

### Requirement: API port is not directly exposed

The API SHALL NOT expose its process port directly to the internet.

#### Scenario: Browser calls an API route

- **WHEN** the browser calls `https://resurse.scoutscluj.ro/api/health`
- **THEN** the reverse proxy forwards the request to the API over localhost
- **AND** no public security group rule exposes port `3000`

### Requirement: PostgreSQL is managed by RDS

The production database SHALL run on a private RDS PostgreSQL instance.

#### Scenario: API connects to the database

- **WHEN** the API uses its configured database URL
- **THEN** the connection targets the private RDS endpoint
- **AND** RDS accepts traffic only from the EC2 app host security group

### Requirement: Deployment orchestration stays in GitHub Actions

CDK SHALL NOT build application artifacts, push images, run migrations, or
restart application services.

#### Scenario: A new version is released

- **WHEN** a new application version is deployed
- **THEN** GitHub Actions builds images, pushes them to ECR, runs migrations, and
  restarts services through AWS Systems Manager

### Requirement: Database migrations run before API restart

The deployment workflow SHALL run pending API database migrations from the newly
built API image before replacing the running API container.

#### Scenario: A deployment includes a new migration

- **WHEN** GitHub Actions deploys a new commit
- **THEN** the EC2 deploy script runs `node apps/api/dist/migrate.js` using the
  new API image
- **AND** the API container is restarted only after migrations succeed

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

