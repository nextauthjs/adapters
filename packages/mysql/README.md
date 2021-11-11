<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="https://www.mysql.com/common/logos/logo-mysql-170x115.png" />
   <h3 align="center"><b>MySQL Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <a href="https://www.npmjs.com/package/@next-auth/prisma-adapter" target="_blank"><img src="https://img.shields.io/bundlephobia/minzip/@next-auth/prisma-adapter/next" alt="Bundle Size"/></a>
      <a href="https://www.npmjs.com/package/@next-auth/prisma-adapter" target="_blank"><img src="https://img.shields.io/npm/v/@next-auth/prisma-adapter/next" alt="@next-auth/prisma-adapter Version" /></a>
   </p>
</p>

## Overview

This is the Prisma Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find the Prisma schema in the docs at [next-auth.js.org/adapters/prisma](https://next-auth.js.org/adapters/prisma).

## Getting Started

1. Install `next-auth@beta` and `@next-auth/mysql-adapter@next`

```js
npm install next-auth@beta @next-auth/mysql-adapter@next
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import { MysqlAdapter } from "@next-auth/mysql-adapter"
import mysql from "mysql2/promise"

const connection = mysql.createConnection(config)

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
  // https://next-auth.js.org/configuration/providers
  providers: [],
  adapter: MysqlAdapter(connection)
  ...
})
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
