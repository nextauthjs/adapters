import type * as Prisma from "@prisma/client"
import type { Adapter } from "next-auth/adapters"

export function PrismaAdapter(p: Prisma.PrismaClient): Adapter {
  return {
    createUser: (data) => p.user.create({ data }),
    getUser: (id) => p.user.findUnique({ where: { id } }),
    getUserByEmail: (email) => p.user.findUnique({ where: { email } }),
    async getUserByAccount(provider_id) {
      const account = await p.account.findUnique({
        where: { provider_id },
        select: { user: true },
      })
      return account?.user ?? null
    },
    updateUser: (data) => p.user.update({ where: { id: data.id }, data }),
    deleteUser: (id) => p.user.delete({ where: { id } }),
    async linkAccount(userId, account) {
      await p.account.create({ data: { userId, ...(account as any) } })
    },
    async getSessionAndUser({ sessionId }) {
      const userAndSession = await p.session.findUnique({
        where: { id: sessionId },
        include: { user: true },
      })
      if (!userAndSession) return null
      const { user, ...session } = userAndSession
      return { user, session }
    },
    async unlinkAccount(provider_id) {
      await p.account.delete({ where: { provider_id } })
    },
    createSession: (data) => p.session.create({ data }),
    updateSession: (data) => p.session.update({ data, where: { id: data.id } }),
    deleteSession: (id) => p.session.delete({ where: { id } }),
    createVerificationToken: (data) => p.verificationToken.create({ data }),
    useVerificationToken: (identifier_token) =>
      p.verificationToken.delete({ where: { identifier_token } }),
  }
}
