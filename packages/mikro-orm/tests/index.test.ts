import { MikroORM, wrap } from "@mikro-orm/core"
import { runBasicTests } from "../../../basic-tests"
import * as MikroOrmModule from "../src"
import { Account, Session, User, VerificationToken } from "../src/models"

declare global {
  // eslint-disable-next-line no-var
  var __MikroORM__: MikroORM
}

const getORM = async () => {
  if (!global.__MikroORM__) {
    global.__MikroORM__ = await MikroORM.init({
      dbName: "./db.sqlite",
      type: "sqlite",
      entities: [User, Session, Account, VerificationToken],
      debug: process.env.DEBUG === "true" || process.env.DEBUG?.includes("db"),
    })
  }
  return global.__MikroORM__
}

runBasicTests({
  adapter: MikroOrmModule.MikroOrmAdapter(getORM()),
  db: {
    connect: async () => {
      const orm = await getORM()
      await orm.getSchemaGenerator().dropSchema()
      await orm.getSchemaGenerator().createSchema()
    },
    disconnect: async () => {
      const orm = await getORM()
      await orm.getSchemaGenerator().dropSchema()
      await orm.close()
    },
    verificationToken: async (identifier_token) => {
      const orm = await getORM()
      const token = await orm.em
        .fork()
        .findOne(VerificationToken, identifier_token)
      if (!token) return null
      return wrap(token).toObject()
    },
    user: async (id) => {
      const orm = await getORM()
      const user = await orm.em.fork().findOne(User, { id })
      if (!user) return null
      return wrap(user).toObject()
    },
    account: async (provider_providerAccountId) => {
      const orm = await getORM()
      const account = await orm.em
        .fork()
        .findOne(Account, { ...provider_providerAccountId })
      if (!account) return null
      return wrap(account).toObject()
    },
    session: async (sessionToken) => {
      const orm = await getORM()
      const session = await orm.em.fork().findOne(Session, { sessionToken })
      if (!session) return null
      return wrap(session).toObject()
    },
  },
})
