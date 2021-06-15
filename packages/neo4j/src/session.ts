import neo4j from "neo4j-driver"
import { randomBytes } from "crypto"

import { neo4jEpochToDate } from "./utils"

import { Neo4jUser } from "./user"

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
    accessToken: s.accessToken,
    sessionToken: s.sessionToken
  } AS session
`

export const createSession = async (
  neo4jSession: typeof neo4j.Session,
  user: Neo4jUser,
  sessionMaxAge: number
) => {
  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User { id: $userId })
        CREATE (s:Session  {
          id : apoc.create.uuid(),
          expires : datetime($expires),
          sessionToken : $sessionToken,
          accessToken : $accessToken
        })
        CREATE (u)-[:HAS_SESSION]->(s)
        RETURN ${sessionReturn}
        `,
        {
          userId: user.id,
          expires: new Date(Date.now() + sessionMaxAge)?.toISOString(),
          sessionToken: randomBytes(32).toString("hex"),
          accessToken: randomBytes(32).toString("hex"),
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const session = result?.records[0]?.get("session")

  return session
    ? {
        ...session,
        expires: neo4jEpochToDate(session.expires),
      }
    : null
}

export const getSession = async (
  neo4jSession: typeof neo4j.Session,
  sessionToken: string
) => {
  const result = await neo4jSession.readTransaction((tx) =>
    tx.run(
      `
      MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
      RETURN ${sessionReturn}
      `,
      { sessionToken }
    )
  )

  let session = result?.records[0]?.get("session")

  if (!session) return null

  session = {
    ...session,
    expires: neo4jEpochToDate(session.expires),
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

  return session
}

export const updateSession = async (
  neo4jSession: typeof neo4j.Session,
  session: Neo4jSession,
  force: boolean | undefined,
  sessionMaxAge: number,
  sessionUpdateAge: number
) => {
  if (
    !force &&
    Number(session.expires) - sessionMaxAge + sessionUpdateAge > Date.now()
  ) {
    return null
  }

  const result = await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
    SET s.expires = datetime($expires)
    RETURN ${sessionReturn}
    `,
      {
        sessionToken: session.sessionToken,
        expires: new Date(Date.now() + sessionMaxAge).toISOString(),
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
