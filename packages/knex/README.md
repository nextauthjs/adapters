<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="./logo.svg" />
   <h3 align="center"><b>Knex Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/knex-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/knex-adapter" alt="@next-auth/knex-adapter Version" />
   </p>
</p>

## Overview

This is the Knex Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package. With the Knex Adapter, you can persist your next-auth data in any SQL flavoured database. See the [Knex.js](https://github.com/knex/knex) repository for more information.

You can find the Knex schema in the docs at [next-auth.js.org/adapters/knex](https://next-auth.js.org/adapters/knex).

## Getting Started

1. Install `next-auth` and `@next-auth/knex-adapter`

```js
npm install next-auth @next-auth/knex-adapter
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import { KnexAdapter } from "@next-auth/knex-adapter"
// TODO
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
