import { ConnectionManager } from "typeorm"
import { runBasicTests } from "../../../basic-tests"
import { TypeORMLegacyAdapter } from "../src"
import * as entities from "../src/entities"
import { parseConnectionConfig } from "../src/utils"

const connection = new ConnectionManager().create(
  parseConnectionConfig({
    type: "sqlite",
    name: "next-auth-test-memory",
    database: ":memory:",
    synchronize: true,
  })
)

const adapter = TypeORMLegacyAdapter({ connection })
const m = connection.manager

runBasicTests({
  adapter,
  db: {
    async connect() {
      return await connection.connect()
    },
    async disconnect() {
      return await connection.close()
    },
    async user(id) {
      const user = await m.findOne(entities.User, id)
      return user ?? null
    },
    async account(provider_providerAccountId) {
      const account = await m.findOne(
        entities.Account,
        provider_providerAccountId
      )
      return account ?? null
    },
    async session(sessionToken) {
      const session = await m.findOne(entities.Session, { sessionToken })
      return session ?? null
    },
    async verificationToken(token_identifier) {
      const verificationToken = await m.findOne(
        entities.VerificationToken,
        token_identifier
      )
      if (!verificationToken) return null
      const { id: _, ...rest } = verificationToken
      return rest
    },
  },
})
