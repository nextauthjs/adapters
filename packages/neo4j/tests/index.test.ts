import neo4j from "neo4j-driver"

import { runBasicTests } from "../../../basic-tests"

import { Neo4jAdapter } from "../src"
import { neo4jDateToJs } from "../src/utils"

const driver: typeof neo4j.Driver = neo4j.driver(
  "bolt://localhost",
  neo4j.auth.basic("neo4j", "password")
)
const neo4jSession: typeof neo4j.Session = driver.session()

const neo4jAdapter = Neo4jAdapter(neo4jSession)

runBasicTests({
  adapter: neo4jAdapter,
  db: {
    async disconnect() {
      await neo4jSession.writeTransaction((tx) =>
        tx.run(
          `MATCH (n)
          DETACH DELETE n
          RETURN count(n)`
        )
      )
      await neo4jSession.close()
      await driver.close()
    },

    async user(id) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(`MATCH (u:User { id: $id }) RETURN u`, {
          id,
        })
      )
      const dbUser = result?.records[0]?.get("u")?.properties
      if (!dbUser) return null

      return {
        ...dbUser,
        emailVerified: neo4jDateToJs(dbUser?.emailVerified),
      }
    },

    async session(sessionToken: any) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
          RETURN s, u.id AS userId`,
          {
            sessionToken,
          }
        )
      )
      const dbSession = result?.records[0]?.get("s")?.properties
      const dbUserId = result?.records[0]?.get("userId")
      if (!dbSession || !dbUserId) return null

      return {
        ...dbSession,
        expires: neo4jDateToJs(dbSession.expires),
        userId: dbUserId,
      }
    },

    async account(provider_providerAccountId) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account { 
            provider: $provider,
            providerAccountId: $providerAccountId
          })
          RETURN a, u.id AS userId`,
          provider_providerAccountId
        )
      )

      const dbAccount = result?.records[0]?.get("a")?.properties
      const dbUserId = result?.records[0]?.get("userId")
      if (!dbAccount || !dbUserId) return null

      return {
        ...dbAccount,
        userId: dbUserId,
      }
    },

    async verificationToken(identifier_token) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `
          MATCH (v:VerificationToken {
            identifier: $identifier,
            token: $token 
          })
          RETURN v
          `,
          identifier_token
        )
      )

      const dbVerificationToken = result?.records[0]?.get("v")?.properties
      if (!dbVerificationToken) return null

      return {
        ...dbVerificationToken,
        expires: neo4jDateToJs(dbVerificationToken?.expires),
      }
    },
  },
})
