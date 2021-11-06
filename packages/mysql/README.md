<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="https://www.mysql.com/common/logos/logo-mysql-170x115.png" />
   <h3 align="center"><b>Mysql Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/prisma-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/prisma-adapter" alt="@next-auth/prisma-adapter Version" />
   </p>
</p>

## Overview

This is the Mysql Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find the SQL schema in the tests folder.

## Getting Started

1. Install `next-auth` and `@next-auth/mysql-adapter` as well as `mysql2`.

```js
npm install next-auth @next-auth/mysql-adapter mysql2
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import { PrismaAdapter } from "@next-auth/mysql-adapter"
import mysql from "mysql2/promise"

const config: ConnectionOptions = {
  host: "127.0.0.1",
  port: 3306,
  user: "todo",
  password: "todo",
  database: "todo",
}
const connection = mysql.createConnection(config)

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
  adapter: MysqlAdaptor(connection)
  ...
})
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
