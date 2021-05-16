import { createConnection, ConnectionOptions } from "typeorm"
import { runBasicTests } from "../../../basic-tests"
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { TypeORMLegacyAdapter, Models } from "../src"

const {
  User: { model: User },
  Session: { model: Session },
} = Models

const config: ConnectionOptions = {
  type: "mysql",
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "next-auth",
}

const adapter = new TypeORMLegacyAdapter(config)

runBasicTests({
  adapter,
  db: {
    async user(id) {
      const { manager } = await createConnection(config)
      return await manager.findOne(User, {
        where: { id },
      })
    },
    async session(sessionToken) {
      const { manager } = await createConnection(config)
      return await manager.findOne(Session, {
        where: { sessionToken },
      })
    },
    async account(id) {
      // TODO:
    },
    async verificationRequest(id) {
      // TODO:
    },
  },
})
