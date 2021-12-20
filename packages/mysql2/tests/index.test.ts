import type { RowDataPacket } from "mysql2/promise"
import type { TestOptions } from "../../../basic-tests"
import type { AdapterOptions } from "../src/types"
import { runBasicTests } from "../../../basic-tests"
import * as mysql from "mysql2/promise"
import MySqlAdapter from "../src"

const mysqlConnection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "test",
  database: "nextauth-test",
})

const adapterOptions: AdapterOptions = !process.env.CUSTOM_MODEL
  ? {}
  : { extendUserModel: { role: "role", phone: "phone" } }
const userSelectQuery = `id,name,email,email_verified AS emailVerified,image ${
  !process.env.CUSTOM_MODEL ? "" : ",phone,role"
}`

const testOptions: TestOptions = {
  adapter: MySqlAdapter(mysqlConnection, adapterOptions),
  db: {
    connect: async () => {
      // cleanup DB
      await (await mysqlConnection).execute("DELETE FROM Account")
      await (await mysqlConnection).execute("DELETE FROM Session")
      await (await mysqlConnection).execute("DELETE FROM User")
      await (await mysqlConnection).execute("DELETE FROM VerificationToken")
    },
    disconnect: async () => {
      await (await mysqlConnection).end()
    },
    user: async (id): Promise<any> => {
      const [result] = await (
        await mysqlConnection
      ).query<RowDataPacket[]>(
        `SELECT ${userSelectQuery} FROM User WHERE id = ?`,
        [id]
      )
      return result?.[0] ?? null
    },
    session: async (sessionToken: string): Promise<any> => {
      const [result] = await (
        await mysqlConnection
      ).query<RowDataPacket[]>(
        `SELECT id, expires, sessionToken, userId FROM Session WHERE sessionToken = ?`,
        [sessionToken]
      )
      return result?.[0] ?? null
    },
    account: async (providerAccountId: {
      provider: string
      providerAccountId: string
    }): Promise<any> => {
      const [[result]] = await (
        await mysqlConnection
      ).query<RowDataPacket[]>(
        `SELECT * FROM Account WHERE provider = ? AND providerAccountId = ?`,
        [providerAccountId.provider, providerAccountId.providerAccountId]
      )

      if (!result) {
        return null
      }

      // remove null values
      const account: Record<string, any> = {}
      for (const [key, value] of Object.entries(result)) {
        if (value) {
          account[key] = value
        }
      }

      return account
    },
    verificationToken: async (params): Promise<any> => {
      const [[result]] = await (
        await mysqlConnection
      ).query<RowDataPacket[]>(
        `SELECT * FROM VerificationToken WHERE identifier = ? AND token = ?`,
        [params.identifier, params.token]
      )

      return result ?? null
    },
  },
}

runBasicTests(testOptions)
