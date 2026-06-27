## ADDED Requirements

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
