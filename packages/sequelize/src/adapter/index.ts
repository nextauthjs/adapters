import { createHash, randomBytes } from "crypto"
import type { User, Profile, Session } from "next-auth"
import type { Adapter } from "next-auth/adapters"

interface SequelizeModels {
  [index: string]: any
}

export const SequelizeAdapter: Adapter<
  SequelizeModels,
  never,
  User & { emailVerified?: Date },
  Profile & { emailVerified?: Date },
  Session & {
    userId: string
    expires: Date
    sessionToken: string
    accessToken: string
  }
> = ({ models }) => {
  return {
    async getAdapter({ session, secret, ...appOptions }) {
      const sessionMaxAge = session.maxAge * 1000
      const sessionUpdateAge = session.updateAge * 1000

      const hashToken = (token: string) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "SEQUELIZE",

        async createUser(profile) {
          await models.User.create({
            name: profile.name,
            email: profile.email,
            image: profile.image,
            emailVerified: profile.emailVerified
              ? profile.emailVerified.toISOString()
              : null,
          })

          return await models.User.findOne({ where: { name: profile.name } })
        },

        getUser(id) {
          return models.User.findOne({ where: { id } })
        },

        getUserByEmail(email) {
          if (!email) return Promise.resolve(null)
          return models.User.findOne({ where: { email } })
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const account = await models.Account.findOne({
            where: { providerId, providerAccountId: `${providerAccountId}` },
          })
          return account?.user ?? null
        },

        async updateUser(user) {
          await models.User.update(
            {
              name: user.name,
              email: user.email,
              image: user.image,
              emailVerified: user.emailVerified?.toISOString() ?? null,
            },
            {
              where: {
                id: user.id,
              },
            }
          )
          return models.User.findOne({ where: { id: user.id } })
        },

        async deleteUser(userId) {
          await models.User.destroy({ where: { id: userId } })
        },

        async linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          return await models.Account.create({
            accessToken,
            refreshToken,
            providerAccountId: `${providerAccountId}`,
            providerId,
            providerType,
            accessTokenExpires,
            userId,
          })
        },

        async unlinkAccount(_, providerId, providerAccountId) {
          return await models.Account.destroy({
            where: { providerId, providerAccountId },
          })
        },

        async createSession(user) {
          await models.Session.create({
            userId: user.id,
            expires: new Date(Date.now() + sessionMaxAge),
            sessionToken: randomBytes(32).toString("hex"),
            accessToken: randomBytes(32).toString("hex"),
          })

          return await models.Session.findOne({ where: { userId: user.id } })
        },

        async getSession(sessionToken) {
          const session = await models.Session.findOne({
            where: { sessionToken },
          })
          if (session && session.expires < new Date()) {
            await models.Session.destroy({ where: { sessionToken } })
            return null
          }
          return session
        },

        async updateSession(session, force) {
          const { expires, id } = session
          if (
            !force &&
            Number(expires) - sessionMaxAge + sessionUpdateAge > Date.now()
          ) {
            return null
          }

          await models.Session.update(
            { expires: new Date(Date.now() + sessionMaxAge) },
            {
              where: { id },
            }
          )

          return await models.Session.findOne({
            where: { id },
          })
        },

        async deleteSession(sessionToken) {
          await models.Session.destroy({ where: { sessionToken } })
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          await models.VerificationRequest.create({
            identifier,
            token: hashToken(token),
            expires: new Date(Date.now() + provider.maxAge * 1000),
          })

          await provider.sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })
        },

        async getVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)
          const verificationRequest = await models.VerificationRequest.findOne({
            where: { identifier, token: hashedToken },
          })
          if (verificationRequest && verificationRequest.expires < new Date()) {
            await models.VerificationRequest.destroy({
              where: { token: hashedToken },
            })
            return null
          }
          return verificationRequest
        },

        async deleteVerificationRequest(identifier, token) {
          await await models.VerificationRequest.destroy({
            where: { identifier, token: hashToken(token) },
          })
        },
      }
    },
  }
}
