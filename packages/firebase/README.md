<p align="center">
   <br/>
   <a href="https://next-auth.js.org" target="_blank">
    <img height="64px" src="https://next-auth.js.org/img/logo/logo-sm.png" /></a><img height="64px" src="https://raw.githubusercontent.com/nextauthjs/adapters/canary/packages/firebase/logo.svg" />
   <h3 align="center"><b>Firebase Adapter</b> - NextAuth.js</h3>
   <p align="center">
   Open Source. Full Stack. Own Your Data.
   </p>
   <p align="center" style="align: center;">
      <img src="https://github.com/nextauthjs/adapters/actions/workflows/canary.yml/badge.svg" alt="Build Test" />
      <img src="https://img.shields.io/bundlephobia/minzip/@next-auth/firebase-adapter" alt="Bundle Size"/>
      <img src="https://img.shields.io/npm/v/@next-auth/firebase-adapter" alt="@next-auth/firebase-adapter Version" />
   </p>
</p>

## Overview

This is the Firebase Adapter for [`next-auth`](https://next-auth.js.org). This package can only be used in conjunction with the primary `next-auth` package. It is not a standalone package.

You can find more Firebase information in the docs at [next-auth.js.org/adapters/firebase](https://next-auth.js.org/adapters/firebase).

## Getting Started

1. Install `next-auth` and `@next-auth/firebase-adapter`

```js
npm install next-auth @next-auth/firebase-adapter
```

2. Add this adapter to your `pages/api/[...nextauth].js` next-auth configuration object.

```js
import NextAuth from "next-auth"
import Providers from "next-auth/providers"
import { FirebaseAdapter } from "@next-auth/firebase-adapter"

import firebase from "firebase/app"
import "firebase/firestore"

const firestore = (
  firebase.apps[0] ??
  firebase
    .initializeApp
    /* your config */
    ()
).firestore()

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
  adapter: FirebaseAdapter(firestore),
  ...
})
```

## Options

// TODO

## Contributing

We're open to all community contributions! If you'd like to contribute in any way, please first read our [Contributing Guide](https://github.com/nextauthjs/adapters/blob/canary/CONTRIBUTING.md).

## License

ISC
