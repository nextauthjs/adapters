import { runBasicTests } from "../../../../basic-tests"
import { TypeORMLegacyAdapter } from "../../src"
import * as customEntities from "../custom-entities"
import { db } from "../helpers"

const sqliteConfig = {
  type: "sqlite" as const,
  name: "next-auth-test-memory",
  database: "./tests/sqlite/dev.db",
  synchronize: true,
}

runBasicTests({
  adapter: TypeORMLegacyAdapter(sqliteConfig, {
    entities: {
      ...customEntities,
    },
  }),
  db: db(sqliteConfig),
})
