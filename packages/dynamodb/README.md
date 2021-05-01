# AWS DynamoDB Adapter

<p align="center">
    <img src="https://i.imgur.com/cRg0uvm.png" alt="AWS Dynamodb + NextAuth.js">
</p>

## Initial Setup

You need a table with as partition key `pk` and as sort key `sk`. Your table also need a global secondary index names `GSI1` with `GSI1PK` as partition key and `GSI1SK` as sorting key. You can set whatever you want as the table name and the billing method.

## Config

You need to pass aws-sdk to the adapter in addition to the tablename.

```JAVASCRIPT
// /pages/api/auth/[...nextauth].js

import AWS from "aws-sdk";
import NextAuth from "next-auth";
import Providers from "next-auth/providers";
import { DynamoDBAdapter } from "@next-auth/dynamodb-adapter"

AWS.config.update({
  accessKeyId: process.env.NEXT_AUTH_AWS_ACCESS_KEY,
  secretAccessKey: process.env.NEXT_AUTH_AWS_SECRET_KEY,
  region: process.env.NEXT_AUTH_AWS_REGION,
});

export default NextAuth({
  // Configure one or more authentication providers
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_ID,
      clientSecret: process.env.GITHUB_SECRET,
    }),
    Providers.Email({
      server: process.env.EMAIL_SERVER,
      from: process.env.EMAIL_FROM,
    }),
    // ...add more providers here
  ],
  adapter: DynamoDBAdapter({
    AWS,
    tableName: "next-auth-test",
  }),
  ...
});

```

(AWS secrets start with `NEXT_AUTH_` in order to not conflict with [Vercel's reserved environment variables](https://vercel.com/docs/environment-variables#reserved-environment-variables).)

## Table structure

The table respect the single table strucuture. This has many advantages :

- Only one table to manage, monitor and provisioned
- Querying relation is faster than with multi table schema (if you want to retreive all sessions from an user for example)
- Only one table need to be replicated if you want to be multi-regions

Here is a schema of the table :

<p align="center">
    <img src="https://i.imgur.com/hGZtWDq.png" alt="Table schema">
</p>
