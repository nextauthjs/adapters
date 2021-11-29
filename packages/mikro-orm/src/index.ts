import type { Options } from "@mikro-orm/core"
import { MikroORM, wrap } from "@mikro-orm/core"
import * as defaultEntities from "./entities"

import type { Adapter } from "next-auth/adapters"
import { isPromise } from "util/types"

export * as defaultEntities from "./entities"

export const getEM = async (
  ormConnection: Promise<MikroORM> | Options,
  entities: Array<
    | typeof defaultEntities.User
    | typeof defaultEntities.Account
    | typeof defaultEntities.Session
    | typeof defaultEntities.VerificationToken
  >
) => {
  if (!isPromise(ormConnection)) {
    const extendedEntities = new Set(ormConnection.entities)
    entities.map((e) => extendedEntities.add(e))
    ormConnection = MikroORM.init({
      ...ormConnection,
      entities: Array.from(extendedEntities),
    })
  }
  return await ormConnection.then((orm) => orm.em.fork())
}

/**
 * The MikroORM adapter accepts a MikroORM instance or configuration and returns a NextAuth adapter.
 * @param ormConnection can either be an instance promise or a MikroORM connection configuration (https://mikro-orm.io/docs/next/configuration#driver)
 * @param options entities in the options object will be passed to the MikroORM init function as entities
 * @returns
 */
export function MikroOrmAdapter(
  ormConnection: Promise<MikroORM> | Options,
  options?: { entities?: typeof defaultEntities }
): Adapter {
  const {
    User: UserModel,
    Account: AccountModel,
    Session: SessionModel,
    VerificationToken: VerificationTokenModel,
  } = { ...defaultEntities, ...options?.entities }

  const actualEntities = [
    UserModel,
    AccountModel,
    SessionModel,
    VerificationTokenModel,
  ]

  return {
    /**
     * Method used in testing. You won't need to call this in your app.
     * @internal
     */
    // @ts-expect-error
    async __disconnect() {
      const em = await getEM(ormConnection, actualEntities)
      await em.getConnection().close()
    },
    async createUser(data) {
      const em = await getEM(ormConnection, actualEntities)
      const user = new UserModel({ ...data })
      await em.persistAndFlush(user)

      return wrap(user).toObject()
    },
    async getUser(id) {
      const em = await getEM(ormConnection, actualEntities)
      const user = await em.findOne(UserModel, { id })
      if (!user) return null

      return wrap(user).toObject()
    },
    async getUserByEmail(email) {
      const em = await getEM(ormConnection, actualEntities)
      const user = await em.findOne(UserModel, { email })
      if (!user) return null

      return wrap(user).toObject()
    },
    async getUserByAccount(provider_providerAccountId) {
      const em = await getEM(ormConnection, actualEntities)
      const account = await em.findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) return null
      const user = await em.findOne(UserModel, { id: account.userId })

      return wrap(user).toObject()
    },
    async updateUser(data) {
      const em = await getEM(ormConnection, actualEntities)
      const user = await em.findOne(UserModel, { id: data.id })
      if (!user) throw new Error("User not found")
      wrap(user).assign(data, { mergeObjects: true })
      await em.persistAndFlush(user)

      return wrap(user).toObject()
    },
    async deleteUser(id) {
      const em = await getEM(ormConnection, actualEntities)
      const user = await em.findOne(UserModel, { id })
      if (!user) return null
      await em.removeAndFlush(user)

      return wrap(user).toObject()
    },
    async linkAccount(data) {
      const em = await getEM(ormConnection, actualEntities)
      const user = await em.findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const account = new AccountModel(data)
      user.accounts.add(account)
      await em.persistAndFlush(user)

      return wrap(account).toObject()
    },
    async unlinkAccount(provider_providerAccountId) {
      const em = await getEM(ormConnection, actualEntities)
      const account = await em.findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) throw new Error("Account not found")
      await em.removeAndFlush(account)

      return wrap(account).toObject()
    },
    async getSessionAndUser(sessionToken) {
      const em = await getEM(ormConnection, actualEntities)
      const session = await em.findOne(
        SessionModel,
        { sessionToken },
        { populate: ["user"] }
      )
      if (!session || !session.user) return null

      return {
        user: wrap(session.user).toObject(),
        session: wrap(session).toObject(),
      }
    },
    async createSession(data) {
      const em = await getEM(ormConnection, actualEntities)
      const user = await em.findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const session = new SessionModel(data)
      user.sessions.add(session)
      await em.persistAndFlush(user)

      return wrap(session).toObject()
    },
    async updateSession(data) {
      const em = await getEM(ormConnection, actualEntities)
      const session = await em.findOne(SessionModel, {
        sessionToken: data.sessionToken,
      })
      wrap(session).assign(data)
      if (!session) throw new Error("Session not found")
      await em.persistAndFlush(session)

      return wrap(session).toObject()
    },
    async deleteSession(sessionToken) {
      const em = await getEM(ormConnection, actualEntities)
      const session = await em.findOne(SessionModel, {
        sessionToken,
      })
      if (!session) return null
      await em.removeAndFlush(session)

      return wrap(session).toObject()
    },
    async createVerificationToken(data) {
      const em = await getEM(ormConnection, actualEntities)
      const verificationToken = new VerificationTokenModel(data)
      await em.persistAndFlush(verificationToken)

      return wrap(verificationToken).toObject()
    },
    async useVerificationToken(params) {
      const em = await getEM(ormConnection, actualEntities)
      const verificationToken = await em
        .getRepository(VerificationTokenModel)
        .findOne(params)
      if (!verificationToken) return null
      await em.removeAndFlush(verificationToken)

      return wrap(verificationToken).toObject()
    },
  }
}
