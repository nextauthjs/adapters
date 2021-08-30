import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"
import { Connection, EntitySchema } from "typeorm"
import { Account } from "next-auth"
import * as defaultEntities from "./entities"

export interface Entities {
  User: EntitySchema<AdapterUser>
  Session: EntitySchema<AdapterSession>
  Account: EntitySchema<Account>
  VerificationToken: EntitySchema<VerificationToken>
}

export interface TypeORMLegacyAdapterOptions {
  connection: Connection
  entities?: Entities
}

export function TypeORMLegacyAdapter(
  options: TypeORMLegacyAdapterOptions
): Adapter {
  const {
    connection: { manager: m },
  } = options
  const {
    User: UserEntity,
    Account: AccountEntity,
    Session: SessionEntity,
    VerificationToken: VerificationTokenEntity,
  } = options.entities ?? defaultEntities

  return {
    createUser: async (data) => {
      return await m.save(UserEntity, data)
    },
    async getUser(id) {
      const user = await m.findOne(UserEntity, { id })
      return user ?? null
    },
    async getUserByEmail(email) {
      const user = await m.findOne(UserEntity, { email })
      return user ?? null
    },
    async getUserByAccount(provider_providerAccountId) {
      const account = await m.findOne<Account & { user: AdapterUser }>(
        AccountEntity,
        provider_providerAccountId,
        { relations: ["user"] }
      )
      if (!account) return null
      return account.user ?? null
    },
    async updateUser(data) {
      return await m.save(UserEntity, data)
    },
    async deleteUser(id) {
      await m.transaction(async (tm) => {
        await tm.delete(AccountEntity, { userId: id })
        await tm.delete(SessionEntity, { userId: id })
        await tm.delete(UserEntity, { id })
      })
    },
    async linkAccount(data) {
      return await m.save(AccountEntity, data)
    },
    async unlinkAccount(providerAccountId) {
      await m.delete<Account>(AccountEntity, providerAccountId)
    },
    async createSession(data) {
      return await m.save(SessionEntity, data)
    },
    async getSessionAndUser(sessionToken) {
      const sessionAndUser = await m.findOne<
        AdapterSession & { user: AdapterUser }
      >(SessionEntity, { sessionToken }, { relations: ["user"] })

      if (!sessionAndUser) return null
      const { user, ...session } = sessionAndUser
      return { session, user }
    },
    async updateSession(data) {
      await m.update(SessionEntity, { sessionToken: data.sessionToken }, data)
      // TODO: Try to return?
      return null
    },
    async deleteSession(sessionToken) {
      await m.delete(SessionEntity, { sessionToken })
    },
    async createVerificationToken(data) {
      const verificationToken = await m.save(VerificationTokenEntity, data)
      // @ts-expect-error
      delete verificationToken.id
      return verificationToken
    },
    async useVerificationToken(identifier_token) {
      const verificationToken = await m.findOne(
        VerificationTokenEntity,
        identifier_token
      )
      if (!verificationToken) return null
      await m.delete(VerificationTokenEntity, identifier_token)
      // @ts-expect-error
      delete verificationToken.id
      return verificationToken
    },
  }
}
