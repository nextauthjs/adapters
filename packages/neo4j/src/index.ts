import neo4j from "neo4j-driver"
import type { Adapter } from "next-auth/adapters"
import { v4 as uuid } from "uuid"

import { neo4jWrap } from "./utils"

export function Neo4jAdapter(neo4jSession: typeof neo4j.Session): Adapter {
  const query = neo4jWrap(neo4jSession)

  return {
    async createUser({ emailVerified, ...userData }) {
      return await query(
        ` CREATE (u:User)
          SET
            u += $userData
            ${
              undefined !== emailVerified
                ? `, u.emailVerified = datetime($emailVerified)`
                : ``
            }
          RETURN properties(u) AS u`,
        {
          userData: { id: uuid(), ...userData },
          emailVerified,
        }
      )
    },

    async getUser(id) {
      return await query(
        `MATCH (u:User { id: $id }) RETURN properties(u) AS u`,
        {
          id,
        },
        {
          tx: "read",
        }
      )
    },

    async getUserByEmail(email) {
      return await query(
        `MATCH (u:User { email: $email }) RETURN properties(u) AS u`,
        {
          email,
        },
        {
          tx: "read",
        }
      )
    },

    async getUserByAccount(provider_providerAccountId) {
      return await query(
        ` MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
            provider: $provider,
            providerAccountId: $providerAccountId
          })
          RETURN properties(u) AS u`,
        provider_providerAccountId,
        {
          tx: "read",
        }
      )
    },

    async updateUser({ id, emailVerified, ...userData }) {
      return await query(
        ` MATCH (u:User { id: $id })
          SET
            u += $userData
            ${
              undefined !== emailVerified
                ? `, u.emailVerified = datetime($emailVerified)`
                : ``
            }
          RETURN properties(u) AS u`,
        {
          id,
          userData,
          emailVerified,
        }
      )
    },

    async deleteUser(id) {
      return await query(
        ` MATCH (u:User { id: $id })
          WITH u, properties(u) AS properties
          DETACH DELETE u
          RETURN properties AS deletedUser`,
        {
          id,
        }
      )
    },

    async linkAccount({ userId, providerAccountId, provider, ...accountData }) {
      return await query(
        ` MATCH (u:User { id: $userId })
          MERGE (a:Account { 
            providerAccountId: $providerAccountId, 
            provider: $provider 
          }) 
          ON CREATE SET a.id = $id
          SET a += $accountData
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
      return await query(
        ` MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account { 
            providerAccountId: $providerAccountId, 
            provider: $provider 
          })
          WITH u, a, properties(a) AS properties
          DETACH DELETE a 
          RETURN properties { .*, userId: u.id } AS deletedAccount`,
        provider_providerAccountId
      )
    },

    async createSession(data) {
      return await query(
        ` MATCH (u:User { id: $userId })
          CREATE (s:Session  {
            id           : $id,
            expires      : datetime($expires),
            sessionToken : $sessionToken
          })
          CREATE (u)-[:HAS_SESSION]->(s)
          RETURN s { .*, userId: u.id } AS s`,
        {
          ...data,
          id: uuid(),
        }
      )
    },

    async getSessionAndUser(sessionToken) {
      const result = await query(
        `// Delete expired session
        OPTIONAL MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        WHERE s.expires <= datetime($now)
        DETACH DELETE s
        WITH count(s) AS c
        // Valid session
        MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        RETURN s { .*, userId: u.id } AS session, properties(u) AS user`,
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
      return await query(
        `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        SET 
          s += $sessionData
          ${undefined !== expires ? `, s.expires = datetime($expires)` : ``}
        RETURN s { .*, userId: u.id } AS s`,
        {
          sessionToken,
          sessionData,
          expires,
        }
      )
    },

    async deleteSession(sessionToken) {
      return await query(
        ` MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
          WITH u, s, properties(s) AS properties
          DETACH DELETE s
          RETURN properties { .*, userId: u.id } AS deletedSession`,
        {
          sessionToken,
        }
      )
    },

    async createVerificationToken(data) {
      return await query(
        ` MERGE (v:VerificationToken {
            identifier: $identifier,
            token: $token
          })
          SET v.expires = datetime($expires)
          RETURN properties(v) AS v`,
        { ...data }
      )
    },

    async useVerificationToken(data) {
      return await query(
        ` MATCH (v:VerificationToken {
            identifier: $identifier,
            token: $token 
          })
          WITH v, properties(v) AS properties
          DETACH DELETE v
          RETURN properties AS deletedVerificationToken`,
        { ...data }
      )
    },
  }
}
