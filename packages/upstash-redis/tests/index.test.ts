import upstashRedisClient from "@upstash/redis"
import { runBasicTests } from "../../../basic-tests"
import UpstashRedisAdapter from "../src"

const client = upstashRedisClient(
  "https://gusc1-creative-opossum-30958.upstash.io",
  "AXjuASQgMzU3YmZiYzUtZjQ1Zi00ODZkLWE1YzgtOWUwYjE0ZTQyM2E3NjMwZmIwNGZiYTZjNDE3Nzk1NzYwMzUyZDg3YTNlYjY="
)

const reviveFromJson = (json: string) =>
  JSON.parse(json, (key, value) =>
    key === "emailVerified" || key === "expires" ? new Date(value) : value
  )

runBasicTests({
  adapter: UpstashRedisAdapter(client),
  db: {
    verificationToken: async (where) => {
      const { data } = await client.get("user:token:" + where.identifier)
      return reviveFromJson(data)
    },
    user: async (id: string) => {
      const { data } = await client.get("user:" + id)
      return reviveFromJson(data)
    },
    account: async ({ provider, providerAccountId }) => {
      const { data } = await client.get(
        `user:account:${provider}:${providerAccountId}`
      )
      return reviveFromJson(data)
    },
    session: async (sessionToken) => {
      const { data } = await client.get("user:session:" + sessionToken)
      return reviveFromJson(data)
    },
  },
})
