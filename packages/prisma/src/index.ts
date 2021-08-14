import type * as Prisma from "@prisma/client"
import type { Adapter } from "next-auth/adapters"

export function PrismaAdapter(p: Prisma.PrismaClient): Adapter {
  return {
    createUser: (data) => p.user.create({ data }),
    getUser: (id) => p.user.findUnique({ where: { id } }),
    getUserByEmail: (email) => p.user.findUnique({ where: { email } }),
    async getUserByAccount(provider_providerAccountId) {
      const account = await p.account.findUnique({
        where: { provider_providerAccountId },
        select: { user: true },
      })
      return account?.user ?? null
    },
    updateUser: (data) => p.user.update({ where: { id: data.id }, data }),
    deleteUser: (id) => p.user.delete({ where: { id } }),
    linkAccount: (data) => p.account.create({ data }) as any,
    unlinkAccount: (provider_providerAccountId) =>
      p.account.delete({ where: { provider_providerAccountId } }) as any,
    async getSessionAndUser(sessionToken) {
      const userAndSession = await p.session.findUnique({
        where: { sessionToken },
        include: { user: true },
      })
      if (!userAndSession) return null
      const { user, ...session } = userAndSession
      return { user, session }
    },
    createSession: (data) => p.session.create({ data }),
    updateSession: (data) => p.session.update({ data, where: { id: data.id } }),
    deleteSession: (id) => p.session.delete({ where: { id } }),
    createVerificationToken: (data) => p.verificationToken.create({ data }),
    useVerificationToken: (identifier_token) =>
      p.verificationToken.delete({ where: { identifier_token } }),
  }
}
