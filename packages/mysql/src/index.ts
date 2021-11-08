import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters"
import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { Awaitable } from "next-auth"

export function MysqlAdapter(connection: Awaitable<Connection>): Adapter {
  return {
    async createUser(u) {
      const id = await insert(
        connection,
        "insert into users (name, email, email_verified, image) values (?,?,?,?)",
        [u.name, u.email, u.emailVerified, u.image]
      )
      return await getUser(connection, id)
    },

    getUser: async (id) => await getUser(connection, +id),

    async getUserByEmail(email) {
      return await get(
        connection,
        `select id, name, email, email_verified emailVerified, image 
        from users where email = ?`,
        [email]
      )
    },

    async getUserByAccount({ provider, providerAccountId }) {
      return await get(
        connection,
        `select u.id, u.name, u.email, u.email_verified emailVerified, u.image  
        from users u
        join accounts a on a.user_id = u.id
        where a.provider = ? and a.provider_account_id = ?`,
        [provider, providerAccountId]
      )
    },

    async updateUser(user) {
      const id = parseInt(user.id ?? "")
      const affectedRows = await update(connection, "users", user, "id", id)
      if (affectedRows !== 1) throw new Error("update user failed")
      return await getUser(connection, id)
    },

    async deleteUser(id) {
      await run(
        connection,
        `delete user, accounts, session from users u
      join accounts a on a.user_id = u.id
      join sessions s on s.user_id = u.id
      where u.id = ?`,
        [id]
      )
    },

    async linkAccount(a) {
      await get(
        connection,
        `insert into accounts
        (user_id, type, provider, provider_account_id,
          refresh_token, access_token, expires_at, token_type,
          scope, id_token, session_state)
        values (?,?,?,?,?,?,?,?,?,?,?)`,
        [
          a.userId,
          a.type,
          a.provider,
          a.providerAccountId,
          a.refresh_token,
          a.access_token,
          a.expires_at,
          a.token_type,
          a.scope,
          a.id_token,
          a.session_state,
        ]
      )
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await run(
        connection,
        `delete from accounts
          where provider = ? and provider_account_id = ?`,
        [provider, providerAccountId]
      )
    },

    async getSessionAndUser(sessionToken) {
      const result = await get(
        connection,
        `select s.id sessionId, s.expires,
        session_token sessionToken,
        u.id userId, u.name, u.email, 
        u.email_verified emailVerified, u.image
        from sessions s
        join users u on u.id = s.user_id
        where session_token = ?`,
        [sessionToken]
      )
      if (!result) return null

      const user: AdapterUser = {
        id: result.userId,
        name: result.name,
        email: result.email,
        emailVerified: result.emailVerified,
        image: result.image,
      }
      const session: AdapterSession = {
        id: result.sessionId,
        userId: result.userId,
        expires: result.expires,
        sessionToken: result.sessionToken,
      }
      return { user, session }
    },

    async createSession({ userId, sessionToken, expires }) {
      const id = (
        await insert(
          connection,
          `insert into sessions
        (user_id, expires, session_token)
        values (?,?,?)`,
          [userId, expires, sessionToken]
        )
      ).toString()
      return { userId, expires, id, sessionToken }
    },

    async updateSession(data) {
      const affectedRows = await update(
        connection,
        "sessions",
        data,
        "session_token",
        data.sessionToken
      )
      if (affectedRows !== 1) return null

      return await get(
        connection,
        `select s.id sessionId, s.expires,
        session_token sessionToken
        from sessions s
        where session_token = ?`,
        [data.sessionToken]
      )
    },

    async deleteSession(sessionToken) {
      await run(
        connection,
        `delete from sessions
        where session_token = ?`,
        [sessionToken]
      )
    },

    async createVerificationToken(v) {
      await insert(
        connection,
        `insert into verification_tokens
        (identifier, token, expires)
        values (?,?,?)`,
        [v.identifier, v.token, v.expires]
      )
      return v
    },

    async useVerificationToken({ identifier, token }) {
      const v = await get(
        connection,
        `select identifier, token, expires
        from verification_tokens 
        where identifier = ? and token = ?`,
        [identifier, token]
      )

      if (v) {
        await run(
          connection,
          `delete from verification_tokens
        where identifier = ? and token = ?`,
          [identifier, token]
        )
      }
      return v
    },
  }
}

async function getUser(
  connection: Awaitable<Connection>,
  id: number
): Promise<AdapterUser> {
  const sql = `select id, name, email, email_verified emailVerified, image from users where id = ?`
  return await get(connection, sql, [id])
}

async function update(
  connection: Awaitable<Connection>,
  table: string,
  fields: Record<string, any>,
  keyname: string,
  key: any
): Promise<Number> {
  fields = removeEmpty(fields)
  if (Object.keys(fields).length === 0) return 0

  let sql = ""
  const values: any[] = []
  for (const [key, value] of Object.entries(fields)) {
    if (sql !== "") sql += ", "
    sql += `${camelToSnakeCase(key)} = ?`
    values.push(value)
  }
  sql = `update ${table} set ${sql} where ${keyname} = ?`
  values.push(key)

  return (await run(connection, sql, values)).affectedRows
}

async function get(
  connection: Awaitable<Connection>,
  sql: string,
  keys: any[]
): Promise<any> {
  const c = await Promise.resolve(connection)
  const [results] = await c.execute<any[]>(sql, keys)
  return single(results)
}
async function insert(
  connection: Awaitable<Connection>,
  sql: string,
  keys: any[]
): Promise<number> {
  const result = run(connection, sql, keys)
  return (await result).insertId
}

async function run(
  connection: Awaitable<Connection>,
  sql: string,
  keys: any[]
): Promise<ResultSetHeader> {
  const c = await Promise.resolve(connection)
  const [result] = await c.execute<ResultSetHeader>(sql, keys)
  return result
}

function removeEmpty(obj: Record<string, any>) {
  return Object.entries(obj)
    .filter(([_, v]) => v != null)
    .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
}

const camelToSnakeCase = (str: string) =>
  str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`)

function single<T extends RowDataPacket>(records: T[]): T | null {
  if (!records) return null
  if (records.length !== 1) return null
  return records[0]
}
