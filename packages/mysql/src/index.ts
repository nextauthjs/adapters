import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters"
import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise"
import { Awaitable } from "next-auth"

interface UserPacket extends RowDataPacket, AdapterUser {}

export async function MysqlAdapter(
  connection: Awaitable<Connection>
): Promise<Adapter> {
  const c = await Promise.resolve(connection)

  async function getUser(id: string): Promise<AdapterUser> {
    const [users] = await c.execute<UserPacket[]>(
      `select id, name, email, email_verified emailVerified, image
      from users where id = ?`,
      [+id]
    )
    const user = single(users)
    if (!user) throw new Error("getting user failed")
    return user
  }

  return {
    async createUser(u) {
      const [result] = await c.execute<ResultSetHeader>(
        "insert into users (name, email, email_verified, image) values (?,?,?,?)",
        [u.name, u.email, u.emailVerified, u.image]
      )
      if (result.affectedRows !== 1) throw new Error("create user failed")
      const id = result.insertId.toString()
      return await getUser(id)
    },

    getUser: async (id) => await getUser(id),

    async getUserByEmail(email) {
      const [users] = await c.execute<UserPacket[]>(
        `select id, name, email, email_verified emailVerified, image 
        from users where email = ?`,
        [email]
      )
      return single(users)
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const [users] = await c.execute<UserPacket[]>(
        `select u.id, u.name, u.email, u.email_verified emailVerified, u.image  
        from users u
        join accounts a on a.user_id = u.id
        where a.provider = ? and a.provider_account_id = ?`,
        [provider, providerAccountId]
      )
      return single(users)
    },

    async updateUser(user) {
      const id = user.id
      if (!id) throw new Error("wrong id")
      const [result] = await c.execute<ResultSetHeader>(
        `update users set name = ?, email = ?, image = ? where id = ?`,
        [user.name, user.email, user.image, user.id]
      )
      if (result.affectedRows !== 1) throw new Error("update user failed")
      return await getUser(id)
    },

    async deleteUser(id) {
      await c.execute<ResultSetHeader>(
        `delete user, accounts, session from users u
        join accounts a on a.user_id = u.id
        join sessions s on s.user_id = u.id
        where u.id = ?`,
        [id]
      )
    },

    async linkAccount(a) {
      await c.execute<ResultSetHeader>(
        `insert into accounts
        (user_id, type, provider, provider_account_id,
          refresh_token, access_token, expires_at)
        values (?,?,?,?,?,?,?)`,
        [
          a.userId,
          a.providerType,
          a.providerId,
          a.providerAccountId,
          a.refreshToken,
          a.accessToken,
          a.expires_at,
        ]
      )
    },

    async unlinkAccount({ provider, providerAccountId }) {
      await c.execute<ResultSetHeader>(
        `delete from accounts
          where provider = ? and provider_account_id = ?`,
        [provider, providerAccountId]
      )
    },

    async getSessionAndUser(sessionToken) {
      const [results] = await c.execute<any[]>(
        `select s.id sessionId, s.expires,
        session_token sessionToken, access_token accessToken,
        u.id userId, u.name, u.email, 
        u.email_verified emailVerified, u.image
        from sessions s
        join users u on u.id = s.user_id
        where session_token = ?`,
        [sessionToken]
      )
      const result = single(results)
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
      const [result] = await c.execute<ResultSetHeader>(
        `insert into sessions
        (user_id, expires, session_token)
        values (?,?,?)`,
        [userId, expires, sessionToken]
      )
      if (result.affectedRows !== 1) throw new Error("create session failed")
      const id = result.insertId.toString()
      return { userId, expires, id, sessionToken }
    },

    async updateSession({ expires, sessionToken, id }) {
      const [result] = await c.execute<ResultSetHeader>(
        `update sessions 
        set expires = ?, session_token = ? 
        where id = ?`,
        [expires, sessionToken, id]
      )
      if (result.affectedRows !== 1) return null

      const [sessions] = await c.execute<any[]>(
        `select s.id sessionId, s.expires,
        session_token sessionToken, access_token accessToken,
        from sessions s
        where session_token = ?`,
        [sessionToken]
      )

      return single(sessions)
    },

    async deleteSession(sessionToken) {
      await c.execute<ResultSetHeader>(
        `delete from sessions
        where session_token = ?`,
        [sessionToken]
      )
    },

    async createVerificationToken(v) {
      await c.execute<ResultSetHeader>(
        `insert into verification_requests
        (identifier, token, expires)
        values (?,?,?)`,
        [v.identifier, v.token, v.expires]
      )
      return v
    },

    async useVerificationToken({ identifier, token }) {
      const [results] = await c.execute<any[]>(
        `select id, identifier, token, expires,
        from verification_tokens 
        where identifier = ? and token = ?`,
        [identifier, token]
      )
      const v = single(results)

      if (v) {
        await c.execute<ResultSetHeader>(
          `delete from verification_tokens
        where identifier = ? and token = ?`,
          [identifier, token]
        )
      }
      return v
    },
  }
}

function single<T extends RowDataPacket>(records: T[]): T | null {
  if (!records) return null
  if (records.length !== 1) return null
  return records[0]
}
