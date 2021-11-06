import { Profile, User } from "next-auth"
import { createHash, randomBytes } from "crypto"
import type { Adapter, AdapterInstance } from "next-auth/adapters"
import { AppOptions } from "next-auth/internals"
import type { Connection, ResultSetHeader, RowDataPacket } from "mysql2/promise"

type MysqlConnection = Connection | Promise<Connection>
type MysqlOptions = Record<string, unknown>
type MysqlProfile = Profile

interface MysqlSession {
  expires: Date
  id: number
  userId: number
}

interface MysqlUser extends User {
  id: number
}

interface UserPacket extends RowDataPacket, MysqlUser {}
interface SessionPacket extends RowDataPacket, MysqlSession {}

interface VerificationRequest {
  id: string
  identifier: string
  token: string
  expires: Date
}

interface VerificationRequestPacket
  extends RowDataPacket,
    VerificationRequest {}

export const MysqlAdaptor: Adapter<
  MysqlConnection,
  MysqlOptions,
  MysqlUser,
  MysqlProfile,
  MysqlSession
> = (connection: MysqlConnection, options = {}) => {
  return {
    async getAdapter(appOptions: AppOptions) {
      const conn = await Promise.resolve(connection)
      return await createAdapter(conn, appOptions)
    },
  }
}

async function createAdapter(
  connection: Connection,
  opts: AppOptions
): Promise<AdapterInstance<MysqlUser, MysqlProfile, MysqlSession>> {
  const sessionMaxAge = opts.session.maxAge * 1000 // default is 30 days
  const sessionUpdateAge = opts.session.updateAge * 1000 // default is 1 day

  return {
    displayName: "MYSQL",
    async createUser(profile) {
      const [result] = await connection.execute<ResultSetHeader>(
        "insert into users (name, email, image) values (?,?,?)",
        [profile.name, profile.email, profile.image]
      )
      if (result.affectedRows !== 1) return null
      const id = result.insertId
      return { ...profile, id }
    },
    async getUser(id) {
      const [users] = await connection.execute<UserPacket[]>(
        "select * from users where id = ?",
        [id]
      )
      return single(users)
    },
    async getUserByEmail(email) {
      const [users] = await connection.execute<UserPacket[]>(
        "select * from users where email = ?",
        [email]
      )
      return single(users)
    },
    async getUserByProviderAccountId(providerId, providerAccountId) {
      const [users] = await connection.execute<UserPacket[]>(
        `select u.* from users u 
        join accounts a on a.user_id = u.id
        where a.provider_id = ? and a.provider_account_id = ?`,
        [providerId, providerAccountId]
      )
      return single(users)
    },
    async updateUser(user) {
      const [result] = await connection.execute<ResultSetHeader>(
        `update users set name = ?, email = ?, image = ? where id = ?`,
        [user.name, user.email, user.image, user.id]
      )
      if (result.affectedRows !== 1) return null
      return user
    },
    async deleteUser(userId) {
      await connection.execute<ResultSetHeader>(
        `delete user, accounts, session from users u
        join accounts a on a.user_id = u.id
        join sessions s on s.user_id = u.id
        where u.id = ?`,
        [userId]
      )
    },
    async linkAccount(
      userId,
      providerId,
      providerType,
      providerAccountId,
      refreshToken,
      accessToken,
      accessTokenExpires
    ) {
      await connection.execute<ResultSetHeader>(
        `insert into accounts 
        (user_id, provider_type, provider_id, provider_account_id,
          refresh_token, access_token, access_token_expires) 
        values (?,?,?,?,?,?,?)`,
        [
          userId,
          providerType,
          providerId,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires,
        ]
      )
    },
    async unlinkAccount(_, providerId, providerAccountId) {
      await connection.execute<ResultSetHeader>(
        `delete from accounts
        where provider_id = ? and provider_account_id = ?`,
        [providerId, providerAccountId]
      )
    },
    async createSession(user) {
      const expires = new Date(Date.now() + sessionMaxAge)
      const sessionToken = randomBytes(32).toString("hex")
      const accessToken = randomBytes(32).toString("hex")
      const userId = user.id

      const [result] = await connection.execute<ResultSetHeader>(
        `insert into sessions 
        (user_id, expires, session_token, access_token) 
        values (?,?,?,?)`,
        [userId, expires, sessionToken, accessToken]
      )
      if (result.affectedRows !== 1) return null
      const id = result.insertId
      return { userId, expires, id, sessionToken, accessToken }
    },
    async getSession(sessionToken) {
      const [sessions] = await connection.execute<SessionPacket[]>(
        `select id, expires, user_id userId, 
        session_token sessionToken, access_token accessToken
        from sessions where session_token = ?`,
        [sessionToken]
      )

      const session = single(sessions)

      if (session && session.expires < new Date()) {
        await connection.execute(
          `delete from sessions
          where session_token = ?`,
          [sessionToken]
        )
        return null
      }

      return session
    },
    async updateSession(session, force) {
      if (
        !force &&
        Number(session.expires) - sessionMaxAge + sessionUpdateAge > Date.now()
      ) {
        return null
      }
      session.expires = new Date(Date.now() + sessionMaxAge)

      const [result] = await connection.execute<ResultSetHeader>(
        `update sessions set expires = ? where id = ?`,
        [session.expires, session.id]
      )
      if (result.affectedRows !== 1) return null
      return session
    },
    async deleteSession(sessionToken) {
      await connection.execute<ResultSetHeader>(
        `delete from sessions
        where session_token = ?`,
        [sessionToken]
      )
    },
    async createVerificationRequest(identifier, url, token, secret, provider) {
      const expires = new Date(Date.now() + provider.maxAge * 1000)
      await connection.execute<ResultSetHeader>(
        `insert into verification_requests 
        (identifier, token, expires) 
        values (?,?,?)`,
        [identifier, hashToken(token, secret), expires]
      )
      await provider.sendVerificationRequest({
        identifier,
        url,
        token,
        baseUrl: opts.baseUrl,
        provider,
      })
    },
    async getVerificationRequest(
      identifier,
      verificationToken,
      secret,
      provider
    ) {
      const hashedToken = hashToken(verificationToken, secret)

      const [results] = await connection.execute<VerificationRequestPacket[]>(
        `select expires, identifier, token 
        from verification_requests 
        where identifier = ? and token = ?`,
        [identifier, hashedToken]
      )

      const verificationRequest = single(results)

      if (verificationRequest && verificationRequest.expires < new Date()) {
        await connection.execute<ResultSetHeader>(
          `delete from verification_requests
          where identifier = ? and token = ?`,
          [identifier, hashedToken]
        )
        return null
      }

      return verificationRequest
    },
    async deleteVerificationRequest(
      identifier,
      verificationToken,
      secret,
      provider
    ) {
      await connection.execute<ResultSetHeader>(
        `delete from verification_requests
        where identifier = ? and token = ?`,
        [identifier, hashToken(verificationToken, secret)]
      )
    },
  }
}

function hashToken(token: string, secret: string) {
  return createHash("sha256").update(`${token}${secret}`).digest("hex")
}

function single<T extends RowDataPacket>(records: T[]): T | null {
  if (!records) return null
  if (records.length !== 1) return null
  return records[0]
}
