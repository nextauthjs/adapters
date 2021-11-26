import { RequestContext, wrap } from "@mikro-orm/core"

import { Account, Session, User, VerificationToken } from "./models"
import {
  Adapter,
  AdapterUser,
  AdapterSession,
  VerificationToken as AdapterVerificationToken,
} from "next-auth/adapters"
import { DefaultAccount } from "next-auth"

export const getEM = () => {
  const em = RequestContext.getEntityManager()
  if (!em)
    throw new Error(
      "Entity manager not found. Are you in a 'withORM'-wrapped Context?"
    )
  return em
}

export function MikroOrmAdapter<
  TUserModel extends typeof User = typeof User,
  TAccountModel extends typeof Account = typeof Account,
  TSessionModel extends typeof Session = typeof Session,
  TVerificationTokenModel extends typeof VerificationToken = typeof VerificationToken
>(models?: {
  userModel?: TUserModel
  accountModel?: TAccountModel
  sessionModel?: TSessionModel
  verificationTokenModel?: TVerificationTokenModel
}): Adapter {
  const UserModel = models?.userModel ?? User
  const AccountModel = models?.accountModel ?? Account
  const SessionModel = models?.sessionModel ?? Session
  const VerificationTokenModel =
    models?.verificationTokenModel ?? VerificationToken

  return {
    createUser: async (data) => {
      const user = new UserModel({ ...data })
      await getEM().persistAndFlush(user)

      return wrap(user).toObject() as AdapterUser
    },
    getUser: async (id) => {
      const user = await getEM().findOne(UserModel, { id })
      if (!user) return null

      return wrap(user).toObject() as AdapterUser
    },
    getUserByEmail: async (email) => {
      const user = await getEM().findOne(UserModel, { email })
      if (!user) return null

      return wrap(user).toObject() as AdapterUser
    },
    getUserByAccount: async (provider_providerAccountId) => {
      const account = await getEM().findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) return null
      const user = await getEM().findOne(UserModel, { id: account.userId })

      return wrap(user).toObject() as AdapterUser
    },
    updateUser: async (data) => {
      const user = await getEM().findOne(UserModel, { id: data.id })
      if (!user) throw new Error("User not found")
      wrap(user).assign(data, { mergeObjects: true })
      await getEM().persistAndFlush(user)

      return wrap(user).toObject() as AdapterUser
    },
    deleteUser: async (id) => {
      const user = await getEM().findOne(UserModel, { id })
      if (!user) return null
      await getEM().removeAndFlush(user)

      return wrap(user).toObject() as AdapterUser
    },
    linkAccount: async (data) => {
      const user = await getEM().findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const account = new AccountModel(data)
      user.accounts.add(account)
      await getEM().persistAndFlush(user)

      return wrap(account).toObject() as DefaultAccount
    },
    unlinkAccount: async (provider_providerAccountId) => {
      const account = await getEM().findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) throw new Error("Account not found")
      await getEM().removeAndFlush(account)

      return wrap(account).toObject() as DefaultAccount
    },
    getSessionAndUser: async (sessionToken) => {
      const session = await getEM().findOne(
        SessionModel,
        { sessionToken },
        { populate: ["user"] }
      )
      if (!session || !session.user) return null
      console.log(session)

      return {
        user: wrap(session.user).toObject() as AdapterUser,
        session: wrap(session).toObject() as AdapterSession,
      }
    },
    createSession: async (data) => {
      const user = await getEM().findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const session = new SessionModel(data)
      user.sessions.add(session)
      await getEM().persistAndFlush(user)

      return wrap(session).toObject() as AdapterSession
    },
    updateSession: async (data) => {
      const session = await getEM().findOne(SessionModel, {
        sessionToken: data.sessionToken,
      })
      wrap(session).assign(data)
      if (!session) throw new Error("Session not found")
      await getEM().persistAndFlush(session)

      return wrap(session).toObject() as AdapterSession
    },
    deleteSession: async (sessionToken) => {
      const session = await getEM().findOne(SessionModel, { sessionToken })
      if (!session) return null
      await getEM().removeAndFlush(session)

      return wrap(session).toObject() as AdapterSession
    },
    createVerificationToken: async (data) => {
      const verificationToken = new VerificationTokenModel(data)
      await getEM().persistAndFlush(verificationToken)

      return wrap(verificationToken).toObject() as AdapterVerificationToken
    },
    useVerificationToken: async (params) => {
      const verificationToken = await getEM()
        .getRepository(VerificationTokenModel)
        .findOne(params)
      if (!verificationToken) return null
      await getEM().removeAndFlush(verificationToken)

      return wrap(verificationToken).toObject() as AdapterVerificationToken
    },
  }
}

export * from "./models"
