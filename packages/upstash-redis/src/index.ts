import type { Account as AdapterAccount } from "next-auth"
import type {
  Adapter,
  AdapterUser,
  AdapterSession,
  VerificationToken,
} from "next-auth/adapters"
import type { Upstash } from "@upstash/redis/src/types"
import * as uuid from "uuid"

export interface UpstashRedisAdapterOptions {
  accountKeyPrefix?: string
  accountByUserIdPrefix?: string
  emailKeyPrefix?: string
  sessionKeyPrefix?: string
  sessionByUserIdKeyPrefix?: string
  userKeyPrefix?: string
  verificationTokenKeyPrefix?: string
}

const defaultOptions = {
  accountKeyPrefix: "user:account:",
  accountByUserIdPrefix: "user:account:by-user-id",
  emailKeyPrefix: "user:email:",
  sessionKeyPrefix: "user:session:",
  sessionByUserIdKeyPrefix: "user:session:by-user-id:",
  userKeyPrefix: "user:",
  verificationTokenKeyPrefix: "user:token:",
}

export default function UpstashRedisAdapter(
  client: Upstash,
  options: UpstashRedisAdapterOptions = {}
): Adapter {
  const {
    accountKeyPrefix,
    accountByUserIdPrefix,
    emailKeyPrefix,
    sessionKeyPrefix,
    sessionByUserIdKeyPrefix,
    userKeyPrefix,
    verificationTokenKeyPrefix,
  } = {
    ...defaultOptions,
    ...options,
  }

  const reviveFromJson = (json: string) =>
    JSON.parse(json, (key, value) =>
      key === "emailVerified" || key === "expires" ? new Date(value) : value
    )

  const setObjectAsJson = async (key: string, obj: any) =>
    await client.set(key, JSON.stringify(obj))

  // del has wrong signature in TypeScript
  // Upstash service rejects string[] and requires string
  // @ts-expect-error
  const delKeys = async (keys: string[]) => await client.del.apply(client, keys)

  const setAccount = async (id: string, account: AdapterAccount) => {
    await setObjectAsJson(accountKeyPrefix + id, account)
    await client.set(
      accountByUserIdPrefix + account.userId,
      accountKeyPrefix + id
    )
    return account
  }

  const getAccount = async (id: string) => {
    const response = await client.get(accountKeyPrefix + id)
    if (!response.data) return null
    return reviveFromJson(response.data)
  }

  const setSession = async (id: string, session: AdapterSession) => {
    await setObjectAsJson(sessionKeyPrefix + id, session)
    await client.set(
      sessionByUserIdKeyPrefix + session.userId,
      sessionKeyPrefix + id
    )
    return session
  }

  const getSession = async (id: string) => {
    const response = await client.get(sessionKeyPrefix + id)
    if (!response.data) return null
    return reviveFromJson(response.data)
  }

  const setUser = async (id: string, user: AdapterUser) => {
    await setObjectAsJson(userKeyPrefix + id, user)
    await client.set(`${emailKeyPrefix}${user.email as string}`, id)
    return user
  }

  const getUser = async (id: string) => {
    const response = await client.get(userKeyPrefix + id)
    if (!response.data) return null
    return reviveFromJson(response.data)
  }

  const adapter: Adapter = {
    createUser: async (user: Omit<AdapterUser, "id">): Promise<AdapterUser> => {
      const id = uuid.v4()
      // TypeScript thinks the emailVerified field is missing
      // but all fields are copied directly from user, so it's there
      // @ts-expect-error
      return await setUser(id, { ...user, id })
    },
    getUser,
    getUserByEmail: async (email: string): Promise<AdapterUser | null> => {
      const emailResponse = await client.get(emailKeyPrefix + email)
      if (!emailResponse.data) return null
      return await getUser(emailResponse.data)
    },
    getUserByAccount: async (
      account: Pick<AdapterAccount, "provider" | "providerAccountId">
    ): Promise<AdapterUser | null> => {
      const dbAccount = await getAccount(
        `${account.provider}:${account.providerAccountId}`
      )
      if (!dbAccount) return null
      return await getUser(dbAccount.userId)
    },
    updateUser: async (updates: Partial<AdapterUser>): Promise<AdapterUser> => {
      const userId = updates.id as string
      const user = await getUser(userId)
      return await setUser(userId, { ...user, ...updates })
    },
    linkAccount: async (account: AdapterAccount): Promise<AdapterAccount> => {
      const id = `${account.provider}:${account.providerAccountId}`
      return await setAccount(id, { ...account, id })
    },
    createSession: async (session: {
      sessionToken: string
      userId: string
      expires: Date
    }): Promise<AdapterSession> => {
      const id = session.sessionToken
      return await setSession(id, { ...session, id })
    },
    getSessionAndUser: async (
      sessionToken: string
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> => {
      const session = await getSession(sessionToken)
      if (!session) return null
      const user = await getUser(session.userId)
      if (!user) return null
      return { session, user }
    },
    updateSession: async (
      updates: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null> => {
      const session = await getSession(updates.sessionToken)
      if (!session) return null
      return await setSession(updates.sessionToken, { ...session, ...updates })
    },
    deleteSession: async (sessionToken: string) => {
      await delKeys([sessionKeyPrefix + sessionToken])
    },
    createVerificationToken: async (
      verificationToken: VerificationToken
    ): Promise<VerificationToken> => {
      await setObjectAsJson(
        verificationTokenKeyPrefix + verificationToken.identifier,
        verificationToken
      )
      return verificationToken
    },
    useVerificationToken: async (verificationToken: {
      identifier: string
    }): Promise<VerificationToken | null> => {
      const tokenKey = verificationTokenKeyPrefix + verificationToken.identifier
      const tokenResponse = await client.get(tokenKey)
      if (!tokenResponse.data) return null
      await delKeys([tokenKey])
      return reviveFromJson(tokenResponse.data)
    },
    unlinkAccount: async (
      account: Pick<AdapterAccount, "provider" | "providerAccountId">
    ) => {
      const id = `${account.provider}:${account.providerAccountId}`
      const dbAccount = await getAccount(id)
      if (!dbAccount) return
      const accountKey = `${accountKeyPrefix}${id}`
      await delKeys([
        accountKey,
        `${accountByUserIdPrefix} + ${dbAccount.userId as string}`,
      ])
    },
    deleteUser: async (userId: string) => {
      const user = await getUser(userId)
      if (!user) return
      const accountByUserKey = accountByUserIdPrefix + userId
      const accountRequest = await client.get(accountByUserKey)
      const accountKey = accountRequest.data
      const sessionByUserIdKey = sessionByUserIdKeyPrefix + userId
      const sessionRequest = await client.get(sessionByUserIdKey)
      const sessionKey = sessionRequest.data
      await delKeys([
        userKeyPrefix + userId,
        `${emailKeyPrefix}${user.email as string}`,
        accountKey,
        accountByUserKey,
        sessionKey,
        sessionByUserIdKey,
      ])
    },
  }
  return adapter
}
