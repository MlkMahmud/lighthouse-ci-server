import { HttpApi } from "@aws-cdk/aws-apigatewayv2-alpha";
import { HttpLambdaIntegration } from "@aws-cdk/aws-apigatewayv2-integrations-alpha";
import { App, CfnOutput, Duration, RemovalPolicy, Stack, StackProps } from "aws-cdk-lib";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { DockerImageCode, DockerImageFunction, FileSystem as LambdaFileSystem } from "aws-cdk-lib/aws-lambda";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import path from "path";

class MainStack extends Stack {
  constructor(scope: App, id: string, props: StackProps) {
    super(scope, id, props);

    const vpc = new Vpc(this, "vpc", {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: "public",
          subnetType: SubnetType.PUBLIC
        },
        {
          name: "private",
          subnetType: SubnetType.PRIVATE_ISOLATED,
        }
      ],
    })

    const fileSystem = new FileSystem(this, "file-system", {
      encrypted: true,
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const accessPoint = fileSystem.addAccessPoint("file-system-access-point", {
      createAcl: {
        ownerGid: '1000',
        ownerUid: '1000',
        permissions: '0777'
      },
      path: '/efs',
      posixUser: {
        gid: '1000',
        uid: '1000',
      },
    });

    const defaultLambdaFn = new DockerImageFunction(this, "lambda", {
      allowAllOutbound: true,
      code: DockerImageCode.fromImageAsset(path.join(__dirname, "..")),
      filesystem: LambdaFileSystem.fromEfsAccessPoint(accessPoint, "/mnt/lhci"),
      logRetention: RetentionDays.ONE_DAY,
      memorySize: 256,
      timeout: Duration.seconds(15),
      vpc,
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED },
    });


    const api = new HttpApi(this, "api", {
      defaultIntegration: new HttpLambdaIntegration("default-lambda-integration", defaultLambdaFn),
    });

    new CfnOutput(this, 'API Gateway URL', {
      value: api.url as string,
    });
  }
}

const app = new App();
new MainStack(app, "lighthouse-ci-server", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});