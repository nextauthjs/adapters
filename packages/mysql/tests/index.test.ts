import { runBasicTests } from "../../../basic-tests"
import mysql from "mysql2/promise"
import { MysqlAdapter } from "../src"
import { ConnectionOptions } from "mysql2/typings/mysql"

const config: ConnectionOptions = {
  host: "127.0.0.1",
  port: 3309,
  user: "root",
  password: "password",
  database: "next-auth",
  timezone: "Z",
}
const connectionPromise = mysql.createConnection(config)
const mysqlAdapter = MysqlAdapter(connectionPromise)

runBasicTests({
  adapter: mysqlAdapter,
  db: {
    async disconnect() {
      const connection = await connectionPromise
      await connection.end()
    },
    async session(sessionToken) {
      const connection = await connectionPromise
      const [sessions] = await connection.execute<any[]>(
        `select id, expires, user_id userId, session_token sessionToken
        from sessions where session_token = ?`,
        [sessionToken]
      )
      if (sessions.length === 0) return null
      return sessions[0]
    },
    async user(id) {
      const connection = await connectionPromise
      const [users] = await connection.execute<any[]>(
        `select id, name, email, email_verified emailVerified, image 
        from users
        where id = ?`,
        [id]
      )
      return users[0]
    },
    async account({ provider, providerAccountId }) {
      const connection = await connectionPromise
      const [accounts] = await connection.execute<any[]>(
        `select id, user_id userId, type, provider, 
        provider_account_id providerAccountId,
        refresh_token, access_token, 
        expires_at, token_type,
        scope, id_token, session_state
        from accounts
        where provider = ? and provider_account_id = ?`,
        [provider, providerAccountId]
      )
      if (accounts.length === 0) return null
      return accounts[0]
    },
    async verificationToken({ identifier, token }) {
      const connection = await connectionPromise
      const [results] = await connection.execute<any[]>(
        `select identifier, token, expires from verification_tokens
        where identifier = ? and token = ?`,
        [identifier, token]
      )
      if (results.length === 0) return null
      return results[0]
    },
  },
})
