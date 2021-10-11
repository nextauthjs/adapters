import { runBasicTests } from "../../../../basic-tests"
import { TypeORMLegacyAdapter } from "../../src"
import { db } from "../helpers"

const sqliteConfig = {
  type: "sqlite" as const,
  name: "next-auth-test-memory",
  database: "./tests/sqlite/dev.db",
  synchronize: true,
}

runBasicTests({
  adapter: TypeORMLegacyAdapter(sqliteConfig),
  db: db(sqliteConfig),
})
