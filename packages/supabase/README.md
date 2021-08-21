<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="https://raw.githubusercontent.com/nextauthjs/adapters/main/packages/supabase/logo.svg" />
   <h3 align="center"><b>Supabase Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/supabase-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/supabase-adapter" alt="@next-auth/supabase-adapter Version" />
   </p>
</p>

## Overview

This is the Supabase Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find the Supabase schema in the docs at [next-auth.js.org/adapters/supabase](https://next-auth.js.org/adapters/supabase).

## Getting Started

1. Install the following packages

```sh
npm i next-auth @next-auth/supabase-adapter @supabase/supabase-js
```

or

```sh
yarn add next-auth @next-auth/supabase-adapter @supabase/supabase-js
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import { createClient } from "@supabase/supabase-js"
import { SupabaseAdapter } from "@next-auth/supabase-adapter"

export const client = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
)

export default NextAuth({
  adapter: SupabaseAdapter(client),
  // Rest of your NextAuth config
})
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
