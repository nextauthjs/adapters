import type { Account as ApadterAccount, Awaitable } from "next-auth"
import type { Adapter, AdapterUser, AdapterSession } from "next-auth/adapters"
import type { Upstash } from "@upstash/redis/src/types"

export default function UpstashRedisAdapter(redisClient: Upstash): Adapter {
  const adapter: Adapter = {
    createUser: function (
      user: Omit<AdapterUser, "id">
    ): Awaitable<AdapterUser> {
      throw new Error("Function not implemented.")
    },
    getUser: function (id: string): Awaitable<AdapterUser | null> {
      throw new Error("Function not implemented.")
    },
    getUserByEmail: function (email: string): Awaitable<AdapterUser | null> {
      throw new Error("Function not implemented.")
    },
    getUserByAccount: function (
      providerAccountId: Pick<ApadterAccount, "provider" | "providerAccountId">
    ): Awaitable<AdapterUser | null> {
      throw new Error("Function not implemented.")
    },
    updateUser: function (user: Partial<AdapterUser>): Awaitable<AdapterUser> {
      throw new Error("Function not implemented.")
    },
    linkAccount: function (
      account: ApadterAccount
    ): Promise<void> | Awaitable<ApadterAccount | null | undefined> {
      throw new Error("Function not implemented.")
    },
    createSession: function (session: {
      sessionToken: string
      userId: string
      expires: Date
    }): Awaitable<AdapterSession> {
      throw new Error("Function not implemented.")
    },
    getSessionAndUser: function (
      sessionToken: string
    ): Awaitable<{ session: AdapterSession; user: AdapterUser } | null> {
      throw new Error("Function not implemented.")
    },
    updateSession: function (
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Awaitable<AdapterSession | null | undefined> {
      throw new Error("Function not implemented.")
    },
    deleteSession: function (
      sessionToken: string
    ): Promise<void> | Awaitable<AdapterSession | null | undefined> {
      throw new Error("Function not implemented.")
    },
  }

  return adapter
}
