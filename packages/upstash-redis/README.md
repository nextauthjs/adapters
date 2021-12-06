<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank"><img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a>&nbsp;&nbsp;&nbsp;&nbsp;<img height="64px" src="logo.svg" />
   <h3 align="center"><b>Upstash Redis Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/release.yml/badge.svg" alt="CI Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/upstash-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/upstash-adapter" alt="@next-auth/upstash-adapter Version" />
   </p>
</p>

## Overview

This is the Upstash Redis Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

## Getting Started

1. Install `next-auth` and `@next-auth/upstash-redis-adapter` as well as `@upstash/redis`.

```js
npm install next-auth @next-auth/upstash-redis-adapter @upstash/redis
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import UpstashRedisAdapter from "@next-auth/upstash-adapter"
import upstashRedisClient from "@upstash/redis"

const redis = upstashRedisClient("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN")

// For more information on each option (and a full list of options) go to
// https://next-auth.js.org/configuration/options
export default NextAuth({
  ...
  adapter: UpstashRedisAdapter(redis)
  ...
})
```

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/main/CONTRIBUTING.md).

## License

ISC
