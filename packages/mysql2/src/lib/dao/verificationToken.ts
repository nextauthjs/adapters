import type { VerificationToken } from "next-auth/adapters"
import type { ConnectionType } from "../../types"
import type { RowDataPacket } from "mysql2"

interface VerificationTokenRow extends RowDataPacket {
  token: string
  expires: Date
  identifier: string
}

/**
 * Get verification token from database
 *
 * @param identifier
 * @param token
 * @param db Database connection
 */
export const getVerificationToken = async (
  identifier: string,
  token: string,
  db: ConnectionType
): Promise<VerificationToken | null> => {
  const [[result]] = await (
    await db
  ).query<VerificationTokenRow[]>(
    `
        SELECT token, expires, identifier FROM VerificationToken WHERE identifier = ? AND token = ?
    `,
    [identifier, token]
  )

  return result ?? null
}

/**
 * Create verification token in database
 *
 * @param verificationToken
 * @param db Database connection
 */
export const createVerificationToken = async (
  verificationToken: VerificationToken,
  db: ConnectionType
): Promise<VerificationToken> => {
  await (
    await db
  ).query(
    `
        INSERT INTO VerificationToken(token, expires, identifier) VALUES (?,?,?)
    `,
    [
      verificationToken.token,
      verificationToken.expires,
      verificationToken.identifier,
    ]
  )

  return verificationToken
}

/**
 * Delete verification token form database
 *
 * @param identifier
 * @param token
 * @param db Database connection
 */
export const deleteVerificationToken = async (
  identifier: string,
  token: string,
  db: ConnectionType
): Promise<void> => {
  await (
    await db
  ).query<VerificationTokenRow[]>(
    `
        DELETE FROM VerificationToken WHERE identifier = ? AND token = ?
    `,
    [identifier, token]
  )
}
