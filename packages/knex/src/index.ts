import type { Knex } from "knex"
// import type { Account } from "next-auth"
import type { AdapterUser, AdapterSession } from "next-auth/adapters"
// import type { Adapter, AdapterUser, AdapterSession, VerificationToken } from "next-auth/adapters"
import { v4 as uuidv4 } from "uuid"

export const tables = {
  Users: "users",
  Accounts: "accounts",
  Sessions: "sessions",
  VerificationTokens: "verification_tokens",
}

function isDate(s: any) {
  if (isNaN(s) && !isNaN(Date.parse(s))) return true
  else return false
}

export const format = {
  /** Takes a plain old JavaScript object and turns it into a Knex Datetime object */
  to(object: Record<string, any>) {
    const newObject: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(object)) {
      if (value instanceof Date) {
        newObject[key] = value.toISOString()
      } else {
        newObject[key] = value
      }
    }
    return newObject
  },
  /** Takes a Knex Datetime object and returns a plain old JavaScript object */
  from<T = Record<string, unknown>>(object: Record<string, any>): T {
    const newObject: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(object)) {
      if (isDate(value)) {
        newObject[key] = new Date(value)
      } else {
        newObject[key] = value
      }
    }
    return newObject as T
  },
}

export function KnexAdapter(p: Knex): any {
  // const { Users, Accounts, Sessions, VerificationTokens } = {
  const { Users, Sessions } = {
    Users: p<AdapterUser>(tables.Users),
    // Accounts: p<Account>(tables.Accounts),
    Sessions: p<AdapterSession>(tables.Sessions),
    // VerificationTokens: p<VerificationToken>(tables.VerificationTokens),
  }

  return {
    createUser: async (data: any) => {
      const user = {
        id: uuidv4(),
        ...data,
      }
      await Users.insert(format.to(user))
      return user
    },
    getUser: async (id: string) => {
      const user = await p(tables.Users).where({ id }).select()
      if (!user.length) return null
      return format.from<AdapterUser>(user[0])
    },
    getUserByEmail: async (email: string) => {
      const user = await p(tables.Users).where({ email }).select()
      if (!user.length) return null
      return format.from<AdapterUser>(user[0])
    },
    // async getUserByAccount(provider_providerAccountId) {
    //   const account = await Accounts.findUnique({
    //     where: { provider_providerAccountId },
    //     select: { user: true },
    //   })
    //   return account?.user ?? null
    // },
    // updateUser: (data) => Users.update({ where: { id: data.id }, data }),
    // deleteUser: (id) => Uses.delete({ where: { id } }),
    // linkAccount: (data) => Accounts.create({ data }) as any,
    // unlinkAccount: (provider_providerAccountId) =>
    //   Accounts.delete({ where: { provider_providerAccountId } }) as ANy,
    // async getSessionAndUser(sessionToken) {
    //   const userAndSession = await Sessions.findUnique({
    //     where: { sessionToken },
    //     include: { user: true },
    //   })
    //   if (!userAndSession) return null
    //   const { user, ...session } = userAndSession
    //   return { user, session }
    // },
    createSession: async (data: any) => {
      const session = {
        id: uuidv4(),
        ...data,
      }
      await Sessions.insert(format.to(session))
      return session
    },
    // updateSession: (data) =>
    //   Sessions.update({ data, where: { sessionToken: data.sessionToken } }),
    // deleteSession: (sessionToken) =>
    //   Sessions.delete({ where: { sessionToken } }),
    // createVerificationToken: (data) => VerificationTokens.create({ data }),
    // async useVerificationToken(identifier_token) {
    //   try {
    //     return await VerificationTokens.delete({ where: { identifier_token } })
    //   } catch (error) {
    //     // If token already used/deleted, just return null
    //     // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
    //     if (error.code === "P2025") return null
    //     throw error
    //   }
    // },
  }
}
