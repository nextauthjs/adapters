<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img width="150px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>
   <h3 align="center"><b>FaunaDB Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/workflows/Build%20Test/badge.svg" alt="Build Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/faunadb-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/github/v/release/nextauthjs/adapters?include_prereleases" alt="Github Release" />
   </p>
</p>

## Overview

This is the Fauna Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

## Getting Started

1. Install `next-auth` and `@next-auth/faunadb-adapter`
```js
npm install --save-prod next-auth @next-auth/faunadb-adapter
```

2. Add this adapter to your `/src/pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import Adapter from "@next-auth/faunadb-adapter"
import faunadb from "faunadb"

const faunaClient = new faunadb.Client({
  secret: process.env.FAUNADB_SECRET_KEY,
});

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
  adapter: Adapter({faunaClient}),
  ...
})
```

## Options

// TODO

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please first read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/canary/CONTRIBUTING.md).

## License

ISC