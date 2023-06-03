import { App, Stack, StackProps } from "aws-cdk-lib";
import { Construct } from "constructs";

class MainStack extends Stack {
  constructor(scope: Construct, id: string, props: StackProps) {
    super(scope, id, props);
  }
}

const app = new App();
new MainStack(app, "lighthouse-ci-server", {
  env: { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION }
});