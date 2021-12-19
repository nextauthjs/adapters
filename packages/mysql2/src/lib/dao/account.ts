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

  // TODO: remove when https://github.com/sidorares/node-mysql2/issues/1265 is resolved
  // @ts-expect-error
  await (
    await db
  ).query(
    {
      sql: `
        INSERT INTO Account(${sqlInsert.join(",")}) VALUES(${sqlValues.join(
        ","
      )})
    `,
      namedPlaceholders: true,
    },
    {
      ...account,
    }
  )
}
