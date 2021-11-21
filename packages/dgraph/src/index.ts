import type { Adapter } from "next-auth/adapters"
import { DgraphClient } from "./dgraphClient"

import * as mutations from "./graphql/mutations"
import * as queries from "./graphql/queries"

export function DgraphAdapter(d: DgraphClient): Adapter {
  const { dgraph } = d
  return {
    // USERS
    createUser: async (data) => {
      const {
        user: [newUser],
      } = await dgraph(mutations.createUser, {
        input: {
          ...data,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      return { ...newUser, emailVerified: new Date(newUser.emailVerified) }
    },
    getUser: async (id) => {
      try {
        const user = await dgraph(queries.getUserById, { id })
        return { ...user, emailVerified: new Date(user.emailVerified) }
      } catch (error) {
        return null
      }
    },
    getUserByEmail: async (email) => {
      const [user] = await dgraph(queries.getUserByEmail, { email })
      if (!user) return null
      return { ...user, emailVerified: new Date(user.emailVerified) }
    },
    async getUserByAccount(provider_providerAccountId) {
      const [account] = await dgraph(
        queries.getUserByAccount,
        provider_providerAccountId
      )
      if (account?.user) {
        return {
          ...account.user,
          emailVerified: new Date(account.user.emailVerified),
        }
      }
      return null
    },
    updateUser: async ({ id, ...rest }) => {
      const input = { ...rest, updatedAt: new Date() }
      if (!id) return input

      const {
        user: [updatedUser],
      } = await dgraph(mutations.updateUser, { id, input })
      return updatedUser
    },
    deleteUser: async (id) => {
      const {
        user: [deletedUser],
      } = await dgraph(mutations.deleteUser, { id })
      try {
        await dgraph(mutations.deleteUserAccountsAndSessions, {
          sessions: deletedUser.sessions.map((x: any) => x.id),
          accounts: deletedUser.accounts.map((x: any) => x.id),
        })

        return deletedUser
      } catch (error) {
        return null
      }
    },

    // ACCOUNTS
    linkAccount: async ({ userId, ...rest }) => {
      const account = await dgraph(mutations.linkAccount, {
        input: {
          ...rest,
          user: {
            id: userId,
          },
        },
      })

      return { ...account, expires_at: new Date(account.expires_at).getTime() }
    },
    unlinkAccount: async (provider_providerAccountId) => {
      return await dgraph(mutations.unlinkAccount, provider_providerAccountId)
    },

    // SESSIONS
    async getSessionAndUser(sessionToken) {
      const [session] = await dgraph(queries.getSession, { sessionToken })
      if (!session) return null

      const { user, ...rest } = session
      return {
        user: { ...user, emailVerified: new Date(user.emailVerified) },
        session: {
          ...rest,
          userId: session?.user?.id || null,
          expires: new Date(session.expires),
        },
      }
    },
    createSession: async ({ userId, sessionToken, expires }) => {
      const {
        session: [newSession],
      } = await dgraph(mutations.addSession, {
        input: {
          sessionToken,
          expires,
          user: {
            id: userId,
          },
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      })
      return {
        ...newSession,
        userId: newSession.user.id,
        expires: new Date(newSession.expires),
      }
    },
    updateSession: async ({ sessionToken, ...rest }) => {
      const {
        session: [updatedSession],
      } = await dgraph(mutations.updateSession, {
        sessionToken,
        input: { ...rest, updatedAt: new Date() },
      })
      if (!updatedSession) return null
      return { ...updatedSession, userId: updatedSession.user.id }
    },
    deleteSession: async (sessionToken) =>
      await dgraph(mutations.deleteSession, { sessionToken }),

    // TOKENS
    createVerificationToken: async (data) => {
      return await dgraph(mutations.createVerificationRequest, {
        input: { ...data, createdAt: new Date(), updatedAt: new Date() },
      })
    },

    useVerificationToken: async ({ identifier, token }) => {
      const {
        verificationRequest: [request],
      } = await dgraph(mutations.deleteVerificationRequest, {
        identifier,
        token,
      })

      if (!request) return null
      return { ...request, expires: new Date(request.expires) }
    },
  }
}
export { DgraphClient }
