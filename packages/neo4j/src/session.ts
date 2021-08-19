import neo4j from "neo4j-driver"
import { randomBytes } from "crypto"
import { v4 as uuid } from "uuid"
import type { AdapterSession } from "next-auth/adapters"

import { neo4jEpochToDate } from "./utils"

import { userReturn } from "./user"

export interface Neo4jSession {
  id: string
  userId: string
  expires: Date | string
  sessionToken: string
  accessToken: string
}

export const sessionReturn = `
  {
    userId: u.id,
    id: s.id,
    expires: s.expires.epochMillis, 
    sessionToken: s.sessionToken
  } AS session
`

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
        RETURN 
          s AS session,
          u.id AS userId
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

  const dbSession = result?.records[0]?.get("session")?.properties
  const dbUserId = result?.records[0]?.get("userId")

  return dbSession && dbUserId
    ? {
        ...dbSession,
        expires: neo4jEpochToDate(dbSession.expires),
        userId: dbUserId,
      }
    : null
}

export const getSessionAndUser = async (
  neo4jSession: typeof neo4j.Session,
  sessionToken: string
) => {
  const result = await neo4jSession.readTransaction((tx) =>
    tx.run(
      `
      MATCH 
        (u:User)
        -[:HAS_SESSION]->
        (s:Session { sessionToken: $sessionToken })
      RETURN 
        s AS session, 
        s.expires.epochMillis AS sessionExpires,
        u AS user,
        u.emailVerified.epochMillis AS userEmailVerified
      `,
      { sessionToken }
    )
  )

  let user = result?.records[0]?.get("user")?.properties
  const userEmailVerified = result?.records[0]?.get("userEmailVerified")
  if (!user) return null

  user = {
    ...user,
    emailVerified: neo4jEpochToDate(userEmailVerified),
  }

  let session = result?.records[0]?.get("session")?.properties
  const sessionExpires = result?.records[0]?.get("sessionExpires")
  if (!session) return null

  session = {
    ...session,
    expires: neo4jEpochToDate(sessionExpires),
    userId: user.id,
  }

  if (session.expires < new Date()) {
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
  }

  return { session, user }
}

export const updateSession = async (
  neo4jSession: typeof neo4j.Session,
  session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
) => {
  // TODO: remove
  // if (
  //   !force &&
  //   Number(session.expires) - sessionMaxAge + sessionUpdateAge > Date.now()
  // ) {
  //   return null
  // }

  const result = await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
    SET 
      s.expires = datetime($expires)
    RETURN ${sessionReturn}
    `,
      {
        sessionToken: session.sessionToken,
        expires: session.expires?.toISOString(),
      }
    )
  )

  const updatedSession = result?.records[0]?.get("session")

  return updatedSession
    ? {
        ...updatedSession,
        expires: neo4jEpochToDate(updatedSession.expires),
      }
    : null
}

export const deleteSession = async (
  neo4jSession: typeof neo4j.Session,
  sessionToken: string
) => {
  await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    MATCH (s:Session { sessionToken: $sessionToken })
    DETACH DELETE s
    RETURN count(s)
    `,
      { sessionToken }
    )
  )
}
