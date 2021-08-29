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
    getUserByAccount: async (provider_providerAccountId: any) => {
      const account = await p(tables.Users)
        .join("accounts", "users.id", "accounts.userId")
        .where(provider_providerAccountId)
        .select(
          "users.id",
          "users.name",
          "users.email",
          "users.emailVerified",
          "users.image"
        )

      if (!account.length) return null
      return format.from(account[0])
    },
    updateUser: (data: any) =>
      p(tables.Users).update(data).where({ id: data.id }),
    deleteUser: (id: any) => p(tables.Users).del().where({ id }),
    linkAccount: async (data: any) => {
      const account = {
        id: uuidv4(),
        ...data,
      }
      await p(tables.Accounts).insert(account)
      return account
    },
    unlinkAccount: (provider_providerAccountId: any) =>
      p(tables.Accounts).del().where(provider_providerAccountId) as any,
    getSessionAndUser: async (sessionToken: any) => {
      console.log("STTTT", sessionToken)
      const userAndSession = await p(tables.Sessions)
        .join("users", "sessions.userId", "users.id")
        .where(sessionToken)
        .select(
          "users.id",
          "users.name",
          "users.email",
          "users.image",
          "users.emailVerified",
          "sessions.id",
          "sessions.sessionToken",
          "sessions.expires"
        )

      console.log("uAS", userAndSession)
      if (!userAndSession.length) return null

      const { user, ...session } = userAndSession[0]
      return { user, session }
    },
    createSession: async (data: any) => {
      const session = {
        id: uuidv4(),
        ...data,
      }
      await Sessions.insert(format.to(session))
      return session
    },
    updateSession: (data: any) =>
      p(tables.Sessions)
        .update(data)
        .where({ sessionToken: data.sessionToken }),
    deleteSession: (sessionToken: any) =>
      p(tables.Sessions).del().where({ sessionToken }),
    createVerificationToken: async (data: any) => {
      await p(tables.VerificationTokens).insert(data)
      return data
    },
    useVerificationToken: async (identifier_token: any) => {
      const { identifier, token } = identifier_token
      const data = await p(tables.VerificationTokens)
        .where({ identifier, token })
        .select()
      // MSSQL, Oracle, Postgres support 'returning' on `update()`, `delete()`, and `insert()` methods.
      // i.e. await p(tables.VerificationTokens).del().where({ identifier, token }).returning(['identifier', 'token', 'expires'])
      const rowsDeleted = await p(tables.VerificationTokens)
        .del()
        .where({ identifier, token })
      if (rowsDeleted === 1) {
        return format.from(data[0])
      }
    },
  }
}
