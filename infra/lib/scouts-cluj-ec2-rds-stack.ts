import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as ecr from "aws-cdk-lib/aws-ecr";
import * as iam from "aws-cdk-lib/aws-iam";
import * as logs from "aws-cdk-lib/aws-logs";
import * as rds from "aws-cdk-lib/aws-rds";
import * as route53 from "aws-cdk-lib/aws-route53";
import * as secretsmanager from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";

export class ScoutsClujEc2RdsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const environmentName = contextString(
      this,
      "environmentName",
      "production",
    );
    const domainName = contextString(this, "domainName", "scoutscluj.ro");
    const appHostName = contextString(
      this,
      "appHostName",
      `resurse.${domainName}`,
    );
    const dbName = contextString(this, "dbName", "scoutscluj_utilities");
    const ec2InstanceType = contextString(this, "ec2InstanceType", "t4g.small");
    const rdsInstanceType = contextString(this, "rdsInstanceType", "t4g.micro");
    const manageDns = contextBoolean(this, "manageDns", true);

    const vpc = new ec2.Vpc(this, "Vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: "public",
          subnetType: ec2.SubnetType.PUBLIC,
        },
        {
          cidrMask: 24,
          name: "database",
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        },
      ],
    });

    const hostSecurityGroup = new ec2.SecurityGroup(this, "HostSecurityGroup", {
      vpc,
      allowAllOutbound: true,
      description: "Allows public HTTPS/HTTP to the EC2 reverse proxy only.",
    });
    hostSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));
    hostSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(443));

    const databaseSecurityGroup = new ec2.SecurityGroup(
      this,
      "DatabaseSecurityGroup",
      {
        vpc,
        allowAllOutbound: true,
        description: "Allows Postgres access only from the app host.",
      },
    );
    databaseSecurityGroup.addIngressRule(
      hostSecurityGroup,
      ec2.Port.tcp(5432),
      "Postgres from the EC2 app host",
    );

    const appSecret = new secretsmanager.Secret(this, "ApplicationSecret", {
      secretName: `scoutscluj/${environmentName}/app`,
      description: "Runtime configuration for Scouts Cluj Utilities.",
      generateSecretString: {
        generateStringKey: "AUTH_SESSION_SECRET",
        passwordLength: 64,
        excludePunctuation: true,
        secretStringTemplate: JSON.stringify({
          ORGO_OAUTH_BASE_URL: "https://membri.scout.ro",
          ORGO_OAUTH_CLIENT_ID: "replace-me",
          ORGO_OAUTH_CLIENT_SECRET: "replace-me",
          PUBLIC_API_BASE_URL: `https://${appHostName}`,
          WEB_ORIGIN: `https://${appHostName}`,
          WEB_ORIGINS: `https://${appHostName}`,
          ORGO_OAUTH_REDIRECT_URI: `https://${appHostName}/api/orgo/callback`,
          KEEZ_DOCUMENT_EMAIL_EXPECTED_SENDER: "cluj.napoca@scout.ro",
          KEEZ_DOCUMENT_EMAIL_RECIPIENT: "cui@keez.ro",
          FINANCE_GMAIL_CLIENT_ID: "replace-me",
          FINANCE_GMAIL_CLIENT_SECRET: "replace-me",
          FINANCE_GMAIL_REFRESH_TOKEN: "replace-me",
          FINANCE_GMAIL_SENDER_EMAIL: "cluj.napoca@scout.ro",
        }),
      },
    });
    appSecret.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const databaseSecret = new secretsmanager.Secret(this, "DatabaseSecret", {
      secretName: `scoutscluj/${environmentName}/database`,
      description: "RDS credentials for Scouts Cluj Utilities.",
      generateSecretString: {
        generateStringKey: "password",
        passwordLength: 30,
        excludeCharacters: " %+~`#$&*()|[]{}:;<>?!'/@\"\\",
        secretStringTemplate: JSON.stringify({ username: "scoutscluj" }),
      },
    });
    databaseSecret.applyRemovalPolicy(RemovalPolicy.RETAIN);

    const database = new rds.DatabaseInstance(this, "Database", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_ISOLATED },
      securityGroups: [databaseSecurityGroup],
      engine: rds.DatabaseInstanceEngine.postgres({
        version: rds.PostgresEngineVersion.of("16.14", "16"),
      }),
      instanceType: new ec2.InstanceType(rdsInstanceType),
      databaseName: dbName,
      credentials: rds.Credentials.fromSecret(databaseSecret),
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      storageEncrypted: true,
      storageType: rds.StorageType.GP3,
      backupRetention: Duration.days(7),
      deletionProtection: true,
      publiclyAccessible: false,
      multiAz: false,
      autoMinorVersionUpgrade: true,
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const apiRepository = new ecr.Repository(this, "ApiRepository", {
      repositoryName: "scoutscluj/api",
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 20 }],
    });
    const webRepository = new ecr.Repository(this, "WebRepository", {
      repositoryName: "scoutscluj/web",
      imageScanOnPush: true,
      removalPolicy: RemovalPolicy.RETAIN,
      lifecycleRules: [{ maxImageCount: 20 }],
    });
    const apiLogGroup = createServiceLogGroup(this, environmentName, "api");
    const webLogGroup = createServiceLogGroup(this, environmentName, "web");
    const caddyLogGroup = createServiceLogGroup(
      this,
      environmentName,
      "caddy",
    );

    const hostRole = new iam.Role(this, "HostRole", {
      assumedBy: new iam.ServicePrincipal("ec2.amazonaws.com"),
      managedPolicies: [
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "AmazonSSMManagedInstanceCore",
        ),
        iam.ManagedPolicy.fromAwsManagedPolicyName(
          "CloudWatchAgentServerPolicy",
        ),
      ],
    });
    apiRepository.grantPull(hostRole);
    webRepository.grantPull(hostRole);
    appSecret.grantRead(hostRole);
    databaseSecret.grantRead(hostRole);
    apiLogGroup.grantWrite(hostRole);
    webLogGroup.grantWrite(hostRole);
    caddyLogGroup.grantWrite(hostRole);

    const userData = ec2.UserData.forLinux();
    userData.addCommands(
      "set -euxo pipefail",
      "dnf update -y",
      "dnf install -y docker git jq amazon-cloudwatch-agent",
      "command -v aws >/dev/null 2>&1 || dnf install -y awscli || dnf install -y awscli-2",
      "systemctl enable --now docker",
      "usermod -aG docker ec2-user",
      "mkdir -p /opt/scoutscluj/caddy/data /opt/scoutscluj/caddy/config /opt/scoutscluj/deploy",
      renderCaddyfile(appHostName),
      renderCaddyDockerRun({
        caddyLogGroupName: caddyLogGroup.logGroupName,
        region: this.region,
      }),
    );

    const host = new ec2.Instance(this, "AppHost", {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
      instanceType: new ec2.InstanceType(ec2InstanceType),
      machineImage: ec2.MachineImage.latestAmazonLinux2023({
        cpuType: ec2.AmazonLinuxCpuType.ARM_64,
      }),
      role: hostRole,
      securityGroup: hostSecurityGroup,
      requireImdsv2: true,
      blockDevices: [
        {
          deviceName: "/dev/xvda",
          volume: ec2.BlockDeviceVolume.ebs(30, {
            encrypted: true,
            volumeType: ec2.EbsDeviceVolumeType.GP3,
          }),
        },
      ],
      userData,
    });

    const elasticIp = new ec2.CfnEIP(this, "AppHostElasticIp", {
      domain: "vpc",
      tags: [{ key: "Name", value: `${id}-app-host` }],
    });
    new ec2.CfnEIPAssociation(this, "AppHostElasticIpAssociation", {
      allocationId: elasticIp.attrAllocationId,
      instanceId: host.instanceId,
    });

    if (manageDns) {
      const zone = hostedZone(this, domainName);
      new route53.ARecord(this, "AppDnsRecord", {
        zone,
        recordName: appHostName,
        target: route53.RecordTarget.fromIpAddresses(elasticIp.attrPublicIp),
      });
    }

    const githubDeployRole = createGithubDeployRole(this, {
      apiRepository,
      host,
      webRepository,
    });

    new CfnOutput(this, "ApplicationUrl", {
      value: `https://${appHostName}`,
    });
    new CfnOutput(this, "AppHostPublicIp", {
      value: elasticIp.attrPublicIp,
    });
    new CfnOutput(this, "SsmSessionCommand", {
      value: `aws ssm start-session --target ${host.instanceId}`,
    });
    new CfnOutput(this, "AppHostInstanceId", {
      value: host.instanceId,
    });
    new CfnOutput(this, "ApiRepositoryUri", {
      value: apiRepository.repositoryUri,
    });
    new CfnOutput(this, "WebRepositoryUri", {
      value: webRepository.repositoryUri,
    });
    new CfnOutput(this, "ApplicationSecretName", {
      value: appSecret.secretName,
    });
    new CfnOutput(this, "DatabaseSecretName", {
      value: databaseSecret.secretName,
    });
    new CfnOutput(this, "DatabaseEndpoint", {
      value: database.dbInstanceEndpointAddress,
    });
    new CfnOutput(this, "ApiLogGroupName", {
      value: apiLogGroup.logGroupName,
    });
    new CfnOutput(this, "WebLogGroupName", {
      value: webLogGroup.logGroupName,
    });
    new CfnOutput(this, "CaddyLogGroupName", {
      value: caddyLogGroup.logGroupName,
    });

    if (githubDeployRole) {
      new CfnOutput(this, "GithubDeployRoleArn", {
        value: githubDeployRole.roleArn,
      });
    }
  }
}

