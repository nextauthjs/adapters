import { MikroORM, wrap } from "@mikro-orm/core"
import { runBasicTests } from "../../../basic-tests"
import { MikroOrmAdapter, defaultModels } from "../src"

let _init: any
async function getORM() {
  if (_init) return _init

  _init = await MikroORM.init({
    dbName: "./db.sqlite",
    type: "sqlite",
    entities: [
      defaultModels.User,
      defaultModels.Session,
      defaultModels.Account,
      defaultModels.VerificationToken,
    ],
    debug: process.env.DEBUG === "true" || process.env.DEBUG?.includes("db"),
  })
  return _init
}

runBasicTests({
  adapter: MikroOrmAdapter(getORM().then((init) => init.em.fork())),
  db: {
    async connect() {
      const orm = await getORM()
      await orm.getSchemaGenerator().dropSchema()
      await orm.getSchemaGenerator().createSchema()
    },
    async disconnect() {
      const orm = await getORM()
      await orm.getSchemaGenerator().dropSchema()
      await orm.close()
    },
    async verificationToken(identifier_token) {
      const orm = await getORM()
      const token = await orm.em
        .fork()
        .findOne(VerificationToken, identifier_token)
      if (!token) return null
      return wrap(token).toObject()
    },
    async user(id) {
      const orm = await getORM()
      const user = await orm.em.fork().findOne(User, { id })
      if (!user) return null
      return wrap(user).toObject()
    },
    async account(provider_providerAccountId) {
      const orm = await getORM()
      const account = await orm.em
        .fork()
        .findOne(Account, { ...provider_providerAccountId })
      if (!account) return null
      return wrap(account).toObject()
    },
    async session(sessionToken) {
      const orm = await getORM()
      const session = await orm.em.fork().findOne(Session, { sessionToken })
      if (!session) return null
      return wrap(session).toObject()
    },
  },
})
