import { runBasicTests } from "../../../basic-tests"
import { collections, format, MongoDBAdapter, _id } from "../src"
import { MongoClient } from "mongodb"
const databaseName = "test"
const collectionPrefix = "nextauth_"

const client1 = new MongoClient("mongodb://localhost:27017")
const db1 = client1.db(databaseName)

runBasicTests({
  adapter: MongoDBAdapter({ db: db1 }),
  db: {
    async connect() {
      return await client1.connect()
    },
    async disconnect() {
      await client1.db("test").dropDatabase()
      await client1.close()
    },
    async user(id) {
      const user = await client1
        .db("test")
        .collection(collections.Users)
        .findOne({ _id: _id(id) })

      if (!user) return null
      return format.from(user)
    },
    async account(provider_providerAccountId) {
      const account = await client1
        .db("test")
        .collection(collections.Accounts)
        .findOne(provider_providerAccountId)
      if (!account) return null
      return format.from(account)
    },
    async session(sessionToken) {
      const session = await client1
        .db("test")
        .collection(collections.Sessions)
        .findOne({ sessionToken })
      if (!session) return null
      return format.from(session)
    },
    async verificationToken(identifier_token) {
      const result = await client1
        .db("test")
        .collection(collections.VerificationTokens)
        .findOne(identifier_token)
      if (!result) return null
      const { _id, ...token } = result
      return token
    },
  },
})

const client2 = new MongoClient("mongodb://localhost:27017")
const db2 = client1.db(databaseName)

runBasicTests({
  adapter: MongoDBAdapter({ db: db2, collectionPrefix }),
  db: {
    async connect() {
      return await client2.connect()
    },
    async disconnect() {
      await client2.db("test").dropDatabase()
      await client2.close()
    },
    async user(id) {
      const user = await client2
        .db("test")
        .collection(`${collectionPrefix}${collections.Users}`)
        .findOne({ _id: _id(id) })

      if (!user) return null
      return format.from(user)
    },
    async account(provider_providerAccountId) {
      const account = await client2
        .db("test")
        .collection(`${collectionPrefix}${collections.Accounts}`)
        .findOne(provider_providerAccountId)
      if (!account) return null
      return format.from(account)
    },
    async session(sessionToken) {
      const session = await client2
        .db("test")
        .collection(`${collectionPrefix}${collections.Sessions}`)
        .findOne({ sessionToken })
      if (!session) return null
      return format.from(session)
    },
    async verificationToken(identifier_token) {
      const result = await client2
        .db("test")
        .collection(`${collectionPrefix}${collections.VerificationTokens}`)
        .findOne(identifier_token)
      if (!result) return null
      const { _id, ...token } = result
      return token
    },
  },
})
