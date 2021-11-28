import type { MikroORM } from "@mikro-orm/core"
import { wrap } from "@mikro-orm/core"

import * as defaultModels from "./models"
import type {
  Adapter,
  AdapterSession,
  VerificationToken as AdapterVerificationToken,
} from "next-auth/adapters"
import type { DefaultAccount } from "next-auth"

export const getEM = async (ormPromise: Promise<MikroORM>) => {
  return await ormPromise?.then((orm) => orm.em.fork())
}

export function MikroOrmAdapter<
  TUserModel extends typeof defaultModels.User = typeof defaultModels.User,
  TAccountModel extends typeof defaultModels.Account = typeof defaultModels.Account,
  TSessionModel extends typeof defaultModels.Session = typeof defaultModels.Session,
  TVerificationTokenModel extends typeof defaultModels.VerificationToken = typeof defaultModels.VerificationToken
>(
  ormPromise: Promise<MikroORM>,
  models?: {
    User?: TUserModel
    Account: TAccountModel
    Session?: TSessionModel
    VerificationToken?: TVerificationTokenModel
  }
): Adapter {
  const UserModel = models?.User ?? defaultModels.User
  const AccountModel = models?.Account ?? defaultModels.Account
  const SessionModel = models?.Session ?? defaultModels.Session
  const VerificationTokenModel =
    models?.VerificationToken ?? defaultModels.VerificationToken

  return {
    createUser: async (data) => {
      const em = await getEM(ormPromise)
      const user = new UserModel({ ...data })
      await em.persistAndFlush(user)

      return wrap(user).toObject()
    },
    getUser: async (id) => {
      const em = await getEM(ormPromise)
      const user = await em.findOne(UserModel, { id })
      if (!user) return null

      return wrap(user).toObject()
    },
    getUserByEmail: async (email) => {
      const em = await getEM(ormPromise)
      const user = await em.findOne(UserModel, { email })
      if (!user) return null

      return wrap(user).toObject()
    },
    getUserByAccount: async (provider_providerAccountId) => {
      const em = await getEM(ormPromise)
      const account = await em.findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) return null
      const user = await em.findOne(UserModel, { id: account.userId })

      return wrap(user).toObject()
    },
    updateUser: async (data) => {
      const em = await getEM(ormPromise)
      const user = await em.findOne(UserModel, { id: data.id })
      if (!user) throw new Error("User not found")
      wrap(user).assign(data, { mergeObjects: true })
      await em.persistAndFlush(user)

      return wrap(user).toObject()
    },
    deleteUser: async (id) => {
      const em = await getEM(ormPromise)
      const user = await em.findOne(UserModel, { id })
      if (!user) return null
      await em.removeAndFlush(user)

      return wrap(user).toObject()
    },
    linkAccount: async (data) => {
      const em = await getEM(ormPromise)
      const user = await em.findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const account = new AccountModel(data)
      user.accounts.add(account)
      await em.persistAndFlush(user)

      return wrap(account).toObject() as DefaultAccount
    },
    unlinkAccount: async (provider_providerAccountId) => {
      const em = await getEM(ormPromise)
      const account = await em.findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) throw new Error("Account not found")
      await em.removeAndFlush(account)

      return wrap(account).toObject() as DefaultAccount
    },
    getSessionAndUser: async (sessionToken) => {
      const em = await getEM(ormPromise)
      const session = await em.findOne(
        SessionModel,
        { sessionToken },
        { populate: ["user"] }
      )
      if (!session || !session.user) return null

      return {
        user: wrap(session.user).toObject(),
        session: wrap(session).toObject() as AdapterSession,
      }
    },
    createSession: async (data) => {
      const em = await getEM(ormPromise)
      const user = await em.findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const session = new SessionModel(data)
      user.sessions.add(session)
      await em.persistAndFlush(user)

      return wrap(session).toObject() as AdapterSession
    },
    updateSession: async (data) => {
      const em = await getEM(ormPromise)
      const session = await em.findOne(SessionModel, {
        sessionToken: data.sessionToken,
      })
      wrap(session).assign(data)
      if (!session) throw new Error("Session not found")
      await em.persistAndFlush(session)

      return wrap(session).toObject() as AdapterSession
    },
    deleteSession: async (sessionToken) => {
      const em = await getEM(ormPromise)
      const session = await em.findOne(SessionModel, {
        sessionToken,
      })
      if (!session) return null
      await em.removeAndFlush(session)

      return wrap(session).toObject() as AdapterSession
    },
    createVerificationToken: async (data) => {
      const em = await getEM(ormPromise)
      const verificationToken = new VerificationTokenModel(data)
      await em.persistAndFlush(verificationToken)

      return wrap(verificationToken).toObject() as AdapterVerificationToken
    },
    useVerificationToken: async (params) => {
      const em = await getEM(ormPromise)
      const verificationToken = await em
        .getRepository(VerificationTokenModel)
        .findOne(params)
      if (!verificationToken) return null
      await em.removeAndFlush(verificationToken)

      return wrap(verificationToken).toObject() as AdapterVerificationToken
    },
  }
}

export * as defaultModels from "./models"
