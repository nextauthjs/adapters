import { runBasicTests } from "../../../basic-tests"
import mysql from "mysql2/promise"
import { MysqlAdaptor } from "../src"
import { ConnectionOptions } from "mysql2/typings/mysql"

const config: ConnectionOptions = {
  host: "127.0.0.1",
  port: 3309,
  user: "root",
  password: "password",
  database: "next-auth",
}
const connectionPromise = mysql.createConnection(config)
const myslAdapter = MysqlAdaptor(connectionPromise)

runBasicTests({
  adapter: myslAdapter,
  db: {
    async disconnect() {
      const connection = await connectionPromise
      await connection.end()
    },
    async session(sessionToken) {
      const connection = await connectionPromise
      const [sessions] = await connection.execute<any[]>(
        `select id, expires, user_id userId, 
        session_token sessionToken, access_token accessToken
        from sessions where session_token = ?`,
        [sessionToken]
      )
      if (sessions.length === 0) return null
      return sessions[0]
    },
    async expireSession(sessionToken, expires) {
      const connection = await connectionPromise
      await connection.execute(
        `update sessions set expires = ? where session_token = ?`,
        [expires, sessionToken]
      )
    },
    async user(id) {
      const connection = await connectionPromise
      const [users] = await connection.execute<any[]>(
        `select * from users
        where id = ?`,
        [id]
      )
      return users[0]
    },
    async account(providerId, providerAccountId) {
      const connection = await connectionPromise
      const [accounts] = await connection.execute<any[]>(
        `select user_id userId, provider_id providerId, 
        provider_type providerType, provider_account_id providerAccountId, 
        refresh_token refreshToken, access_token accessToken, 
        access_token_expires accessTokenExpires
        from accounts
        where provider_id = ? and provider_account_id = ?`,
        [providerId, providerAccountId]
      )
      return accounts[0]
    },
    async verificationRequest(identifier, token) {
      const connection = await connectionPromise
      const [results] = await connection.execute<any[]>(
        `select * from verification_requests
        where identifier = ? and token = ?`,
        [identifier, token]
      )
      if (results.length === 0) return null
      return results[0]
    },
  },
  mock: {},
})
