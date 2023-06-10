import { APIGatewayProxyEvent, Context } from "aws-lambda";
import serverless, { Handler } from "serverless-http";
import fs from "fs";
// @ts-ignore
import { createApp } from "@lhci/server";

let handler: Handler;

export async function main(event: APIGatewayProxyEvent, context: Context) {
  try {
    fs.access("/mnt/lhci/", fs.constants.W_OK | fs.constants.R_OK | fs.constants.F_OK, (err) => {
      if (err) {
        console.error(err);
        console.error("NO ACCESS!");
      } else {
        console.log("ACCESS OK!!");
      }
    })
    if (!handler) {
      const { app } = await createApp({
        storage: {
          storageMethod: 'sql',
          sqlDialect: 'sqlite',
          sqlDatabasePath: '/mnt/lhci/db.sql',
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
