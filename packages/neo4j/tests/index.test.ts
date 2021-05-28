import neo4j from "neo4j-driver"
import { Neo4jAdapter } from "../src"

import { runBasicTests } from "../../../basic-tests"

const driver: typeof neo4j.Driver = neo4j.driver("bolt://localhost")
const neo4jSession: typeof neo4j.Session = driver.session()

const neo4jAdapter = Neo4jAdapter(neo4jSession)

runBasicTests({
  adapter: neo4jAdapter,
  db: {
    async disconnect() {
      await neo4jSession.close()
    },
    session(sessionToken) {},
    expireSession(sessionToken, expires) {},
    user(id) {},
    account(providerId, providerAccountId) {},
    verificationRequest(identifier, token) {},
  },
  mock: {
    user: {
      emailVerified: new Date("2017-01-01"),
    },
  },
})
