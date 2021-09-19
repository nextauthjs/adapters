import type { Account as ApadterAccount } from "next-auth"
import type {
  Adapter,
  AdapterUser,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters"
import { Sequelize, Model, ModelCtor } from "sequelize"
import {
  accountSchema,
  userSchema,
  sessionSchema,
  verificationTokenSchema,
} from "./schema"

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

export { accountSchema, userSchema, sessionSchema, verificationTokenSchema }

export default function SequelizeAdapter(client: Sequelize): Adapter {
  const tableOptions = { underscored: true, timestamps: false }

  const Account =
    (client.models.Account as ModelCtor<any>) ||
    client.define<AccountInstance>("account", accountSchema, tableOptions)
  const User =
    (client.models.User as ModelCtor<any>) ||
    client.define<UserInstance>("user", userSchema, tableOptions)
  const Session =
    (client.models.Session as ModelCtor<any>) ||
    client.define<SessionInstance>("session", sessionSchema, tableOptions)
  const VerificationToken =
    (client.models.VerificationToken as ModelCtor<any>) ||
    client.define<VerificationTokenInstance>(
      "verificationToken",
      verificationTokenSchema,
      tableOptions
    )

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
