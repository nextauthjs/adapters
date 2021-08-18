import { loadConfig, parseConnectionString } from "./lib/config"
import adapterTransform from "./lib/transform"
import defaultModels from "./models"
import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"
import { Connection, ConnectionOptions } from "typeorm"
import { connect } from "./lib/connect"
import { Account } from "next-auth"

export const Models = defaultModels

export function TypeORMLegacyAdapter(options: {
  config: string | ConnectionOptions
  models?: any
  namingStrategy?: string
}): Adapter {
  const { config: configOrString, models: customModels } = options

  // Load any custom models passed as an option, default to built-in models
  /** @type {import("..").TypeORMAdapterModels} */
  const models = { ...defaultModels, ...customModels }
  // The models are designed for ANSI SQL databases first (as a baseline).
  // For databases that use a different pragma, we transform the models at run
  // time *unless* the models are user supplied (in which case we don't do
  // anything to do them). This function updates arguments by reference.
  //
  const configObject = parseConnectionString(configOrString)
  adapterTransform(configObject, models, options)
  const config = loadConfig(configObject, { ...options, models })
  // Create objects from models that can be consumed by functions in the adapter
  const {
    User: { model: UserModel },
    Account: { model: AccountModel },
    Session: { model: Session },
    VerificationToken: { model: VerificationTokenModel },
  } = models

  // This is set lazily, so that the connection is not created until the first call.
  // @ts-expect-error
  // eslint-disable-next-line
  let connection: Connection = undefined
  config.connection = connection
  const { client, idKey, getId } = connect(config)
  return {
    async createUser(user) {
      const c = await client()
      const newUser = await c.save<AdapterUser>(new UserModel(user))
      return newUser[0]
    },
    async getUser(id) {
      const c = await client()
      const user = await c.findOne<AdapterUser>(UserModel, {
        [idKey]: getId(id),
      })
      return user ?? null
    },
    async getUserByEmail(email) {
      const c = await client()
      const user = await c.findOne<AdapterUser>(UserModel, { email })
      return user ?? null
    },
    async getUserByAccount(providerAccountId) {
      const c = await client()
      const account = await c.findOne<Account>(AccountModel, providerAccountId)
      if (!account) return null
      const user = await c.findOne<AdapterUser>(UserModel, {
        [idKey]: account.userId,
      })
      return user ?? null
    },
    async updateUser(data) {
      const c = await client()
      const user = await c.save<AdapterUser>(UserModel, { data })
      return user[0]
    },
    async deleteUser(userId) {
      const c = await client()
      await c.transaction(async (m) => {
        await m.delete<AdapterUser>(UserModel, { [idKey]: getId(userId) })
        // @TODO Delete Accounts, Sessions
      })
    },
    async linkAccount(account) {
      const c = await client()
      return await c.save(new AccountModel(account))
    },
    async unlinkAccount(providerAccountId) {
      const c = await client()
      await c.delete<Account>(AccountModel, providerAccountId)
    },
    async createSession(session) {
      const c = await client()
      const newSession = await c.save<AdapterSession>(new Session(session))
      return newSession[0]
    },
    async getSessionAndUser(sessionToken) {
      const c = await client()
      const session = await c.findOne<AdapterSession>(Session, { sessionToken })
      if (!session) return null
      const user = await c.findOne<AdapterUser>(UserModel, {
        [idKey]: session.userId,
      })
      if (!user) return null

      return { session, user }
    },
    async updateSession(data) {
      const c = await client()
      const newSession = await c.save<AdapterSession>(Session, {
        data,
      })
      return newSession[0]
    },
    async deleteSession(sessionToken) {
      const c = await client()
      await c.delete(Session, { sessionToken })
    },
    async createVerificationToken(verificationToken) {
      const c = await client()
      await c.save(new VerificationTokenModel(verificationToken))
      return verificationToken
    },
    async useVerificationToken(identifier_token) {
      const c = await client()
      const verificationToken = await c.findOne<VerificationToken>(
        VerificationTokenModel,
        identifier_token
      )

      if (!verificationToken) return null

      await c.delete(VerificationTokenModel, identifier_token)

      return verificationToken
    },
  }
}
