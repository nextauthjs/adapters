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
      return users[0] ? format.from(users[0]) : null
    },
    account: async (provider_providerAccountId) => {
      const accounts = await client(tables.Accounts).where(
        provider_providerAccountId
      )
      return accounts[0] ? format.from(accounts[0]) : null
    },
    session: async (sessionToken) => {
      const session = await client(tables.Sessions).where({ sessionToken })
      return session[0] ? format.from(session[0]) : null
    },
    verificationToken: async (identifier_token) => {
      const verificationTokens = await client(tables.VerificationTokens).where(
        identifier_token
      )
      return verificationTokens[0] ? format.from(verificationTokens[0]) : null
    },
  },
})
