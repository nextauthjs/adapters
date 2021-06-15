import neo4j from "neo4j-driver"

import { Neo4jAdapter } from "../src"

import {
  neo4jEpochToDate,
  userReturn,
  sessionReturn,
  accountReturn,
  verificationRequestReturn,
} from "../src/utils"

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
      await neo4jSession.close()
    },
    async session(sessionToken: any) {
      const result = await neo4jSession.run(
        `
            MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
            RETURN ${sessionReturn}
            `,
        {
          sessionToken,
        }
      )
      if (!result?.records[0]) return null

      const session = result?.records[0]?.get("session")

      return {
        ...session,
        expires: neo4jEpochToDate(session.expires),
      }
    },
    async expireSession(sessionToken, expires) {
      const result = await neo4jSession.run(
        `
            MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
            SET s.expires = datetime($expires)
            RETURN ${sessionReturn}
            `,
        {
          sessionToken,
          expires: new Date(expires)?.toISOString(),
        }
      )
      if (!result?.records[0]) {
        console.error(sessionToken, expires)
        throw new Error("Could not expire session")
      }
      const session = result?.records[0]?.get("session")
      return {
        ...session,
        expires: neo4jEpochToDate(session.expires),
      }
    },
    async user(id) {
      const result = await neo4jSession.run(
        `
        MATCH (u:User { id: $id })
        RETURN ${userReturn}
        `,
        {
          id,
        }
      )
      if (!result?.records[0]) return null

      const user = result.records[0].get("user")

      return {
        ...user,
        emailVerified: neo4jEpochToDate(user.emailVerified),
      }
    },
    async account(providerId: any, providerAccountId: any) {
      const result = await neo4jSession.run(
        `
            MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account { 
              providerId: $providerId, 
              providerAccountId: $providerAccountId 
            })
            RETURN ${accountReturn}
            `,
        {
          providerId,
          providerAccountId,
        }
      )
      if (!result?.records[0]) return null

      const account = result.records[0].get("account")

      return {
        ...account,
        accessTokenExpires: neo4jEpochToDate(account.accessTokenExpires),
      }
    },
    async verificationRequest(identifier: any, token: any) {
      const result = await neo4jSession.run(
        `
        MATCH (v:VerificationRequest {
          identifier: $identifier,
          token: $token 
        })

        RETURN ${verificationRequestReturn}
        `,
        {
          identifier,
          token,
        }
      )
      if (!result?.records[0]) return null

      const verificationRequest = result.records[0].get("verificationRequest")

      return {
        ...verificationRequest,
        expires: neo4jEpochToDate(verificationRequest.expires),
      }
    },
  },
  mock: {
    user: {
      emailVerified: new Date("2017-01-01"),
    },
  },
})
