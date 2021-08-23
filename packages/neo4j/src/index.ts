import neo4j from "neo4j-driver"
import type { Adapter } from "next-auth/adapters"
import { v4 as uuid } from "uuid"

import { neo4jWrap } from "./utils"

export function Neo4jAdapter(neo4jSession: typeof neo4j.Session): Adapter {
  return {
    // * * * * * * * * * * * * * * * *
    // User
    // * * * * * * * * * * * * * * * *

    async createUser({ emailVerified, ...userData }) {
      return await neo4jWrap(
        neo4jSession,
        ` CREATE (u:User)
          SET
            u += $userData
            ${
              undefined !== emailVerified
                ? `, u.emailVerified = datetime($emailVerified)`
                : ``
            }
          RETURN u`,
        {
          userData: { id: uuid(), ...userData },
          emailVerified,
        }
      )
    },

    async getUser(id) {
      return await neo4jWrap(
        neo4jSession,
        `MATCH (u:User { id: $id }) RETURN u`,
        {
          id,
        },
        {
          tx: "read",
        }
      )
    },

    async getUserByEmail(email) {
      return await neo4jWrap(
        neo4jSession,
        `MATCH (u:User { email: $email }) RETURN u`,
        {
          email,
        },
        {
          tx: "read",
        }
      )
    },

    async getUserByAccount(provider_providerAccountId) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
            provider: $provider,
            providerAccountId: $providerAccountId
          })
          RETURN u`,
        {
          ...provider_providerAccountId,
        },
        {
          tx: "read",
        }
      )
    },

    async updateUser({ id, emailVerified, ...userData }) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User { id: $id })
          SET
            u += $userData
            ${
              undefined !== emailVerified
                ? `, u.emailVerified = datetime($emailVerified)`
                : ``
            }
          RETURN u`,
        {
          id,
          userData,
          emailVerified,
        }
      )
    },

    async deleteUser(id) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User { id: $id })
          WITH u, properties(u) AS properties
          DETACH DELETE u
          RETURN { properties: properties} AS deletedUser`,
        {
          id,
        }
      )
    },

    // * * * * * * * * * * * * * * * *
    // Account
    // * * * * * * * * * * * * * * * *

    async linkAccount({ userId, providerAccountId, provider, ...accountData }) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User { id: $userId })
          MERGE (a:Account { 
            providerAccountId: $providerAccountId, 
            provider: $provider 
          }) 
          ON CREATE SET 
            a.id = $id
          SET 
            a += $accountData
          MERGE (u)-[:HAS_ACCOUNT]->(a)
          RETURN a { .*, userId: u.id } AS a`,
        {
          id: uuid(),
          userId,
          providerAccountId,
          provider,
          accountData,
        }
      )
    },

    async unlinkAccount(provider_providerAccountId) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account { 
            providerAccountId: $providerAccountId, 
            provider: $provider 
          })
          WITH u, a, properties(a) AS properties
          DETACH DELETE a 
          RETURN { properties: properties { .*, userId: u.id }} AS deletedAccount`,
        {
          ...provider_providerAccountId,
        }
      )
    },

    // * * * * * * * * * * * * * * * *
    // Session
    // * * * * * * * * * * * * * * * *

    async createSession(data) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User { id: $userId })
          CREATE (s:Session  {
            id           : $id,
            expires      : datetime($expires),
            sessionToken : $sessionToken
          })
          CREATE (u)-[:HAS_SESSION]->(s)
          RETURN { properties: s { .*, userId: u.id } } AS s`,
        {
          ...data,
          id: uuid(),
        }
      )
    },

    async getSessionAndUser(sessionToken) {
      const result = await neo4jWrap(
        neo4jSession,
        `// Delete expired session
        OPTIONAL MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        WHERE s.expires <= datetime($now)
        DETACH DELETE s
        WITH count(s) AS c
        // Valid session
        MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        RETURN { properties: s { .*, userId: u.id } } AS session, u AS user`,
        {
          sessionToken,
          now: new Date().toISOString(),
        },
        {
          returnFormat: ["session", "user"],
        }
      )
      if (!result?.session || !result?.user) return null

      return result
    },

    async updateSession({ sessionToken, expires, ...sessionData }) {
      return await neo4jWrap(
        neo4jSession,
        `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        SET 
          s += $sessionData
          ${undefined !== expires ? `, s.expires = datetime($expires)` : ``}
        RETURN { properties: s { .*, userId: u.id } } AS s`,
        {
          sessionToken,
          sessionData,
          expires,
        }
      )
    },

    async deleteSession(sessionToken) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
          WITH u, s, properties(s) AS properties
          DETACH DELETE s
          RETURN { properties: properties { .*, userId: u.id } } AS deletedSession`,
        {
          sessionToken,
        }
      )
    },

    // * * * * * * * * * * * * * * * *
    // VerificationToken
    // * * * * * * * * * * * * * * * *

    async createVerificationToken(data) {
      return await neo4jWrap(
        neo4jSession,
        ` MERGE (v:VerificationToken {
            identifier: $identifier,
            token: $token
          })
          SET v.expires = datetime($expires)
          RETURN v`,
        { ...data }
      )
    },

    async useVerificationToken(data) {
      return await neo4jWrap(
        neo4jSession,
        ` MATCH (v:VerificationToken {
            identifier: $identifier,
            token: $token 
          })
          WITH v, properties(v) AS properties
          DETACH DELETE v
          RETURN { properties: properties } AS deletedVerificationToken`,
        { ...data }
      )
    },
  }
}
