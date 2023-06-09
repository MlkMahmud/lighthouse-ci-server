import { App, CfnOutput, Duration, Stack, StackProps } from "aws-cdk-lib";
import { LambdaRestApi } from "aws-cdk-lib/aws-apigateway";
import { SubnetType, Vpc } from "aws-cdk-lib/aws-ec2";
import { FileSystem } from "aws-cdk-lib/aws-efs";
import { Architecture, Runtime, FileSystem as LambdaFileSystem, DockerImageFunction, DockerImageCode } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
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
      vpcSubnets: { subnetType: SubnetType.PRIVATE_ISOLATED }
    });

    const accessPoint = fileSystem.addAccessPoint("file-system-access-point", {
      createAcl: {
        ownerGid: '1001',
        ownerUid: '1001',
        permissions: '750'
      },
      path: '/',
      posixUser: {
        gid: '1001',
        uid: '1001'
      }
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

    const api = new LambdaRestApi(this, "api", {
      handler: defaultLambdaFn,
      proxy: true,
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