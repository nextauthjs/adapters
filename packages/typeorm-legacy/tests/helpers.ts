import { ConnectionManager, ConnectionOptions } from "typeorm"
import { TestOptions } from "../../../basic-tests"
import * as entities from "../src/entities"
import { parseConnectionConfig } from "../src/utils"

/** Set up Test Database */
export function db(config: string | ConnectionOptions): TestOptions["db"] {
  const connection = new ConnectionManager().create(
    parseConnectionConfig(config)
  )

  const m = connection.manager
  return {
    connect: async () => await connection.connect(),
    disconnect: async () => await connection.close(),
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
  }
}