const contextString = (scope: Construct, key: string, fallback: string) =>
  (scope.node.tryGetContext(key) as string | undefined) ?? fallback;

const contextBoolean = (scope: Construct, key: string, fallback: boolean) => {
  const value = scope.node.tryGetContext(key);

  if (value === undefined) {
    return fallback;
  }

  return value === true || value === "true";
};

const serviceLogGroupName = (environmentName: string, serviceName: string) =>
  `/scoutscluj/${environmentName}/${serviceName}`;

const createServiceLogGroup = (
  scope: Construct,
  environmentName: string,
  serviceName: string,
) =>
  new logs.LogGroup(
    scope,
    `${serviceName[0].toUpperCase()}${serviceName.slice(1)}LogGroup`,
    {
      logGroupName: serviceLogGroupName(environmentName, serviceName),
      retention: logs.RetentionDays.ONE_MONTH,
      removalPolicy: RemovalPolicy.RETAIN,
    },
  );

const hostedZone = (scope: Construct, domainName: string) => {
  const hostedZoneId = scope.node.tryGetContext("hostedZoneId") as
    | string
    | undefined;

  if (hostedZoneId) {
    return route53.HostedZone.fromHostedZoneAttributes(scope, "HostedZone", {
      hostedZoneId,
      zoneName: domainName,
    });
  }

  return route53.HostedZone.fromLookup(scope, "HostedZone", {
    domainName,
  });
};

