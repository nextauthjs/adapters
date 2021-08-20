import neo4j from "neo4j-driver"
import { v4 as uuid } from "uuid"
import type { AdapterSession } from "next-auth/adapters"

import { neo4jDateToJs } from "./utils"

export const createSession = async (
  neo4jSession: typeof neo4j.Session,
  session: {
    sessionToken: string
    userId: string
    expires: Date
  }
) => {
  let result

  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User { id: $userId })
        CREATE (s:Session  {
          id           : $id,
          expires      : datetime($expires),
          sessionToken : $sessionToken
        })
        CREATE (u)-[:HAS_SESSION]->(s)
        RETURN s, u.id AS userId
        `,
        {
          userId: session.userId,
          id: uuid(),
          expires: session.expires?.toISOString(),
          sessionToken: session.sessionToken,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbSession = result?.records[0]?.get("s")?.properties
  const dbUserId = result?.records[0]?.get("userId")

  if (!dbSession || !dbUserId) return null

  return {
    ...dbSession,
    expires: neo4jDateToJs(dbSession.expires),
    userId: dbUserId,
  }
}

export const getSessionAndUser = async (
  neo4jSession: typeof neo4j.Session,
  sessionToken: string
) => {
  let result

  try {
    result = await neo4jSession.readTransaction((tx) =>
      tx.run(
        `
      MATCH 
        (u:User)
        -[:HAS_SESSION]->
        (s:Session { sessionToken: $sessionToken })
      RETURN 
        s, 
        u
      `,
        { sessionToken }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  let session = result?.records[0]?.get("s")?.properties
  let user = result?.records[0]?.get("u")?.properties

  if (!session || !user) return null

  user = {
    ...user,
    emailVerified: neo4jDateToJs(user.emailVerified),
  }

  session = {
    userId: user.id,
    ...session,
    expires: neo4jDateToJs(session.expires),
  }

  if (session.expires < new Date()) {
    try {
      await neo4jSession.writeTransaction((tx) =>
        tx.run(
          `
          MATCH (s:Session { id: $id })
          DETACH DELETE s
          RETURN count(s) 
          `,
          { id: session.id }
        )
      )
      return null
    } catch (error) {
      console.error(error)
      return null
    }
  }

  return { session, user }
}

export const updateSession = async (
  neo4jSession: typeof neo4j.Session,
  session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
) => {
  const { sessionToken, expires, ...sessionData } = session
  const expiresParsed =
    expires instanceof Date ? expires.toISOString() : expires

  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        SET 
          s += $sessionData
          ${undefined !== expires ? `, s.expires = datetime($expires)` : ``}
        RETURN s, u.id AS userId
        `,
        {
          sessionToken,
          sessionData,
          expires: expiresParsed,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbSession = result?.records[0]?.get("s")?.properties
  const dbUserId = result?.records[0]?.get("userId")

  if (!dbSession || !dbUserId) return null

  return {
    ...dbSession,
    expires: neo4jDateToJs(dbSession.expires),
    userId: dbUserId,
  }
}

export const deleteSession = async (
  neo4jSession: typeof neo4j.Session,
  sessionToken: string
) => {
  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
        WITH u, s, properties(s) AS props
        DETACH DELETE s
        RETURN props, u.id AS userId
        `,
        { sessionToken }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbSession = result?.records[0]?.get("props")
  const dbUserId = result?.records[0]?.get("userId")

  if (!dbSession || !dbUserId) return null

  return {
    ...dbSession,
    expires: neo4jDateToJs(dbSession.expires),
    userId: dbUserId,
  }
}
