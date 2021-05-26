import { runBasicTests } from "../../../../basic-tests"

import { createConnection, ConnectionOptions, Connection } from "typeorm"
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { TypeORMLegacyAdapter, Models as models } from "../../src"
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import adapterTransform from "../../src/lib/transform"
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { loadConfig } from "../../src/lib/config"

const config: ConnectionOptions = {
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "next-auth",
}

const adapter = new TypeORMLegacyAdapter(config)

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
    async expireSession(sessionToken, expires) {
      const c = await connection()
      await c.manager.update(
        models.Session.model,
        { sessionToken },
        { expires }
      )
    },
    async account(providerId, providerAccountId) {
      const c = await connection()
      return await c.manager.findOne(models.Account.model, {
        providerId,
        providerAccountId,
      })
    },
    async verificationRequest(identifier, hashedToken) {
      const c = await connection()
      const verificationRequest = await c.manager.findOne(
        models.VerificationRequest.model,
        {
          identifier,
          token: hashedToken,
        }
      )
      return verificationRequest ?? null
    },
  },
})
