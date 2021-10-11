import { runBasicTests } from "../../../../basic-tests"
import { TypeORMLegacyAdapter } from "../../src"
import * as entities from "../custom-entities"
import { db } from "../helpers"

const mysqlConfig = {
  type: "mysql" as const,
  host: "localhost",
  port: 3306,
  username: "root",
  password: "password",
  database: "next-auth",
  synchronize: true,
}

runBasicTests({
  adapter: TypeORMLegacyAdapter(mysqlConfig, {
    entities,
  }),
  db: db(mysqlConfig, entities),
})
