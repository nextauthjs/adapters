import type { AdapterUser } from "next-auth/adapters"
import type { RowDataPacket } from "mysql2"
import type { ConnectionType, ModelExtension } from "../../types"
import { v4 as uuidv4 } from "uuid"
import {
  extendInsertValuesQuery,
  extendSelectQuery,
  generateSetQuery,
} from "../utils"

interface UserRow extends RowDataPacket {
  id: string
  name: string
  email: string
  email_verified: Date
  image: string
}

export interface MappedUserRow extends Exclude<UserRow, "email_verified"> {
  emailVerified: Date
}

/**
 * Helper to fetch user by different conditions
 *
 * @private
 * @param key Database field for WHERE
 * @param value Filter value
 * @param db Database connection
 * @param ext User model extension (optional)
 */
const getUserBy = async (
  key: string,
  value: string,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser | null> => {
  const sqlSelect = [
    "id",
    "name",
    "email",
    "email_verified AS emailVerified",
    "image",
    ...extendSelectQuery(ext),
  ].join(",")

  const sqlWhere = `${key} = ?`

  const [result] = await (
    await db
  ).query<MappedUserRow[]>(
    `
        SELECT ${sqlSelect} FROM User WHERE ${sqlWhere} LIMIT 1
    `,
    [value]
  )

  if (result.length === 0) {
    return null
  }

  return result[0]
}

/**
 * Retrieve user by primary id
 *
 * @param id Id of the user
 * @param db Database connection
 * @param ext User model extension (optional)
 */
export const getUser = async (
  id: string,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser | null> => {
  return await getUserBy("id", id, db, ext)
}

/**
 * Retrieve user by e-mail
 *
 * @param mail Email address of the user
 * @param db Database connection
 * @param ext User model extension (optional)
 */
export const getUserByMail = async (
  mail: string,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser | null> => {
  return await getUserBy("email", mail, db, ext)
}

/**
 * Create a new user in DB
 *
 * @param user User data
 * @param db Database connection
 * @param ext User model extension (optional)
 */
export const createUser = async (
  user: Omit<AdapterUser, "id">,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser> => {
  const { insert: extendedInsert, values: extendedValues } =
    extendInsertValuesQuery(user, ext)
  const sqlInsert = [
    "id",
    "name",
    "email",
    "email_verified",
    "image",
    ...extendedInsert,
  ].join(",")
  const sqlValues = [
    ":id",
    ":name",
    ":email",
    ":emailVerified",
    ":image",
    ...extendedValues,
  ].join(",")

  const newUserid = uuidv4()

  /* eslint-disable @typescript-eslint/prefer-ts-expect-error */
  // TODO: remove when https://github.com/sidorares/node-mysql2/issues/1265 is resolved
  // @ts-ignore
  await (
    await db
  ).query(
    {
      sql: `
        INSERT INTO User(${sqlInsert}) VALUES(${sqlValues})
      `,
      namedPlaceholders: true,
    },
    {
      ...user,
      id: newUserid,
    }
  )
  /* eslint-enable @typescript-eslint/prefer-ts-expect-error */

  const newUser = await getUser(newUserid, db, ext)
  if (!newUser) {
    throw new Error("New user was not persisted in database")
  }

  return newUser
}

export const updateUser = async (
  user: Partial<AdapterUser>,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser> => {
  if (!user.id) {
    throw new Error("User ID is required to update a user")
  }

  const sqlSet = generateSetQuery(user, ext)

  /* eslint-disable @typescript-eslint/prefer-ts-expect-error */
  // TODO: remove when https://github.com/sidorares/node-mysql2/issues/1265 is resolved
  // @ts-ignore
  await (
    await db
  ).query(
    {
      sql: `
        UPDATE User SET ${sqlSet.join(",")} WHERE id = :id
      `,
      namedPlaceholders: true,
    },
    {
      ...user,
    }
  )
  /* eslint-enable @typescript-eslint/prefer-ts-expect-error */

  const updatedUser = await getUser(user.id, db, ext)
  if (!updatedUser) {
    throw new Error("Updated user not found in database")
  }
  return updatedUser
}

/**
 * Delete user from DB
 *
 * @param userId Id of the user
 * @param db Database connection
 */
export const deleteUser = async (
  userId: string,
  db: ConnectionType
): Promise<void> => {
  await (await db).query(`DELETE FROM User WHERE id = ?`, [userId])
}
