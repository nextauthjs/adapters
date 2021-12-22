import type { RowDataPacket } from "mysql2"
import type { Account } from "next-auth"
import type { ConnectionType } from "../../types"

export interface AccountRow extends RowDataPacket {
  id: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string | null
  id_token: string | null
  userId: string
  oauth_token_secret: string | null
  oauth_token: string | null
  session_state: string | null
}

/**
 * Create account in database
 *
 * @param account Account data
 * @param db Database connection
 */
export const createAccount = async (
  account: Account,
  db: ConnectionType
): Promise<void> => {
  const sqlInsert = []
  const sqlValues = []

  for (const key of Object.keys(account)) {
    sqlInsert.push(key)
    sqlValues.push(`:${key}`)
  }

  /* eslint-disable @typescript-eslint/prefer-ts-expect-error */
  // TODO: remove when https://github.com/sidorares/node-mysql2/issues/1265 is resolved
  // @ts-ignore
  await (
    await db
  ).query(
    {
      sql: `
        INSERT INTO Account(${sqlInsert.join(",")}) 
        VALUES(${sqlValues.join(",")})
    `,
      namedPlaceholders: true,
    },
    {
      ...account,
    }
  )
  /* eslint-enable @typescript-eslint/prefer-ts-expect-error */
}

/**
 * Deletes an account from the database
 *
 * @param providerAccount Account identifier
 * @param db Database connection
 */
export const deleteAccount = async (
  providerAccount: Pick<Account, "provider" | "providerAccountId">,
  db: ConnectionType
): Promise<void> => {
  const { provider, providerAccountId } = providerAccount

  await (
    await db
  ).query(
    `
      DELETE FROM Account 
      WHERE provider = ? AND providerAccountId = ?    
    `,
    [provider, providerAccountId]
  )
}
