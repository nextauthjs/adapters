import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"
import {
  Connection,
  ConnectionManager,
  ConnectionOptions,
  EntityManager,
  EntitySchema,
  getConnection,
} from "typeorm"
import { Account } from "next-auth"
import * as defaultEntities from "./entities"
import { parseConnectionConfig } from "./utils"

export interface Entities {
  User: EntitySchema<AdapterUser>
  Session: EntitySchema<AdapterSession>
  Account: EntitySchema<Account>
  VerificationToken: EntitySchema<VerificationToken>
}

export interface TypeORMLegacyAdapterOptions {
  entities?: Entities
}

let _connection: Connection

export async function getManager(options: {
  connection: string | ConnectionOptions
  entities?: Entities
}): Promise<EntityManager> {
  const { connection, entities = defaultEntities } = options
  const config = parseConnectionConfig(connection)
  if (_connection) {
    try {
      const m = getConnection(config.name)
      if (m.isConnected) return m.manager
      await m.connect()
      return m.manager
    } catch (error) {
      const m = new ConnectionManager().create({
        ...config,
        entities: Object.values(entities ?? defaultEntities),
      })
      await m.connect()
      _connection = m
      return m.manager
    }
  }
  const m = new ConnectionManager().create({
    ...config,
    entities: Object.values(entities ?? defaultEntities),
  })
  await m.connect()
  _connection = m
  return m.manager
}

export function TypeORMLegacyAdapter(
  connection: string | ConnectionOptions,
  options?: TypeORMLegacyAdapterOptions
): Adapter {
  const c = { connection, ...options }

  const {
    User: UserEntity,
    Account: AccountEntity,
    Session: SessionEntity,
    VerificationToken: VerificationTokenEntity,
  } = options?.entities ?? defaultEntities

  return {
    createUser: async (data) => {
      const m = await getManager(c)
      const user = await m.save(UserEntity, data)
      await m.connection.close()
      return user
    },
    async getUser(id) {
      const m = await getManager(c)
      const user = await m.findOne(UserEntity, { id })
      await m.connection.close()
      return user ?? null
    },
    async getUserByEmail(email) {
      const m = await getManager(c)
      const user = await m.findOne(UserEntity, { email })
      await m.connection.close()
      return user ?? null
    },
    async getUserByAccount(provider_providerAccountId) {
      const m = await getManager(c)
      const account = await m.findOne<Account & { user: AdapterUser }>(
        AccountEntity,
        provider_providerAccountId,
        { relations: ["user"] }
      )
      await m.connection.close()
      if (!account) return null
      return account.user ?? null
    },
    async updateUser(data) {
      const m = await getManager(c)
      const user = await m.save(UserEntity, data)
      await m.connection.close()
      return user
    },
    async deleteUser(id) {
      const m = await getManager(c)
      await m.transaction(async (tm) => {
        await tm.delete(AccountEntity, { userId: id })
        await tm.delete(SessionEntity, { userId: id })
        await tm.delete(UserEntity, { id })
      })
      await m.connection.close()
    },
    async linkAccount(data) {
      const m = await getManager(c)
      const account = await m.save(AccountEntity, data)
      await m.connection.close()
      return account
    },
    async unlinkAccount(providerAccountId) {
      const m = await getManager(c)
      await m.delete<Account>(AccountEntity, providerAccountId)
      await m.connection.close()
    },
    async createSession(data) {
      const m = await getManager(c)
      const session = await m.save(SessionEntity, data)
      await m.connection.close()
      return session
    },
    async getSessionAndUser(sessionToken) {
      const m = await getManager(c)
      const sessionAndUser = await m.findOne<
        AdapterSession & { user: AdapterUser }
      >(SessionEntity, { sessionToken }, { relations: ["user"] })

      await m.connection.close()
      if (!sessionAndUser) return null
      const { user, ...session } = sessionAndUser
      return { session, user }
    },
    async updateSession(data) {
      const m = await getManager(c)
      await m.update(SessionEntity, { sessionToken: data.sessionToken }, data)
      await m.connection.close()
      // TODO: Try to return?
      return null
    },
    async deleteSession(sessionToken) {
      const m = await getManager(c)
      await m.delete(SessionEntity, { sessionToken })
      await m.connection.close()
    },
    async createVerificationToken(data) {
      const m = await getManager(c)
      const verificationToken = await m.save(VerificationTokenEntity, data)
      // @ts-expect-error
      delete verificationToken.id
      await m.connection.close()
      return verificationToken
    },
    async useVerificationToken(identifier_token) {
      const m = await getManager(c)
      const verificationToken = await m.findOne(
        VerificationTokenEntity,
        identifier_token
      )
      if (!verificationToken) {
        await m.connection.close()
        return null
      }
      await m.delete(VerificationTokenEntity, identifier_token)
      await m.connection.close()
      // @ts-expect-error
      delete verificationToken.id
      return verificationToken
    },
  }
}
