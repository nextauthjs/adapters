import type { AdapterUser } from "next-auth/adapters"
import type { RowDataPacket } from "mysql2"
import type { ConnectionType, ModelExtension } from "../../types"
import { v4 as uuidv4 } from "uuid"
import { extendInsertValuesQuery, extendSelectQuery } from "../utils"

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

export const getUser = async (
  id: string,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser | null> => {
  return await getUserBy("id", id, db, ext)
}

export const getUserByMail = async (
  mail: string,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser | null> => {
  return await getUserBy("email", mail, db, ext)
}

export const createUser = async (
  user: Omit<AdapterUser, "id">,
  db: ConnectionType,
  ext: ModelExtension = {}
): Promise<AdapterUser> => {
  const { insert: extendedInsert, values: extendedValues } =
    extendInsertValuesQuery(ext, user)
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
  // TODO: remove when https://github.com/sidorares/node-mysql2/issues/1265 is resolved
  // @ts-expect-error
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

  const newUser = await getUser(newUserid, db, ext)
  if (!newUser) {
    throw new Error("New user was not persisted in database")
  }

  return newUser
}
