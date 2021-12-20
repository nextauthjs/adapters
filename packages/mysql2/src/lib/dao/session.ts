import type { ResultSetHeader, RowDataPacket } from "mysql2"
import type { AdapterSession } from "next-auth/adapters"
import type { ConnectionType } from "../../types"
import { v4 as uuidv4 } from "uuid"

export interface SessionRow extends RowDataPacket {
  id: string
  expires: Date
  sessionToken: string
  userId: string
}

/**
 * Helper to retrieve Sessions by different conditions
 *
 * @private
 * @param key Database field for WHERE
 * @param value Filter value
 * @param db Database connection
 */
const getSessionBy = async (
  key: string,
  value: string,
  db: ConnectionType
): Promise<AdapterSession | null> => {
  const sqlWhere = `${key} = ?`

  const [result] = await (
    await db
  ).query<SessionRow[]>(
    `
        SELECT id, expires, sessionToken, userId FROM Session WHERE ${sqlWhere} LIMIT 1
    `,
    [value]
  )

  if (result.length === 0) {
    return null
  }
  return result[0]
}

/**
 * Get session from database
 *
 * @param id Session ID
 * @param db Database connection
 */
export const getSession = async (
  id: string,
  db: ConnectionType
): Promise<AdapterSession | null> => {
  return await getSessionBy("id", id, db)
}

/**
 * Get session from database by session token
 *
 * @param sessionToken Session token
 * @param db Database connection
 */
export const getSessionBySessionToken = async (
  sessionToken: string,
  db: ConnectionType
): Promise<AdapterSession | null> => {
  return await getSessionBy("sessionToken", sessionToken, db)
}

/**
 * Delete session from database
 *
 * @param sessionToken Session token
 * @param db Database connection
 */
export const deleteSession = async (
  sessionToken: string,
  db: ConnectionType
): Promise<void> => {
  await (
    await db
  ).query(
    `
        DELETE FROM Session WHERE sessionToken = ?
    `,
    [sessionToken]
  )
}

/**
 * Create session in database
 *
 * @param session Session data
 * @param db Database connection
 */
export const createSession = async (
  session: { sessionToken: string; userId: string; expires: Date },
  db: ConnectionType
): Promise<AdapterSession> => {
  const uuid = uuidv4()

  await (
    await db
  ).query(
    `
        INSERT INTO Session(id, expires, sessionToken, userId) VALUES (?,?,?,?)
    `,
    [uuid, session.expires, session.sessionToken, session.userId]
  )

  const newSession = await getSession(uuid, db)
  if (!newSession) {
    throw new Error("New session was not persisted in database")
  }

  return newSession
}

/**
 * Update session in database
 *
 * @param session Session data
 * @param db Database connection
 */
export const updateSession = async (
  session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">,
  db: ConnectionType
): Promise<AdapterSession | null> => {
  const [result] = await (
    await db
  ).query<ResultSetHeader>(
    `
        UPDATE Session SET expires = ? WHERE sessionToken = ?
    `,
    [session.expires, session.sessionToken]
  )

  if (result.affectedRows === 0) {
    return null
  }

  return await getSessionBySessionToken(session.sessionToken, db)
}
