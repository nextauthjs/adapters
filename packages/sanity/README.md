<h1 align="center">Welcome to Sanity Adapter for NextAuth 👋</h1>
<p>
  <a href="https://www.npmjs.com/package/@next-auth/sanity-adapter" target="_blank">
    <img alt="Version" src="https://img.shields.io/npm/v/@next-auth/sanity-adapter.svg">
  </a>
  <a href="#" target="_blank">
    <img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg" />
  </a>
</p>

> NextAuth Adapter and Provider for Sanity

## Overview

### Features

- Saving users and account in Sanity
- Retrieving of full linked provider information for a user
- Stale While Revalidate
- Auth with Credentials
- Hash Credentials Passwords with Argon2

### Database sessions

Database sessions are not implemented, this adapter relies on usage of JSON Web Tokens for stateless session management.

### Recommendations

you must make the dataset private otherwise the data of your users will be public for everyone

```sh
sanity dataset visibility set <datasetName> private
```

## Requirements

- Sanity Token for Read+Write

## Installation

### yarn

```sh
yarn add @next-auth/sanity-adapter
```

### npm

```sh
npm i next-auth-sanity
```

## Usage

[Full Example](https://github.com/Fedeya/next-auth-sanity/tree/main/examples/full-example)

```ts
import NextAuth, { NextAuthOptions } from "next-auth"
import Providers from "next-auth/providers"
import { NextApiRequest, NextApiResponse } from "next"
import { SanityAdapter, SanityCredentials } from "next-auth-sanity"
import { client } from "your/sanity/client"

const options: NextAuthOptions = {
  providers: [
    Providers.GitHub({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
    }),
    SanityCredentials({ client }), // only if you use sign in with credentials
  ],
  session: {
    jwt: true,
  },
  adapter: SanityAdapter({ client }),
}

export default (req: NextApiRequest, res: NextApiResponse) =>
  NextAuth(req, res, options)
```

### Sanity Schemas

```ts
// user

export default {
  name: "user",
  title: "User",
  type: "document",
  fields: [
    {
      name: "name",
      title: "Name",
      type: "string",
    },
    {
      name: "email",
      title: "Email",
      type: "string",
    },
    {
      name: "image",
      title: "Image",
      type: "url",
    },
    {
      // this is only if you use credentials provider
      name: "password",
      type: "string",
      hidden: true,
    },
  ],
}
```

```ts
// account

export default {
  name: "account",
  title: "Account",
  type: "document",
  fields: [
    {
      name: "providerType",
      type: "string",
    },
    {
      name: "providerId",
      type: "string",
    },
    {
      name: "providerAccountId",
      type: "string",
    },
    {
      name: "refreshToken",
      type: "string",
    },
    {
      name: "accessToken",
      type: "string",
    },
    {
      name: "accessTokenExpires",
      type: "string",
    },
    {
      name: "user",
      title: "User",
      type: "reference",
      to: { type: "user" },
    },
  ],
}
```

### Sign Up and Sign In With Credentials

### Setup

`API Route`

```ts
// pages/api/sanity/signUp.ts

import { signUpHandler } from "next-auth-sanity"
import { NextApiRequest, NextApiResponse } from "next"
import { client } from "your/sanity/client"

export default (req: NextApiRequest, res: NextApiResponse) =>
  signUpHandler({ req, res, client })
```

`Client`

```ts
import { signUp } from "next-auth-sanity/client"
import { signIn } from "next-auth/client"

const user = await signUp({
  email,
  password,
  name,
})

await signIn("credentials", {
  redirect: false,
  email,
  password,
})
```

## Author

👤 **Fedeya <elfedeminaya@gmail.com>**

- Website: https://fedeya.tk
- Twitter: [@fede_minaya](https://twitter.com/fede_minaya)
- Github: [@Fedeya](https://github.com/Fedeya)
- LinkedIn: [@federico-minaya](https://linkedin.com/in/federico-minaya)

## 🤝 Contributing

Contributions, issues and feature requests are welcome!<br />Feel free to check [issues page](https://github.com/Fedeya/next-auth-sanity/issues).

## Show your support

Give a ⭐️ if this project helped you!

---

_This README was generated with ❤️ by [readme-md-generator](https://github.com/kefranabg/readme-md-generator)_
