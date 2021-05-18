<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img width="150px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>
   <h3 align="center"><b>TypeORM (Legacy) Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/workflows/Build%20Test/badge.svg" alt="Build Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/typeorm-legacy-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/github/v/release/nextauthjs/adapters?include_prereleases" alt="Github Release" />
   </p>
</p>

## Overview

This is the TypeORM Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

## Getting Started

1. Install `next-auth` and `@next-auth/typeorm-legacy-adapter`

```js
npm install next-auth @next-auth/typeorm-legacy-adapter
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import Adapter from "@next-auth/typeorm-legacy-adapter"

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
  adapters: Adapter({
    type: 'sqlite',  // or mysql, postgresql, mssql
    database: ':memory:',
    synchronize: true
  }),
  ...
})
```

> The `synchronize` option in TypeORM will generate SQL that exactly matches the documented schemas for MySQL and Postgres.
>
> However, it should not be enabled against production databases as it may cause data loss if the configured schema does not match the expected schema!

## Options

This adapter supports MySQL, PostgreSQL, sqlite, as well as MsSQL. Further configuration options are listed below.

### sqlite

With sqlite, you have the option of using a file on disk as the database, or using a temporary in-memory database. In the `database` field you can either pass in a valid file path to the on-disk database you want to use, or simply write `:memory:` for an in-memory database which will disappear whenever you restart the process.

### MySQL

For MySQL, simply pass a valid connection string to the `database` option, such as `mysql://nextauth:password@127.0.0.1:3306/nextauth?synchronise=true`, and do not forget to set the `type` value to `mysql`.

Schema: [next-auth.js.org/schemas/mysql](https://next-auth.js.org/schemas/mysql)

### PostgreSQL

For PostgreSQL, you also only need to pass a valid connection string to the `database` option, such as `postgres://nextauth:password@127.0.0.1:5432/nextauth`, and do not forget to set the `type` value to `postgres`.

Schema: [next-auth.js.org/schemas/postgres](https://next-auth.js.org/schemas/postgres)

### MsSQL

For MsSQL, pass a valid connection string to the `database` option, such as `mssql://nextauth:password@127.0.0.1:1433/nextauth`, and do not forget to set the `type` value to `mssql`.

Schema: [next-auth.js.org/schemas/mssql](https://next-auth.js.org/schemas/mssql)

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please first read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/canary/CONTRIBUTING.md).

## License

ISC
