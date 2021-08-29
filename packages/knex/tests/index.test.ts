import { runBasicTests } from "../../../basic-tests"
import { Knex, knex } from "knex"
import { format, tables, KnexAdapter } from "../src"

const config: Knex.Config = {
  client: "sqlite3",
  connection: {
    filename: "./tests/dev.sqlite3",
  },
}

const client = knex(config)

runBasicTests({
  adapter: KnexAdapter(client),
  db: {
    disconnect: async () => await client.destroy(),
    user: async (id) => {
      const users = await client(tables.Users).where({ id })
      return format.from(users[0])
    },
    account: (provider_providerAccountId) =>
      client(tables.Accounts).where(provider_providerAccountId),
    session: async (sessionToken) => {
      const session = await client(tables.Sessions).where({ sessionToken })
      return format.from(session[0])
    },
    verificationToken: (identifier_token) =>
      client(tables.VerificationTokens).where(identifier_token),
  },
})
