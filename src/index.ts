import { APIGatewayProxyEvent, Context } from "aws-lambda";
import serverless, { Handler } from "serverless-http";
// @ts-ignore
import { createApp } from "@lhci/server";

let handler: Handler;

export async function main(event: APIGatewayProxyEvent, context: Context) {
  try {
    if (!handler) {
      const { app } = createApp({
        storage: {
          storageMethod: 'sql',
          sqlDialect: 'sqlite',
          sqlDatabasePath: '/mtn/lhci/db.sql',
        },
      });
      handler = serverless(app, { binary: ["image/*", "font/*"] });
    }
    const response = await handler(event, context);
    return response;
  } catch (err: any) {
    console.error(err);
    return {
      body: JSON.stringify({ message: err.message || 'Internal server error' }),
      headers: { 'content-type': 'application/json' },
      statusCode: 500,
    };
  }
}
