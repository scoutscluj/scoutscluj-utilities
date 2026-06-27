# Tasks

## 1. Infrastructure As Code

- [x] Add a CDK TypeScript workspace package.
- [x] Add root scripts for CDK synth, diff, and deploy.
- [x] Define VPC, EC2, RDS, security groups, ECR, secrets, DNS, and IAM.
- [x] Keep public ingress limited to HTTP and HTTPS.
- [x] Keep RDS private and accessible only from the app host.

## 2. Deployment Workflow

- [x] Add API and web Dockerfiles for ARM64 EC2 deployment.
- [x] Add a GitHub Actions workflow that builds and pushes ECR images.
- [x] Add a host-side SSM deployment script.
- [x] Run API migrations from the newly built API image before restart.
- [x] Bind API and web containers only to localhost on the EC2 host.

## 3. Documentation

- [x] Document the EC2 plus RDS architecture.
- [x] Document the future Fargate alternative.
- [x] Record the architecture decision.
- [x] Document the GitHub Actions deployment boundary.

## 4. Verification

- [x] Install dependencies and update the lockfile.
- [x] Run infra typecheck.
- [x] Run CDK synth.
- [ ] Run OpenSpec validation if the CLI is available. The CLI is not installed
      in this repository yet.
