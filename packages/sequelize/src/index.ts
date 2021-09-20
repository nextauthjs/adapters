import type { Account as ApadterAccount } from "next-auth"
import type {
  Adapter,
  AdapterUser,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters"
import { Sequelize, Model, ModelCtor } from "sequelize"
import * as defaultModels from "./models"

export { defaultModels as models }

// @see https://sequelize.org/master/manual/typescript.html
interface AccountInstance
  extends Model<ApadterAccount, Partial<ApadterAccount>>,
    ApadterAccount {}
interface UserInstance
  extends Model<AdapterUser, Partial<AdapterUser>>,
    AdapterUser {}
interface SessionInstance
  extends Model<AdapterSession, Partial<AdapterSession>>,
    AdapterSession {}
interface VerificationTokenInstance
  extends Model<VerificationToken, Partial<VerificationToken>>,
    VerificationToken {}

interface SequelizeAdapterOptions {
  models?: Partial<{
    User: ModelCtor<UserInstance>
    Account: ModelCtor<AccountInstance>
    Session: ModelCtor<SessionInstance>
    VerificationToken: ModelCtor<VerificationTokenInstance>
  }>
}

export default function SequelizeAdapter(
  client: Sequelize,
  options?: SequelizeAdapterOptions
): Adapter {
  const { models } = options ?? {}
  const defaultModelOptions = { underscored: true, timestamps: false }
  const { User, Account, Session, VerificationToken } = {
    User:
      models?.User ??
      client.define<UserInstance>(
        "user",
        defaultModels.User,
        defaultModelOptions
      ),
    Account:
      models?.Account ??
      client.define<AccountInstance>(
        "account",
        defaultModels.Account,
        defaultModelOptions
      ),
    Session:
      models?.Session ??
      client.define<SessionInstance>(
        "session",
        defaultModels.Session,
        defaultModelOptions
      ),
    VerificationToken:
      models?.VerificationToken ??
      client.define<VerificationTokenInstance>(
        "verificationToken",
        defaultModels.VerificationToken,
        defaultModelOptions
      ),
  }

  Account.belongsTo(User, { onDelete: "cascade" })
  Session.belongsTo(User, { onDelete: "cascade" })

  return {
    async createUser(user) {
      return await User.create(user)
    },
    async getUser(id) {
      const userInstance = await User.findByPk(id)

      return userInstance?.get({ plain: true }) ?? null
    },
    async getUserByEmail(email) {
      const userInstance = await User.findOne({
        where: { email },
      })

      return userInstance?.get({ plain: true }) ?? null
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const accountInstance = await Account.findOne({
        where: { provider, providerAccountId },
      })

      if (!accountInstance) {
        return null
      }

      const userInstance = await User.findByPk(accountInstance.userId)

      return userInstance?.get({ plain: true }) ?? null
    },
    async updateUser(user) {
      await User.update(user, { where: { id: user.id } })
      const userInstance = await User.findByPk(user.id)

      if (!userInstance) {
        throw new Error("User does not exist")
      }

      return userInstance
    },
    async deleteUser(userId) {
      const userInstance = await User.findByPk(userId)

      await User.destroy({ where: { id: userId } })

      return userInstance
    },
    async linkAccount(account) {
      await Account.create(account)
    },
    async unlinkAccount({ provider, providerAccountId }) {
      await Account.destroy({
        where: { provider, providerAccountId },
      })
    },
    async createSession(session) {
      return await Session.create(session)
    },
    async getSessionAndUser(sessionToken) {
      const sessionInstance = await Session.findOne({
        where: { sessionToken },
      })

      if (!sessionInstance) {
        return null
      }

      const userInstance = await User.findByPk(sessionInstance.userId)

      if (!userInstance) {
        return null
      }

      return {
        session: sessionInstance?.get({ plain: true }),
        user: userInstance?.get({ plain: true }),
      }
    },
    async updateSession({ sessionToken, expires }) {
      await Session.update(
        { expires, sessionToken },
        { where: { sessionToken } }
      )

      return await Session.findOne({ where: { sessionToken } })
    },
    async deleteSession(sessionToken) {
      await Session.destroy({ where: { sessionToken } })
    },
    async createVerificationToken(token) {
      return await VerificationToken.create(token)
    },
    async useVerificationToken({ identifier, token }) {
      const tokenInstance = await VerificationToken.findOne({
        where: { identifier, token },
      })

      await VerificationToken.destroy({ where: { identifier } })

      return tokenInstance?.get({ plain: true }) ?? null
    },
  }
}
