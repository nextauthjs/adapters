import upstashRedisClient from "@upstash/redis"
import { runBasicTests } from "../../../basic-tests"
import UpstashRedisAdapter from "../src"

const redisClient = upstashRedisClient(
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN"
)

runBasicTests({
  adapter: UpstashRedisAdapter(redisClient),
  db: {
    connect: async () => {},
    verificationToken: async (where) => {},
    user: async (id) => {},
    account: async (where) => {},
    session: async (sessionToken) => {},
  },
})
