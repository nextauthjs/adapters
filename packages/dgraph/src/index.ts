import type { Adapter } from "next-auth/adapters"
import { DgraphClient } from "./dgraphClient"
import * as mutations from "./graphql/mutations"
import * as queries from "./graphql/queries"

export function DgraphAdapter(d: DgraphClient): Adapter {
  const { dgraph, userFragment } = d
  return {
    // USERS
    createUser: async (input) => {
      const {
        user: [newUser],
      } = await dgraph(mutations.createUser(userFragment), {
        input,
      })
      return { ...newUser, emailVerified: new Date(newUser.emailVerified) }
    },
    getUser: async (id) => {
      const user = await dgraph(queries.getUserById(userFragment), { id })
      if (!user) return null
      return { ...user, emailVerified: new Date(user.emailVerified) }
    },
    getUserByEmail: async (email) => {
      const [user] = await dgraph(queries.getUserByEmail(userFragment), {
        email,
      })
      if (!user) return null
      return { ...user, emailVerified: new Date(user.emailVerified) }
    },
    async getUserByAccount(provider_providerAccountId) {
      const [account] = await dgraph(
        queries.getUserByAccount(userFragment),
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
    updateUser: async ({ id, ...input }) => {
      if (!id) return input

      const {
        user: [updatedUser],
      } = await dgraph(mutations.updateUser(userFragment), { id, input })
      return updatedUser
    },
    deleteUser: async (id) => {
      const {
        user: [deletedUser],
      } = await dgraph(mutations.deleteUser, { id })

      await dgraph(mutations.deleteUserAccountsAndSessions, {
        sessions: deletedUser.sessions.map((x: any) => x.id),
        accounts: deletedUser.accounts.map((x: any) => x.id),
      })

      return deletedUser
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
      const [sessionAndUser] = await dgraph(queries.getSession(userFragment), {
        sessionToken,
      })
      if (!sessionAndUser) return null

      const { user, ...session } = sessionAndUser
      return {
        user: { ...user, emailVerified: new Date(user.emailVerified) },
        session: {
          ...session,
          userId: user?.id || null,
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
        },
      })
      return {
        ...newSession,
        userId: newSession.user.id,
        expires: new Date(newSession.expires),
      }
    },
    updateSession: async ({ sessionToken, ...input }) => {
      const {
        session: [updatedSession],
      } = await dgraph(mutations.updateSession, {
        sessionToken,
        input,
      })
      if (!updatedSession) return null
      return { ...updatedSession, userId: updatedSession.user.id }
    },
    deleteSession: async (sessionToken) =>
      await dgraph(mutations.deleteSession, { sessionToken }),

    // TOKENS
    createVerificationToken: async (input) => {
      return await dgraph(mutations.createVerificationRequest, {
        input,
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
