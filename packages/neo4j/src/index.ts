import type { Session } from "neo4j-driver"
import type { Adapter } from "next-auth/adapters"
import { v4 as uuid } from "uuid"

import { client, format } from "./utils"
export { format }

export function Neo4jAdapter(session: Session): Adapter {
  const query = client(session)

  return {
    async createUser(data) {
      const user: any = { id: uuid(), ...data }
      await query(`CREATE (u:User $u)`, { u: format.to(user) })
      return user
    },

    async getUser(id) {
      return await query(
        `MATCH (u:User { id: $id }) RETURN properties(u)`,
        { id },
        { tx: "read" }
      )
    },

    async getUserByEmail(email) {
      return await query(
        `MATCH (u:User { email: $email }) RETURN properties(u)`,
        { email },
        { tx: "read" }
      )
    },

    async getUserByAccount(provider_providerAccountId) {
      return await query(
        `MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
           provider: $provider,
           providerAccountId: $providerAccountId
         })
         RETURN properties(u)`,
        provider_providerAccountId,
        { tx: "read" }
      )
    },

    async updateUser(user) {
      return await query(
        `MATCH (u:User { id: $u.id })
         SET u += $u
         RETURN properties(u)`,
        { u: format.to(user) }
      )
    },

    async deleteUser(id) {
      return await query(
        `MATCH (u:User { id: $id })
         WITH u, properties(u) AS properties
         DETACH DELETE u
         RETURN properties`,
        { id }
      )
    },

    async linkAccount(data) {
      const account = { id: uuid(), ...data }
      await query(
        `MATCH (u:User { id: $a.userId })
         MERGE (a:Account {
           providerAccountId: $a.providerAccountId,
           provider: $a.provider 
         }) 
         ON CREATE SET a.id = $a.id
         SET a += $a
         MERGE (u)-[:HAS_ACCOUNT]->(a)`,
        { a: format.to(account) }
      )
      return account
    },

    async unlinkAccount(provider_providerAccountId) {
      return await query(
        `MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
           providerAccountId: $providerAccountId,
           provider: $provider
         })
         WITH u, a, properties(a) AS properties
         DETACH DELETE a
         RETURN properties { .*, userId: u.id }`,
        provider_providerAccountId
      )
    },

    async createSession(data) {
      const session = { ...data, id: uuid() }
      await query(
        `MATCH (u:User { id: $s.userId })
         CREATE (s:Session $s)
         CREATE (u)-[:HAS_SESSION]->(s)`,
        { s: format.to(session) }
      )
      return session
    },

    async getSessionAndUser(sessionToken) {
      const result = await query(
        `OPTIONAL MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
         WHERE s.expires <= datetime($now)
         DETACH DELETE s
         WITH count(s) AS c
         MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
         RETURN s { .*, userId: u.id } AS session, properties(u) AS user`,
        { sessionToken, now: new Date().toISOString() },
        { returnFormat: ["session", "user"] }
      )
      if (!result?.session || !result?.user) return null

      return result
    },

    async updateSession(data) {
      return await query(
        `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $s.sessionToken })
         SET s += $s
         RETURN s { .*, userId: u.id }`,
        { s: format.to(data) }
      )
    },

    async deleteSession(sessionToken) {
      return await query(
        `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
         WITH u, s, properties(s) AS properties
         DETACH DELETE s
         RETURN properties { .*, userId: u.id }`,
        { sessionToken }
      )
    },

    async createVerificationToken(data) {
      await query(
        `MERGE (v:VerificationToken {
           identifier: $v.identifier,
           token: $v.token
         })
         SET v += $v`,
        { v: format.to(data) }
      )
      return data
    },

    async useVerificationToken(data) {
      return await query(
        `MATCH (v:VerificationToken {
           identifier: $identifier,
           token: $token 
         })
         WITH v, properties(v) AS properties
         DETACH DELETE v
         RETURN properties`,
        data
      )
    },
  }
}
