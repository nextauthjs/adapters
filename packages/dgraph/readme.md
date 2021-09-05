<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="https://cloud.dgraph.io/logo.svg" />
   <h3 align="center"><b>Dgraph Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <!-- <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/prisma-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/prisma-adapter" alt="@next-auth/prisma-adapter Version" />
   </p> -->
</p>

## Overview

This is the Dgraph Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find two Graphql schemas in the [`docs`](https://next-auth.js.org/adapters/dgraph/schema.gql).

1. The unsecure don't implement any auth directive is perfect for a quick start.
2. The second one is more secure and require you replace some value before copy pasting it into your Dgraph console ([`see Securing your database`](#securing-your-database)).

## Getting Started

1. Install `next-auth` and `@next-auth/dgraph-adapter`

```js
npm install next-auth @next-auth/dgraph-adapter
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import { DgraphClient, DgraphAdapter } from "@next-auth/dgraph-adapter/dgraphAdapter";


const dgraph = new DgraphClient({
  endpoint: process.env.DGRAPH_GRAPHQL_ENDPOINT,
  apiKey: process.env.DGRAPH_GRAPHQL_KEY,

  // you can omit the following properties if you are running an unsecure schema
  adminSecret: process.env.DGRAPH_ADMIN_SECRET,
  authHeader: "<YOUR AUTH HEADER>",
  jwtSecret: process.env.SECRET
});

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
  // https://next-auth.js.org/configuration/providers
  providers: [
    ...,
  ],
  adapter: DgraphAdapter(dgraph)
  ...
})
```

## Quick start with the unsecure schema

The simplest way to use Dgraph is by copy pasting the unsecure schema into your dashboard. Then create an api client key and grab your endpoint to initialize your `DgraphClient`. Forget about `adminSecret`, `authHeader` and `jwtSecret`.

## Securing your database

Fore sake of security and mostly if your client directly communicate with the graphql server you obviously want to restrict the access to the types used by next-auth. That's why you see a lot of @auth directive alongide this types in the schema.

#### Dgraph.Authorization

The first thing to do in order to secure your graphql backend is to define the `Dgraph.Authorization` object at the bottom of your schema and provide `adminSecret`, `authHeader` and `jwtSecret` values to the DgraphClient.

```js
# Dgraph.Authorization {"VerificationKey":"<YOUR JWT SECRET HERE>","Header":"<YOUR AUTH HEADER HERE>","Namespace":"YOUR CUSTOM NAMESPACE HERE","Algo":"HS256"}
```

#### VerificationKey and jwtSecret

This is the key you use to sign the JWT. Probably your `process.env.SECRET`.

#### Header and authHeader

The `Header` tells Dgraph where to lookup for a jwt with auth credentials. You have to configure it a te bottom of your schema. This header is the same as the `authHeader` property you provide when you instantiate the DgraphClient.

#### The adminSecret

The admin secret will be pass to a JWT that DgraphClient send with each request. It's allow it to by pass the auth restrictions and interact with the auth types required by next-auth. You have to specify it for each auth rules of each types of your secure schema.

```js
type VerificationRequest
  @auth(
    delete: { rule: "{$adminSecret: { eq: \"<YOUR ADMIN SECRET HERE>\" } }" },
    add: { rule: "{$adminSecret: { eq: \"<YOUR ADMIN SECRET HERE>\" } }" },
    query: { rule: "{$adminSecret: { eq: \"<YOUR ADMIN SECRET HERE>\" } }" },
    update: { rule: "{$adminSecret: { eq: \"<YOUR ADMIN SECRET HERE>\" } }" }
  ) {
 ...
}
```

## Working with JWT session and @auth directive

Dgraph only works with HS256 or RS256 algorithms. If you want to use session jwt to securely interact with your dgraph database you have to customize next-auth encode and decode functions because the default algorithm is HS512. You can there going further and customize the jwt with roles if you want to implement [`RBAC logic`](https://dgraph.io/docs/graphql/authorization/directive/#role-based-access-control) for example.

```js
import * as jwt from "jsonwebtoken";

export default NextAuth({

...

session: {
    jwt: true
  },
jwt: {
    secret: process.env.SECRET,
    encode: async ({ secret, token }) => {
      return jwt.sign({...token, userId: token.id}, secret, {
        algorithm: "HS256",
        expiresIn: 30 * 24 * 60 * 60; // 30 days
      });;
    },
    decode: async ({ secret, token }) => {
      return jwt.verify(token, secret, { algorithms: ["HS256"] });
    }
  },

...

})
```

Once your `Dgraph.Authorization` define in your schema and this JWT settings set, this will allow you to define [`@auth rules`](https://dgraph.io/docs/graphql/authorization/authorization-overview/) for every part of your schema.

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
