import type { Session } from "neo4j-driver"
import type { Adapter } from "next-auth/adapters"
import { v4 as uuid } from "uuid"

import { client, format } from "./utils"
export { format }

export function Neo4jAdapter(session: Session): Adapter {
  const { read, write } = client(session)

  return {
    async createUser(data) {
      const user: any = { id: uuid(), ...data }
      await write(`CREATE (u:User $data)`, user)
      return user
    },

    async getUser(id) {
      return await read(`MATCH (u:User { id: $id }) RETURN properties(u)`, {
        id,
      })
    },

    async getUserByEmail(email) {
      return await read(
        `MATCH (u:User { email: $email }) RETURN properties(u)`,
        { email }
      )
    },

    async getUserByAccount(provider_providerAccountId) {
      return await read(
        `MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
           provider: $provider,
           providerAccountId: $providerAccountId
         })
         RETURN properties(u)`,
        provider_providerAccountId
      )
    },

    async updateUser(data) {
      return await write(
        `MATCH (u:User { id: $data.id })
         SET u += $data
         RETURN properties(u)`,
        data
      )
    },

    async deleteUser(id) {
      return await write(
        `MATCH (u:User { id: $data.id })
         WITH u, properties(u) AS properties
         DETACH DELETE u
         RETURN properties`,
        { id }
      )
    },

    async linkAccount(data) {
      const account = { id: uuid(), ...data }
      await write(
        `MATCH (u:User { id: $data.userId })
         MERGE (a:Account {
           providerAccountId: $data.providerAccountId,
           provider: $data.provider
         }) 
         ON CREATE SET a.id = $data.id
         SET a += $data
         MERGE (u)-[:HAS_ACCOUNT]->(a)`,
        account
      )
      return account
    },

    async unlinkAccount(provider_providerAccountId) {
      return await write(
        `MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
           providerAccountId: $data.providerAccountId,
           provider: $data.provider
         })
         WITH u, a, properties(a) AS properties
         DETACH DELETE a
         RETURN properties { .*, userId: u.id }`,
        provider_providerAccountId
      )
    },

    async createSession(data) {
      const session = { ...data, id: uuid() }
      await write(
        `MATCH (u:User { id: $data.userId })
         CREATE (s:Session $data)
         CREATE (u)-[:HAS_SESSION]->(s)`,
        session
      )
      return session
    },

    async getSessionAndUser(sessionToken) {
      const result = await write(
        `OPTIONAL MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $data.sessionToken })
         WHERE s.expires <= datetime($data.now)
         DETACH DELETE s
         WITH count(s) AS c
         MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $data.sessionToken })
         RETURN s { .*, userId: u.id } AS session, properties(u) AS user`,
        { sessionToken, now: new Date().toISOString() }
      )

      if (!result?.session || !result?.user) return null

      return {
        session: format.from<any>(result.session),
        user: format.from<any>(result.user),
      }
    },

    async updateSession(data) {
      return await write(
        `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $data.sessionToken })
         SET s += $data
         RETURN s { .*, userId: u.id }`,
        data
      )
    },

    async deleteSession(sessionToken) {
      return await write(
        `MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $data.sessionToken })
         WITH u, s, properties(s) AS properties
         DETACH DELETE s
         RETURN properties { .*, userId: u.id }`,
        { sessionToken }
      )
    },

    async createVerificationToken(data) {
      await write(
        `MERGE (v:VerificationToken {
           identifier: $data.identifier,
           token: $data.token
         })
         SET v += $data`,
        data
      )
      return data
    },

    async useVerificationToken(data) {
      const r = await write(
        `MATCH (v:VerificationToken {
           identifier: $data.identifier,
           token: $data.token
         })
         WITH v, properties(v) as properties
         DETACH DELETE v
         RETURN properties`,
        data
      )
      return format.from<any>(r?.properties)
    },
  }
}