const renderCaddyfile = (
  appHostName: string,
) => `cat > /opt/scoutscluj/Caddyfile <<'EOF'
{
	email admin@scoutscluj.ro
}

${appHostName} {
	encode zstd gzip

	log {
		output stdout
		format filter {
			wrap json
			fields {
				request>uri query {
					delete access_token
					delete code
					delete id_token
					delete refresh_token
					delete state
					delete token
				}
				request>headers>Authorization delete
				request>headers>Cookie delete
				request>headers>Proxy-Authorization delete
				request>headers>Set-Cookie delete
				resp_headers>Set-Cookie delete
			}
		}
	}

	header {
		Strict-Transport-Security "max-age=31536000; includeSubDomains"
		X-Content-Type-Options "nosniff"
		X-Frame-Options "DENY"
		Referrer-Policy "strict-origin-when-cross-origin"
	}

	reverse_proxy /api/* 127.0.0.1:3000
	reverse_proxy 127.0.0.1:3001
}
EOF`;

type CaddyDockerRunProps = {
  caddyLogGroupName: string;
  region: string;
};

const renderCaddyDockerRun = ({
  caddyLogGroupName,
  region,
}: CaddyDockerRunProps) =>
  [
    "docker run -d --name scoutscluj-caddy --restart unless-stopped",
    "--network host",
    "--log-driver awslogs",
    `--log-opt awslogs-region=${region}`,
    `--log-opt awslogs-group=${caddyLogGroupName}`,
    "--log-opt awslogs-stream=scoutscluj-caddy",
    "--log-opt mode=non-blocking",
    "--log-opt max-buffer-size=4m",
    "-v /opt/scoutscluj/Caddyfile:/etc/caddy/Caddyfile:ro",
    "-v /opt/scoutscluj/caddy/data:/data",
    "-v /opt/scoutscluj/caddy/config:/config",
    "caddy:2",
  ].join(" ");

type GithubDeployRoleProps = {
  apiRepository: ecr.Repository;
  host: ec2.Instance;
  webRepository: ecr.Repository;
};

const createGithubDeployRole = (
  scope: Construct,
  { apiRepository, host, webRepository }: GithubDeployRoleProps,
) => {
  const githubRepository = scope.node.tryGetContext("githubRepository") as
    | string
    | undefined;

  if (!githubRepository) {
    return undefined;
  }

  const githubBranch = contextString(scope, "githubBranch", "main");
  const provider = new iam.OpenIdConnectProvider(scope, "GithubOidcProvider", {
    url: "https://token.actions.githubusercontent.com",
    clientIds: ["sts.amazonaws.com"],
  });
  const deployRole = new iam.Role(scope, "GithubDeployRole", {
    assumedBy: new iam.OpenIdConnectPrincipal(provider).withConditions({
      StringEquals: {
        "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
      },
      StringLike: {
        "token.actions.githubusercontent.com:sub": `repo:${githubRepository}:ref:refs/heads/${githubBranch}`,
      },
    }),
    description:
      "Role assumed by GitHub Actions to push images and trigger EC2 deploy commands.",
  });

  apiRepository.grantPullPush(deployRole);
  webRepository.grantPullPush(deployRole);

  deployRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["ecr:GetAuthorizationToken"],
      resources: ["*"],
    }),
  );
  deployRole.addToPolicy(
    new iam.PolicyStatement({
      actions: ["ssm:SendCommand"],
      resources: [
        Stack.of(scope).formatArn({
          service: "ec2",
          resource: "instance",
          resourceName: host.instanceId,
        }),
        Stack.of(scope).formatArn({
          service: "ssm",
          resource: "document",
          resourceName: "AWS-RunShellScript",
          account: "",
        }),
      ],
    }),
  );
  deployRole.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        "cloudformation:DescribeStacks",
        "ec2:DescribeInstances",
        "ssm:DescribeInstanceInformation",
        "ssm:GetCommandInvocation",
      ],
      resources: ["*"],
    }),
  );

  return deployRole;
};
