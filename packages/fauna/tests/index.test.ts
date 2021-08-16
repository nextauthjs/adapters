import { collections, FaunaAdapter, format, indexes, query } from "../src"
import { runBasicTests } from "../../../basic-tests"
import { Client as FaunaClient, Get, Match, Ref } from "faunadb"

const client = new FaunaClient({
  secret: "secret",
  scheme: "http",
  domain: "localhost",
  port: 8443,
})

const q = query(client, format.from)

runBasicTests({
  adapter: FaunaAdapter(client),
  db: {
    disconnect: async () => await client.close({ force: true }),
    user: async (id) => await q(Get(Ref(collections.Users, id))),
    session: async (sessionToken) =>
      await q(Get(Match(indexes.SessionByToken, sessionToken))),
    async account({ provider, providerAccountId }) {
      const key = [provider, providerAccountId]
      const ref = Match(indexes.UserByAccount, key)
      return await q(Get(ref))
    },
    async verificationToken({ identifier, token }) {
      const key = [identifier, token]
      const ref = Match(indexes.VerificationTokenByIdentifierAndToken, key)
      // @ts-expect-error
      const { id: _id, ...verificationToken } = await q(Get(ref))
      return verificationToken
    },
  },
})
