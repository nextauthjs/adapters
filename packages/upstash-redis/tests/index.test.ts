import upstashRedisClient from "@upstash/redis"
import { runBasicTests } from "../../../basic-tests"
import UpstashRedisAdapter from "../src"

const client = upstashRedisClient(
  "<UPSTASH_REDIS_REST_API_URL>",
  "<UPSTASH_REDIS_API_KEY>"
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
