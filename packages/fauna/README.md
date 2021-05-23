<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank">
   <img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="./logo.svg" />
   <h3 align="center"><b>Fauna Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/canary.yml/badge.svg" alt="Build Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/fauna-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/fauna-adapter" alt="@next-auth/fauna-adapter Version" />
   </p>
</p>

## Overview

This is the Fauna Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find the Fauna schema and seed information in the docs at [next-auth.js.org/schemas/fauna](https://next-auth.js.org/schemas/fauna).

## Getting Started

1. Install `next-auth` and `@next-auth/fauna-adapter`

```js
npm install next-auth @next-auth/fauna-adapter
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import * as Fauna from "faunadb"
import { FaunaAdapter } from "@next-auth/fauna-adapter"

const client = new Fauna.Client({
  secret: "secret",
  scheme: "http",
  domain: "localhost",
  port: 8443,
})

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
  adapter: FaunaAdapter({ faunaClient: client})
  ...
})
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please first read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/canary/CONTRIBUTING.md).

## License

ISC
