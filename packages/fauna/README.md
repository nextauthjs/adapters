# Fauna Adapter

## Initial Setup

Run these FQL queries in your Fauna dashboard _one after another_.

```javascript
CreateCollection({ name: 'accounts' })
CreateCollection({ name: 'sessions' })
CreateCollection({ name: 'users' })
CreateCollection({ name: 'verification_requests' })
CreateIndex({
  name: 'account_by_provider_account_id',
  source: Collection('accounts'),
  unique: true,
  terms: [
    { field: ['data', 'providerId'] },
    { field: ['data', 'providerAccountId'] },
  ],
})
CreateIndex({
  name: 'session_by_token',
  source: Collection('sessions'),
  unique: true,
  terms: [{ field: ['data', 'sessionToken'] }],
})
CreateIndex({
  name: 'user_by_email',
  source: Collection('users'),
  unique: true,
  terms: [{ field: ['data', 'email'] }],
})
CreateIndex({
  name: 'verification_request_by_token',
  source: Collection('verification_requests'),
  unique: true,
  terms: [{ field: ['data', 'token'] }],
})
```

## Usage

Your `pages/api/auth/[...nextauth].ts` file may look like this

```ts
import { Client } from 'faunadb'
import { NextApiHandler } from 'next'
import NextAuth, { InitOptions } from 'next-auth'
import FaunaAdapter from '@next-auth/fauna-adapter'

const faunaSecret = process.env.FAUNA_SECRET

if (!faunaSecret) throw new Error(`Env variable FAUNA_SECRET must be set`)

const faunaAdapter = FaunaAdapter({
  faunaClient: new Client({
    secret: faunaSecret,
  }),
})

const options: InitOptions = {
  adapter: faunaAdapter,
}

const authHandler: NextApiHandler = (req, res) => NextAuth(req, res, options)

export default authHandler
```
