<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="https://raw.githubusercontent.com/nextauthjs/adapters/canary/packages/prisma/logo.svg" />
   <h3 align="center"><b>Prisma Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/canary.yml/badge.svg" alt="Canary CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/prisma-adapter/canary" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/prisma-adapter/canary" alt="@next-auth/prisma-adapter Version" />
   </p>
</p>

## Overview

This is the Prisma Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find the Prisma schema in the docs at [next-auth.js.org/adapters/prisma](https://next-auth.js.org/adapters/prisma).

## Getting Started

1. Install `next-auth` and `@next-auth/prisma-adapter@canary`

```js
npm install next-auth @next-auth/prisma-adapter@canary
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import { PrismaAdapter } from "@next-auth/prisma-adapter"
import * as Prisma from "@prisma/client"

const prisma = new Prisma.PrismaClient()

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
  // https://next-auth.js.org/configuration/providers
  providers: [
    Providers.Google({
      clientId: process.env.GOOGLE_ID,
      clientSecret: process.env.GOOGLE_SECRET,
    }),
  ],
  adapter: PrismaAdapter(prisma)
  ...
})
```

## Custom Fields

In order to add custom fields to the database, you must first add them to your Prisma schema file, for example.

```diff
model User {
  id            String    @id @default(cuid())
  name          String?
  email         String?   @unique
  emailVerified DateTime?
  image         String?
> twitter       String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
  accounts      Account[]
  sessions      Session[]
}
```

When running `prisma migrate`, Prisma will create the User table with the above schema in your specified underlying database.

Then, during the first sign-in NextAuth.js will return the simpler prototype user object, but after the first sign-in, NextAuth.js will return the full custom User object, including your custom field and userId, in callbacks such as [`signIn`](https://next-auth.js.org/configuration/callbacks#sign-in-callback).

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please first read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/canary/CONTRIBUTING.md).

## License

ISC
