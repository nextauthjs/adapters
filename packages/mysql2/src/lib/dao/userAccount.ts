import type { AdapterUser } from "next-auth/adapters"
import type { MappedUserRow } from "./user"
import type { ConnectionType, ModelExtension } from "../../types"
import type { Account } from "next-auth"
import { extendSelectQuery } from "../utils"

/**
 * Retrieve user and account data by account identifiers
 *
 * @param providerAccountId Account identifier
 * @param db Database connection
 * @param ext User model extension (optional)
 */
export const getUserAccount = async (
  providerAccountId: Pick<Account, "provider" | "providerAccountId">,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser | null> => {
  const sqlSelect = [
    "User.id AS id",
    "name",
    "email",
    "email_verified AS emailVerified",
    "image",
    ...extendSelectQuery(ext),
  ].join(",")
  const [[result]] = await (
    await db
  ).query<MappedUserRow[]>(
    `
        SELECT ${sqlSelect} FROM Account
        INNER JOIN User ON (userId = User.id)
        WHERE provider = ? AND providerAccountId = ?
    `,
    [providerAccountId.provider, providerAccountId.providerAccountId]
  )

  return result ?? null
}
