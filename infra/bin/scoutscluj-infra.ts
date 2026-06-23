#!/usr/bin/env node
import { App } from "aws-cdk-lib";

import { ScoutsClujEc2RdsStack } from "../lib/scouts-cluj-ec2-rds-stack.js";

const app = new App();

new ScoutsClujEc2RdsStack(app, "ScoutsClujEc2RdsProductionStack", {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region:
      (app.node.tryGetContext("region") as string | undefined) ??
      process.env.CDK_DEFAULT_REGION ??
      "eu-central-1",
  },
});
