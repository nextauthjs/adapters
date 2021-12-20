import type { AdapterSession, AdapterUser } from "next-auth/adapters"
import type { MappedUserRow } from "./user"
import type { SessionRow } from "./session"
import type { ConnectionType, ModelExtension } from "../../types"
import { extendSelectQuery } from "../utils"

interface UserSessionRow
  extends Exclude<MappedUserRow, "id">,
    Exclude<SessionRow, "id"> {
  sessionId: string
}

interface UserSession {
  session: AdapterSession
  user: AdapterUser
}

/**
 * Retrieve user and session data by session token
 *
 * @param sessionToken Session token
 * @param db Database connection
 * @param ext User model extension (optional)
 */
export const getUserSession = async (
  sessionToken: string,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<UserSession | null> => {
  const sqlSelect = [
    "name",
    "email",
    "email_verified AS emailVerified",
    "image",
    ...extendSelectQuery(ext),
    "Session.id AS sessionId",
    "expires",
    "sessionToken",
    "userId",
  ].join(",")
  const [[result]] = await (
    await db
  ).query<UserSessionRow[]>(
    `
        SELECT ${sqlSelect} FROM Session
        INNER JOIN User ON (userId = User.id)
        WHERE sessionToken = ?
    `,
    [sessionToken]
  )

  if (!result) {
    return null
  }

  const userData: AdapterUser = { ...result, id: result.userId }
  const sessionData: AdapterSession = {
    id: result.sessionId,
    expires: result.expires,
    sessionToken: result.sessionToken,
    userId: result.userId,
  }
  delete userData.sessionId
  delete userData.expires
  delete userData.sessionToken
  delete userData.userId

  return {
    user: userData,
    session: sessionData,
  }
}
