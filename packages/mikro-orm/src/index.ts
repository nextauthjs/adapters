import { wrap } from "@mikro-orm/core"
import * as defaultModels from "./models"

import type { EntityManager } from "@mikro-orm/core"
import type { Adapter } from "next-auth/adapters"

export * as defaultModels from "./models"

export function MikroOrmAdapter(
  em: Promise<EntityManager>,
  options?: { models?: typeof defaultModels }
): Adapter {
  const {
    User: UserModel,
    Account: AccountModel,
    Session: SessionModel,
    VerificationToken: VerificationTokenModel,
  } = { ...defaultModels, ...options?.models }

  return {
    /**
     * Method used in testing. You won't need to call this in your app.
     * @internal
     */
    // @ts-expect-error
    async __disconnect() {
      await (await em).getConnection().close()
    },
    async createUser(data) {
      const user = new UserModel({ ...data })
      await (await em).persistAndFlush(user)

      return wrap(user).toObject()
    },
    async getUser(id) {
      const user = await (await em).findOne(UserModel, { id })
      if (!user) return null

      return wrap(user).toObject()
    },
    async getUserByEmail(email) {
      const user = await (await em).findOne(UserModel, { email })
      if (!user) return null

      return wrap(user).toObject()
    },
    async getUserByAccount(provider_providerAccountId) {
      const account = await (
        await em
      ).findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) return null
      const user = await (await em).findOne(UserModel, { id: account.userId })

      return wrap(user).toObject()
    },
    async updateUser(data) {
      const user = await (await em).findOne(UserModel, { id: data.id })
      if (!user) throw new Error("User not found")
      wrap(user).assign(data, { mergeObjects: true })
      await (await em).persistAndFlush(user)

      return wrap(user).toObject()
    },
    async deleteUser(id) {
      const user = await (await em).findOne(UserModel, { id })
      if (!user) return null
      await (await em).removeAndFlush(user)

      return wrap(user).toObject()
    },
    async linkAccount(data) {
      const user = await (await em).findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const account = new AccountModel(data)
      user.accounts.add(account)
      await (await em).persistAndFlush(user)

      return wrap(account).toObject()
    },
    async unlinkAccount(provider_providerAccountId) {
      const account = await (
        await em
      ).findOne(AccountModel, {
        ...provider_providerAccountId,
      })
      if (!account) throw new Error("Account not found")
      await (await em).removeAndFlush(account)

      return wrap(account).toObject()
    },
    async getSessionAndUser(sessionToken) {
      const session = await (
        await em
      ).findOne(SessionModel, { sessionToken }, { populate: ["user"] })
      if (!session || !session.user) return null

      return {
        user: wrap(session.user).toObject(),
        session: wrap(session).toObject(),
      }
    },
    async createSession(data) {
      const user = await (await em).findOne(UserModel, { id: data.userId })
      if (!user) throw new Error("User not found")
      const session = new SessionModel(data)
      user.sessions.add(session)
      await (await em).persistAndFlush(user)

      return wrap(session).toObject()
    },
    async updateSession(data) {
      const session = await (
        await em
      ).findOne(SessionModel, {
        sessionToken: data.sessionToken,
      })
      wrap(session).assign(data)
      if (!session) throw new Error("Session not found")
      await (await em).persistAndFlush(session)

      return wrap(session).toObject()
    },
    async deleteSession(sessionToken) {
      const session = await (
        await em
      ).findOne(SessionModel, {
        sessionToken,
      })
      if (!session) return null
      await (await em).removeAndFlush(session)

      return wrap(session).toObject()
    },
    async createVerificationToken(data) {
      const verificationToken = new VerificationTokenModel(data)
      await (await em).persistAndFlush(verificationToken)

      return wrap(verificationToken).toObject()
    },
    async useVerificationToken(params) {
      const verificationToken = await (await em)
        .getRepository(VerificationTokenModel)
        .findOne(params)
      if (!verificationToken) return null
      await (await em).removeAndFlush(verificationToken)

      return wrap(verificationToken).toObject()
    },
  }
}
