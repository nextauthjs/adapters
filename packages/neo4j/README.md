<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="./logo.svg" />
   <h3 align="center"><b>Neo4j Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/canary.yml/badge.svg" alt="Canary CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/neo4j-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/neo4j-adapter" alt="@next-auth/neo4j-adapter Version" />
   </p>
</p>

## Overview

This is the Neo4j Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

## Getting Started

1. Install `next-auth` and `@next-auth/neo4j-adapter`

```js
npm install next-auth @next-auth/neo4j-adapter
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import neo4j from "neo4j-driver"
import { Neo4jAdapter } from "@next-auth/neo4j-adapter"

// Setup your neo4j driver instance
const driver = neo4j.driver(
  "bolt://localhost",
  neo4j.auth.basic("neo4j", "password")
)
const neo4jSession = driver.session()

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
  adapter: Neo4jAdapter(neo4jSession),
  // ...
})
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please first read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/canary/CONTRIBUTING.md).

## License

ISC
