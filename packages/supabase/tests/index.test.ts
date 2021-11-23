/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { runBasicTests } from "../../../basic-tests"
import { formatter, SupabaseAdapter } from "../src"
import { createClient } from "@supabase/supabase-js"
import {
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"

import { Account } from "next-auth"

const supabaseKey =
  "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJzdXBhYmFzZSIsImlhdCI6MTYwMzk2ODgzNCwiZXhwIjoyNTUwNjUzNjM0LCJyb2xlIjoiYW5vbiJ9.36fUebxgx1mcBo4s19v0SzqmzunP--hm_hep0uLX0ew"

export const client = createClient("http://localhost:8000", supabaseKey)
runBasicTests({
  adapter: SupabaseAdapter(client),
  db: {
    async disconnect() {
      await client.from("users").delete()
      await client.from("accounts").delete()
      await client.from("sessions").delete()
      await client.from("verification_tokens").delete()
    },
    async user(id) {
      const result = await client
        .from<AdapterUser>("users")
        .select()
        .eq("id", id)
        .single()
      if (!result.data) return null
      return formatter.from(result.data)
    },
    async account({ provider, providerAccountId }) {
      const result = await client
        .from<Account>("accounts")
        .select()
        .eq("provider", provider)
        .eq("providerAccountId", providerAccountId)
        .single()

      if (!result.data) return null
      return formatter.from(result.data)
    },
    async session(sessionToken) {
      const result = await client
        .from<AdapterSession>("sessions")
        .select()
        .eq("sessionToken", sessionToken)
        .single()
      if (!result.data) return null
      return formatter.from(result.data)
    },
    async verificationToken({ identifier, token }) {
      const result = await client
        .from<VerificationToken>("verification_tokens")
        .select()
        .eq("identifier", identifier)
        .eq("token", token)
        .single()
      if (!result.data) return null
      // @ts-expect-error
      delete result.data.id
      return formatter.from(result.data)
    },
  },
})
