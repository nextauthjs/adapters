import type { Adapter } from "next-auth/adapters"
import { DgraphClient } from "./dgraphClient"

export function DgraphAdapter(d: DgraphClient): Adapter {
  return {
    // USERS
    createUser: async (data) =>
      await d.createUser({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    getUser: async (id) => await d.getUserById(id),
    getUserByEmail: async (email) => await d.getUserByEmail(email),
    async getUserByAccount(provider_providerAccountId) {
      const user = await d.getUserByAccount(provider_providerAccountId)

      return user
    },
    updateUser: async ({ id, ...rest }) =>
      await d.updateUser(id, { ...rest, updatedAt: new Date() }),
    deleteUser: async (id) => await d.deleteUser(id),

    // ACCOUNTS
    linkAccount: async ({ userId, ...rest }) => {
      const account = await d.linkAccount(userId, rest)
      return { ...account, expires_at: new Date(account.expires_at).getTime() }
    },
    unlinkAccount: async (provider_providerAccountId) =>
      await d.unlinkAccount(provider_providerAccountId),

    // SESSIONS
    async getSessionAndUser(sessionToken) {
      const userAndSession = await d.getSession(sessionToken)
      if (!userAndSession) return null
      const { user, ...session } = userAndSession
      return {
        user: { ...user, emailVerified: new Date(user.emailVerified) },
        session: { ...session, expires: new Date(session.expires) },
      }
    },
    createSession: async ({ userId, sessionToken, expires }) => {
      return await d.createSession({
        sessionToken,
        expires,
        user: {
          id: userId,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      })
    },
    updateSession: async ({ sessionToken, ...rest }) => {
      return await d.updateSession(sessionToken, {
        ...rest,
        updatedAt: new Date(),
      })
    },
    deleteSession: async (sessionToken) => await d.deleteSession(sessionToken),

    // TOKENS
    createVerificationToken: async (data) =>
      await d.createVerificationRequest({
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    useVerificationToken: async (identifier_token) =>
      await d.deleteVerificationRequest(identifier_token),
  }
}
export { DgraphClient }
