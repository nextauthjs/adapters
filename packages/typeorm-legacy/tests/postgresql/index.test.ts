import { runBasicTests } from "../../../../basic-tests"

import { createConnection, Connection } from "typeorm"
import { TypeORMLegacyAdapter, Models as models } from "../../src"
import adapterTransform from "../../src/lib/transform"
import { loadConfig, parseConnectionString } from "../../src/lib/config"
import { VerificationToken } from "next-auth/adapters"
import { Account } from "next-auth"

const connectionString = "postgres://nextauth:password@localhost:5432/nextauth"
const config = parseConnectionString(connectionString)

const adapter = TypeORMLegacyAdapter({ config })

let _connection: Connection
async function connection() {
  if (_connection) {
    return _connection
  }

  const options = {}
  adapterTransform(config, models, options)
  _connection = await createConnection(
    loadConfig({ ...config, name: "next-auth-test" }, { ...options, models })
  )
  return _connection
}

runBasicTests({
  adapter,
  db: {
    async disconnect() {
      const c = await connection()
      await c.close()
    },
    async user(id) {
      const c = await connection()
      const user = await c.manager.findOne(models.User.model, {
        where: { id },
      })
      return user ?? null
    },
    async session(sessionToken) {
      const c = await connection()
      const session = await c.manager.findOne(models.Session.model, {
        where: { sessionToken },
      })
      return session ?? null
    },
    async account(providerAccountId) {
      const c = await connection()
      return await c.manager.findOne<Account>(
        models.Account.model,
        providerAccountId
      )
    },
    async verificationToken(identifier_token) {
      const c = await connection()
      const verificationToken = await c.manager.findOne<VerificationToken>(
        models.VerificationToken.model,
        identifier_token
      )
      return verificationToken ?? null
    },
  },
})
