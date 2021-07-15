import type * as Prisma from "@prisma/client"
import type { Adapter } from "next-auth/adapters"

// TODO: These will come from core in the appropriate methods.

const sessionMaxAgeMs = 0
const sessionUpdateAgeMs = 0

export function PrismaAdapter(p: Prisma.PrismaClient): Adapter {
  return {
    displayName: "Prisma",
    createUser: (data) => p.user.create({ data }),
    getUser: (id) => p.user.findUnique({ where: { id } }),
    getUserByEmail: (email) => p.user.findUnique({ where: { email } }),
    async getUserByProviderAccountId(provider, id) {
      const account = await p.account.findUnique({
        where: { provider_id: { provider, id } },
        select: { user: true },
      })
      return account?.user ?? null
    },
    updateUser: (data) => p.user.update({ where: { id: data.id }, data }),
    async deleteUser(id) {
      await p.user.delete({ where: { id } })
    },
    async linkAccount(userId, account) {
      await p.account.create({
        data: {
          userId,
          provider: account.provider,
          type: account.type,
          id: account.id,
          refreshToken: account.refresh_token,
          accessToken: account.access_token,
          accessTokenExpires: account.expires_in
            ? new Date(Date.now() + account.expires_in * 1000)
            : null,
        },
      })
    },

    async unlinkAccount(provider, id) {
      await p.account.delete({ where: { provider_id: { provider, id } } })
    },

    createSession: (data) => p.session.create({ data }),

    async getSession(id) {
      const session = await p.session.findUnique({ where: { id } })
      if (session && session.expires < new Date()) {
        await p.session.delete({ where: { id } })
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
      return await p.session.update({
        where: { id: session.id },
        data: {
          expires: new Date(Date.now() + sessionMaxAgeMs),
        },
      })
    },

    async deleteSession(id) {
      await p.session.delete({ where: { id } })
    },

    async createVerificationToken(data) {
      await p.verificationToken.create({ data })
    },

    useVerificationToken: (identifier_token) =>
      p.verificationToken.delete({ where: { identifier_token } }),
  }
}
