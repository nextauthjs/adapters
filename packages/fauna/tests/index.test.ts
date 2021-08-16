import {
  collections,
  FaunaAdapter,
  indexes,
  query,
  toAccount,
  toSession,
  toUser,
  toVerificationToken,
} from "../src"
import { runBasicTests } from "../../../basic-tests"
import { query as q, Client as FaunaClient } from "faunadb"

const f = new FaunaClient({
  secret: "secret",
  scheme: "http",
  domain: "localhost",
  port: 8443,
})

runBasicTests({
  adapter: FaunaAdapter(f),
  db: {
    disconnect: async () => await f.close({ force: true }),
    async user(id) {
      const ref = q.Ref(q.Collection(collections.User), id)
      return await query(f, q.Get(ref), toUser)
    },
    async session(sessionToken) {
      const ref = q.Match(q.Index(indexes.Session), sessionToken)
      return await query(f, q.Get(ref), toSession)
    },
    async account({ provider, providerAccountId }) {
      const key = [provider, providerAccountId]
      const ref = q.Match(q.Index(indexes.UserByAccount), key)
      return await query(f, q.Get(ref), toAccount)
    },
    async verificationToken({ identifier, token }) {
      const key = [identifier, token]
      const ref = q.Match(q.Index(indexes.VerificationToken), key)
      return await query(f, q.Get(ref), toVerificationToken)
    },
  },
})
