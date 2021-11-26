import { RequestContext, wrap } from "@mikro-orm/core"

import {
  Account,
  Session,
  User as DefaultUserModel,
  VerificationToken,
} from "./models"
import {
  Adapter,
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
  TUserModel extends typeof DefaultUserModel = typeof DefaultUserModel
>(User?: TUserModel): Adapter {
  const UserModel = User ?? DefaultUserModel

  return {
    createUser: async (data) => {
      const user = new UserModel({ ...data })
      await getEM().persistAndFlush(user)

      return wrap(user).toObject()
    },
    getUser: async (id) => {
      const user = await getEM().findOne(UserModel, { id })
      if (!user) return null

      return wrap(user).toObject()
    },
    getUserByEmail: async (email) => {
      const user = await getEM().findOne(UserModel, { email })
      if (!user) return null

      return wrap(user).toObject()
    },
    getUserByAccount: async (provider_providerAccountId) => {
      const account = await getEM().findOne(Account, {
        ...provider_providerAccountId,
      })
      if (!account) return null
      const user = await getEM().findOne(UserModel, { id: account.userId })

      return wrap(user).toObject()
    },
    updateUser: async (data) => {
      const user = await getEM().findOne(UserModel, { id: data.id })
      if (!user) throw new Error("User not found")
      wrap(user).assign(data, { mergeObjects: true })
      await getEM().persistAndFlush(user)

      return wrap(user).toObject()
    },
    deleteUser: async (id) => {
      const user = await getEM().findOne(UserModel, { id })
      if (!user) return null
      await getEM().removeAndFlush(user)

      return wrap(user).toObject()
    },
    linkAccount: async (data) => {
      const user = await getEM().findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const account = new Account(data)
      user.accounts.add(account)
      await getEM().persistAndFlush(user)

      return wrap(account).toObject() as DefaultAccount
    },
    unlinkAccount: async (provider_providerAccountId) => {
      const account = await getEM().findOne(Account, {
        ...provider_providerAccountId,
      })
      if (!account) throw new Error("Account not found")
      await getEM().removeAndFlush(account)

      return wrap(account).toObject() as DefaultAccount
    },
    getSessionAndUser: async (sessionToken) => {
      const session = await getEM().findOne(
        Session,
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
      const user = await getEM().findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const session = new Session(data)
      user.sessions.add(session)
      await getEM().persistAndFlush(user)

      return wrap(session).toObject() as AdapterSession
    },
    updateSession: async (data) => {
      const session = await getEM().findOne(Session, {
        sessionToken: data.sessionToken,
      })
      wrap(session).assign(data)
      if (!session) throw new Error("Session not found")
      await getEM().persistAndFlush(session)

      return wrap(session).toObject() as AdapterSession
    },
    deleteSession: async (sessionToken) => {
      const session = await getEM().findOne(Session, { sessionToken })
      if (!session) return null
      await getEM().removeAndFlush(session)

      return wrap(session).toObject() as AdapterSession
    },
    createVerificationToken: async (data) => {
      const verificationToken = new VerificationToken(data)
      await getEM().persistAndFlush(verificationToken)

      return wrap(verificationToken).toObject() as AdapterVerificationToken
    },
    useVerificationToken: async (params) => {
      const verificationToken = await getEM()
        .getRepository(VerificationToken)
        .findOne(params)
      if (!verificationToken) return null
      await getEM().removeAndFlush(verificationToken)

      return wrap(verificationToken).toObject() as AdapterVerificationToken
    },
  }
}

export * from "./models"
