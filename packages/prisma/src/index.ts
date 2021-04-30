import type * as Prisma from "@prisma/client"
import { createHash, randomBytes } from "crypto"
import type { Profile } from "next-auth"
import type { Adapter } from "next-auth/adapters"

function verificationRequestToken({
  token,
  secret,
}: {
  token: string
  secret: string
}) {
  // TODO: Use bcrypt or a more secure method
  return createHash("sha256").update(`${token}${secret}`).digest("hex")
}

const PrismaAdapter: Adapter<
  { prisma: Prisma.PrismaClient },
  never,
  Prisma.User,
  Profile & { emailVerified?: Date },
  Prisma.Session
> = ({ prisma }) => {
  return {
    async getAdapter({ logger, session, ...appOptions }) {
      function debug(debugCode: string, ...args: unknown[]) {
        logger.debug(`PRISMA_${debugCode}`, ...args)
      }

      if (!session.maxAge) {
        debug(
          "GET_ADAPTER",
          "Session expiry not configured (defaulting to 30 days)"
        )
      }
      if (!session.updateAge) {
        debug(
          "GET_ADAPTER",
          "Session update age not configured (defaulting to 1 day)"
        )
      }

      const {
        maxAge = 30 * 24 * 60 * 60, // 30 days
        updateAge = 24 * 60 * 60, // 1 day
      } = session

      const sessionMaxAgeMs = maxAge * 1000
      const sessionUpdateAgeMs = updateAge * 1000

      return {
        createUser(profile) {
          return prisma.user.create({
            data: {
              name: profile.name,
              email: profile.email,
              image: profile.image,
              emailVerified: profile.emailVerified?.toISOString() ?? null,
            },
          })
        },

        getUser(id) {
          return prisma.user.findUnique({
            where: { id },
          })
        },

        getUserByEmail(email) {
          if (!email) return Promise.resolve(null)
          return prisma.user.findUnique({ where: { email } })
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const account = await prisma.account.findUnique({
            where: {
              providerId_providerAccountId: { providerId, providerAccountId },
            },
            select: { user: true },
          })
          return account?.user ?? null
        },

        updateUser(user) {
          return prisma.user.update({
            where: { id: user.id },
            data: {
              name: user.name,
              email: user.email,
              image: user.image,
              emailVerified: user.emailVerified?.toISOString() ?? null,
            },
          })
        },

        async deleteUser(userId) {
          await prisma.user.delete({
            where: { id: userId },
          })
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
          await prisma.account.create({
            data: {
              userId,
              providerId,
              providerType,
              providerAccountId,
              refreshToken,
              accessToken,
              accessTokenExpires:
                accessTokenExpires != null
                  ? new Date(accessTokenExpires)
                  : null,
            },
          })
        },

        async unlinkAccount(_, providerId, providerAccountId) {
          await prisma.account.delete({
            where: {
              providerId_providerAccountId: { providerId, providerAccountId },
            },
          })
        },

        createSession(user) {
          return prisma.session.create({
            data: {
              userId: user.id,
              expires: new Date(Date.now() + sessionMaxAgeMs),
              sessionToken: randomBytes(32).toString("hex"),
              accessToken: randomBytes(32).toString("hex"),
            },
          })
        },

        async getSession(sessionToken) {
          const session = await prisma.session.findUnique({
            where: { sessionToken },
          })
          if (session && session.expires < new Date()) {
            await prisma.session.delete({ where: { sessionToken } })
            return null
          }
          return session
        },

        async updateSession(session, force) {
          if (
            !force &&
            Number(session.expires) - sessionMaxAgeMs + sessionUpdateAgeMs >
              Date.now()
          ) {
            return null
          }
          return await prisma.session.update({
            where: { id: session.id },
            data: {
              expires: new Date(Date.now() + sessionMaxAgeMs),
            },
          })
        },

        async deleteSession(sessionToken) {
          await prisma.session.delete({ where: { sessionToken } })
        },

        async createVerificationRequest(
          identifier,
          url,
          token,
          secret,
          provider
        ) {
          const hashedToken = verificationRequestToken({ token, secret })
          await prisma.verificationRequest.create({
            data: {
              identifier,
              token: hashedToken,
              expires: new Date(Date.now() + provider.maxAge * 1000),
            },
          })
          await provider.sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })
        },

        async getVerificationRequest(identifier, token, secret) {
          const hashedToken = verificationRequestToken({ token, secret })
          const verificationRequest = await prisma.verificationRequest.findUnique(
            {
              where: { identifier_token: { identifier, token: hashedToken } },
            }
          )
          if (verificationRequest && verificationRequest.expires < new Date()) {
            await prisma.verificationRequest.delete({
              where: { identifier_token: { identifier, token: hashedToken } },
            })
            return null
          }
          return verificationRequest
        },

        async deleteVerificationRequest(identifier, token, secret) {
          const hashedToken = verificationRequestToken({ token, secret })
          await prisma.verificationRequest.delete({
            where: { identifier_token: { identifier, token: hashedToken } },
          })
        },
      }
    },
  }
}

export default PrismaAdapter
