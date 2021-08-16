/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { query as q, Client as FaunaClient, Expr } from "faunadb"
import { Account } from "next-auth"
import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"

export const collections = {
  User: "users",
  Account: "accounts",
  Session: "sessions",
  VerificationToken: "verification_tokens",
} as const

export const indexes = {
  UserByAccount: "user_by_provider_account_id",
  User: "user_by_email",
  Session: "session_by_session_token",
  VerificationToken: "verification_token_by_identifier_and_token",
} as const

export function FaunaAdapter(f: FaunaClient): Adapter {
  const users = q.Collection(collections.User)
  const accounts = q.Collection(collections.Account)
  const sessions = q.Collection(collections.Session)
  const verificationTokens = q.Collection(collections.VerificationToken)

  return {
    async createUser(data) {
      const user = await query(
        f,
        q.Create(users, {
          data: {
            ...data,
            emailVerified: toFaunaDate(data.emailVerified as any),
          },
        }),
        toUser
      )
      return user!
    },
    async getUser(id) {
      const ref = q.Ref(users, id)
      const user = await query(f, q.Get(ref), toUser)
      return user
    },
    async getUserByEmail(email) {
      const ref = q.Match(q.Index(indexes.User), email)
      const user = await query(f, q.Get(ref), toUser)
      return user
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const key = [provider, providerAccountId]
      const ref = q.Match(q.Index(indexes.UserByAccount), key)
      const user = await query(
        f,
        q.Let(
          { ref },
          q.If(
            q.Exists(q.Var("ref")),
            q.Get(
              q.Ref(users, q.Select(["data", "userId"], q.Get(q.Var("ref"))))
            ),
            null
          )
        ),
        toUser
      )
      return user
    },
    async updateUser(data) {
      const ref = q.Ref(users, data.id)
      const user = await query(f, q.Update(ref, { data }), toUser)
      return user!
    },
    async deleteUser(userId) {
      const ref = q.Ref(users, userId)
      await query(f, q.Delete(ref))
      // TODO: Delete all sessions, accounts as well.
      return null
    },
    async linkAccount(data) {
      const account = await query(f, q.Create(accounts, { data }), toAccount)
      return account!
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const id = [provider, providerAccountId]
      await query(
        f,
        q.Delete(
          q.Select("ref", q.Get(q.Match(q.Index(indexes.UserByAccount), id)))
        )
      )
    },
    async createSession(data) {
      const session = await query(
        f,
        q.Create(sessions, {
          data: {
            ...data,
            expires: toFaunaDate(data.expires),
          },
        }),
        toSession
      )
      return session!
    },
    async getSessionAndUser(sessionToken) {
      const session = await query(
        f,
        q.Get(q.Match(q.Index(indexes.Session), sessionToken)),
        toSession
      )
      if (!session) return null

      const ref = q.Ref(users, session.userId)
      const user = await query(f, q.Get(ref), toUser)

      return { session, user: user! }
    },
    async updateSession(data) {
      const ref = q.Select(
        "ref",
        q.Get(q.Match(q.Index(indexes.Session), data.sessionToken))
      )
      const expires = toFaunaDate(data.expires)
      return await query(
        f,
        q.Update(ref, { data: { ...data, expires: expires } }),
        toSession
      )
    },
    async deleteSession(sessionToken) {
      const ref = q.Select(
        "ref",
        q.Get(q.Match(q.Index(indexes.Session), sessionToken))
      )
      await query(f, q.Delete(ref))
      return null
    },
    async createVerificationToken(data) {
      const verificationToken = await query(
        f,
        q.Create(verificationTokens, {
          data: {
            ...data,
            expires: toFaunaDate(data.expires),
          },
        }),
        toVerificationToken
      )

      return verificationToken!
    },
    async useVerificationToken({ identifier, token }) {
      const key = [identifier, token]
      const object = q.Get(q.Match(q.Index(indexes.VerificationToken), key))

      const verificationToken = await query(f, object, toVerificationToken)

      if (!verificationToken) return null

      // Verification tokens can be used only once
      await query(f, q.Delete(q.Select("ref", object)))

      return verificationToken
    },
  }
}

// Utils

export interface QueryResult<T> {
  data: T
  ref: { id: string }
}

export interface FaunaDate {
  value: number
}

export interface FaunaUser extends Omit<AdapterUser, "emailVerified"> {
  emailVerified: FaunaDate | null
}

export interface FaunaSession extends Omit<AdapterSession, "id" | "expires"> {
  expires: FaunaDate | null
}

export interface FaunaVerificationToken
  extends Omit<VerificationToken, "expires"> {
  expires: FaunaDate | null
}

export function toDate(date: FaunaDate | null): Date | null {
  if (!date) return null

  return new Date(date.value)
}

export function toFaunaDate(date: Date | undefined): Expr | null {
  if (date) {
    return q.Time(date.toISOString())
  }
  return null
}

export function toUser(result: QueryResult<FaunaUser>): AdapterUser {
  return {
    ...result.data,
    id: result.ref.id,
    emailVerified: toDate(result.data.emailVerified),
  }
}

export function toAccount(result: QueryResult<Account>): Account {
  return {
    ...result.data,
    id: result.ref.id,
  }
}

export function toVerificationToken(
  result: QueryResult<FaunaVerificationToken>
): VerificationToken {
  return {
    ...result.data,
    expires: toDate(result.data?.expires)!,
  }
}

export function toSession(result: QueryResult<FaunaSession>): AdapterSession {
  return {
    ...result.data,
    id: result.ref.id,
    expires: toDate(result.data.expires)!,
  }
}

/**
 * FaunaDB throws an error when something is not found in the db,
 * `next-auth` expects `null` to be returned
 */
export async function query<
  T,
  F extends ((...args: any) => any) | undefined = undefined
>(
  client: FaunaClient,
  expr: q.ExprArg,
  formatter?: F
): Promise<
  (F extends (...args: any) => any ? ReturnType<F> : QueryResult<T>) | null
> {
  try {
    const result = await client.query(expr)
    if (!result) return null
    return formatter ? formatter(result) : result
  } catch (error) {
    if (error.name === "NotFound") return null
    if (error.description?.includes("Number or numeric String expected"))
      return null

    if (process.env.NODE_ENV === "test") console.error(error)

    throw error
  }
}
