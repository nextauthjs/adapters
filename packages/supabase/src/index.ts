/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Account } from "next-auth"

export const formatter = {
  /** Takes a Fauna object and returns a plain old JavaScript object */
  from<T = Record<string, unknown>>(object: Record<string, any>): T {
    const newObject: Record<string, unknown> = {}
    for (const key in object) {
      const value = object[key]
      if (key === "id" || key === "userId") {
        newObject[key] = value.toString()
      } else if (typeof value === "string" && Date.parse(value)) {
        newObject[key] = new Date(value)
      } else {
        newObject[key] = value
      }
    }
    return newObject as T
  },
  to(object: Record<string, any>) {
    const newObject: Record<string, unknown> = {}
    for (const key in object) {
      const value = object[key]
      if (key === "id" || key === "userId") {
        newObject[key] = parseInt(value, 10)
      } else {
        newObject[key] = value
      }
    }
    return newObject
  },
}

export function SupabaseAdapter(client: SupabaseClient): Adapter {
  const { from, to } = formatter
  return {
    async createUser(data) {
      const result = await client
        .from<AdapterUser>("users")
        .insert(to(data))
        .single()
      return from<AdapterUser>(result.data!)
    },
    async getUser(id) {
      const result = await client
        .from<AdapterUser>("users")
        .select()
        .eq("id", id)
        .single()
      if (!result.data) return null
      return from<AdapterUser>(result.data)
    },
    async getUserByEmail(email) {
      const result = await client
        .from<AdapterUser>("users")
        .select()
        .eq("email", email)
        .single()

      if (!result.data) return null
      return from<AdapterUser>(result.data)
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await client
        .from<Account>("accounts")
        .select()
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single()

      const userId = account.data?.userId
      if (!userId) return null

      return await this.getUser(userId)
    },
    async updateUser(data) {
      const result = await client
        .from<AdapterUser>("users")
        .update(to(data))
        .eq("id", data.id)
        .single()

      return from<AdapterUser>(result.data!)
    },
    async deleteUser(id) {
      const result = await client
        .from<AdapterUser>("users")
        .delete()
        .eq("id", id)
        .single()

      return from<AdapterUser>(result.data!)
    },
    async linkAccount(data) {
      const result = await client
        .from<Account>("accounts")
        .insert(to(data))
        .single()

      return from<Account>(result.data!)
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const result = await client
        .from<Account>("accounts")
        .delete()
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single()

      return from<Account>(result.data!)
    },
    async getSessionAndUser(sessionToken) {
      const result = await client
        .from<AdapterSession & { user: AdapterUser }>("sessions")
        .select(`*, user: users(*)`)
        .eq("sessionToken", sessionToken)
        .single()

      if (!result.data) return null
      const { user, ...session } = result.data
      return { session: from(session), user: from(user) }
    },

    async createSession(data) {
      const result = await client
        .from<AdapterSession>("sessions")
        .insert(to(data))
        .single()
      return from<AdapterSession>(result.data!)
    },
    async updateSession(data) {
      const result = await client
        .from<AdapterSession>("sessions")
        .update(to(data))
        .eq("sessionToken", data.sessionToken)
        .single()
      return from<AdapterSession>(result.data!)
    },
    async deleteSession(sessionToken) {
      const result = await client
        .from<AdapterSession>("sessions")
        .delete()
        .eq("sessionToken", sessionToken)
        .single()
      return from<AdapterSession>(result.data!)
    },
    async createVerificationToken(data) {
      const result = await client
        .from<VerificationToken>("verification_tokens")
        .insert(data)
        .single()
      // @ts-expect-error
      delete result.data.id
      return from<VerificationToken>(result.data!)
    },
    async useVerificationToken({ identifier, token }) {
      const result = await client
        .from<VerificationToken>("verification_tokens")
        .delete()
        .eq("identifier", identifier)
        .eq("token", token)
        .single()
      if (!result.data) return null
      // @ts-expect-error
      delete result.data.id
      return from<VerificationToken>(result.data)
    },
  }
}
