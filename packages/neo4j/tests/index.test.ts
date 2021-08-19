import neo4j from "neo4j-driver"

import { Neo4jAdapter } from "../src"

import { neo4jEpochToDate } from "../src/utils"

import { userReturn } from "../src/user"
import { accountReturn } from "../src/account"
import { sessionReturn } from "../src/session"
import { verificationTokenReturn } from "../src/verificationToken"

import { runBasicTests } from "../../../basic-tests"

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
          `
          MATCH (n)
          DETACH DELETE n
          RETURN count(n)
          `
        )
      )
      await neo4jSession.close()
      await driver.close()
    },
    async session(sessionToken: any) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `
          MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
          RETURN 
            s AS session, 
            s.expires.epochMillis AS sessionExpires,
            u.id AS userId
          `,
          {
            sessionToken,
          }
        )
      )
      if (!result?.records[0]) return null

      const session = result?.records[0]?.get("session")?.properties
      const sessionExpires = result?.records[0]?.get("sessionExpires")
      const userId = result?.records[0]?.get("userId")

      return {
        ...session,
        expires: neo4jEpochToDate(sessionExpires),
        userId,
      }
    },
    // async expireSession(sessionToken: any, expires: Date) {
    //   const result = await neo4jSession.writeTransaction((tx) =>
    //     tx.run(
    //       `
    //       MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
    //       SET s.expires = datetime($expires)
    //       RETURN ${sessionReturn}
    //       `,
    //       {
    //         sessionToken,
    //         expires: new Date(expires)?.toISOString(),
    //       }
    //     )
    //   )
    //   if (!result?.records[0]) {
    //     console.error(sessionToken, expires)
    //     throw new Error("Could not expire session")
    //   }
    //   const session = result?.records[0]?.get("session")
    //   return {
    //     ...session,
    //     expires: neo4jEpochToDate(session.expires),
    //   }
    // },
    async user(id) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `
          MATCH (u:User { id: $id })
          RETURN u AS user, u.emailVerified.epochMillis AS emailVerified
          `,
          {
            id,
          }
        )
      )
      if (!result?.records[0]) return null

      const dbUser = result?.records[0]?.get("user")?.properties
      const dbEmailVerified = result?.records[0]?.get("emailVerified")

      return dbUser
        ? {
            ...dbUser,
            emailVerified: neo4jEpochToDate(dbEmailVerified),
          }
        : null
    },
    async account(provider_providerAccountId) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `
          MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account { 
            provider: $provider,
            providerAccountId: $providerAccountId
          })
          RETURN a AS account, u AS user
          `,
          { ...provider_providerAccountId }
        )
      )

      const account = result?.records[0]?.get("account")?.properties
      if (!account) return null

      const user = result?.records[0]?.get("user")?.properties
      if (!user) return null

      return {
        ...account,
        userId: user.id,
        expires_at: account.expires_at,
      }
    },

    async verificationToken(identifier_token) {
      const result = await neo4jSession.readTransaction((tx) =>
        tx.run(
          `
        MATCH (v:VerificationRequest {
          identifier: $identifier,
          token: $token 
        })

        RETURN ${verificationTokenReturn}
        `,
          identifier_token
        )
      )
      if (!result?.records[0]) return null

      const verificationRequest = result.records[0].get("verificationRequest")

      return {
        ...verificationRequest,
        expires: neo4jEpochToDate(verificationRequest.expires),
      }
    },
  },
})
