<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="https://raw.githubusercontent.com/nextauthjs/adapters/main/packages/mikro-orm/logo.svg" />
   <h3 align="center"><b>Mikro ORM Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <a href="https://www.npmjs.com/package/@next-auth/mikro-orm-adapter" target="_blank"><img src="https://img.shields.io/bundlephobia/minzip/@next-auth/mikro-orm-adapter/next" alt="Bundle Size"/></a>
      <a href="https://www.npmjs.com/package/@next-auth/mikro-orm-adapter" target="_blank"><img src="https://img.shields.io/npm/v/@next-auth/mikro-orm-adapter/next" alt="@next-auth/mikro-orm-adapter Version" /></a>
   </p>
</p>

## Overview

This is the Mikro ORM Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find the Prisma schema in the docs at [next-auth.js.org/adapters/mikro-orm](https://next-auth.js.org/adapters/mikro-orm).

## Getting Started

1. Install `next-auth@beta` and `@next-auth/mikro-orm-adapter@next`

   ```js
   npm install next-auth@beta @next-auth/mikro-orm-adapter@next
   ```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

   ```typescript
   import NextAuth from "next-auth"
   import { MikroOrmAdapter, Account, Session, User, VerificationToken } from "@next-auth/mikro-orm-adapter"

   const config: Options<PostgreSqlDriver> = {
      entities: [User, Session, Account, VerificationToken],
      ...
   };

   // fetches a global instance of mikro-rom
   const getORM = async () => {
      if (!global.__MikroORM__){
         global.__MikroORM__ = await MikroORM.init(config)
      }
      return global.__MikroORM__;
   };

   // ensures mikro-orm RequestContext exists on the api route
   const withORM = (handler: NextApiHandler) => async (req: NextApiRequest, res: NextApiResponse) => {
      const orm = await getORM();
      return RequestContext.createAsync(orm.em, async () => handler(req, res));
   }

   const handler = async (req: NextApiRequest, res: NextApiResponse) => {

      // For more information on each option (and a full list of options) go to
      // https://next-auth.js.org/configuration/options
      return NextAuth(req, res, {
         // https://next-auth.js.org/configuration/providers
         providers: [],
         // optionally pass extended models as { models: { } }
         adapter: MikroOrmAdapter()
         ...
      })

   }

   export default withORM(handler);
   ```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
