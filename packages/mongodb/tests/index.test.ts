import { runBasicTests } from "../../../basic-tests"
import { collections, format, MongoDBAdapter } from "../src"
import { MongoClient, ObjectId } from "mongodb"

const _id = (hex?: string) => {
  if (hex?.length !== 24) return new ObjectId()
  return new ObjectId(hex)
}

const client = new MongoClient("mongodb://localhost:27017")
const databaseName = "test"
const db = client.db(databaseName)

runBasicTests({
  adapter: MongoDBAdapter({ db, ObjectId }),
  db: {
    async connect() {
      return await client.connect()
    },
    async disconnect() {
      await client.db("test").dropDatabase()
      await client.close()
    },
    async user(id) {
      const user = await client
        .db("test")
        .collection(collections.Users)
        .findOne({ _id: _id(id) })

      if (!user) return null
      return format.from(user)
    },
    async account(provider_providerAccountId) {
      const account = await client
        .db("test")
        .collection(collections.Accounts)
        .findOne(provider_providerAccountId)
      if (!account) return null
      return format.from(account)
    },
    async session(sessionToken) {
      const session = await client
        .db("test")
        .collection(collections.Sessions)
        .findOne({ sessionToken })
      if (!session) return null
      return format.from(session)
    },
    async verificationToken(identifier_token) {
      const token = await client
        .db("test")
        .collection(collections.VerificationTokens)
        .findOne(identifier_token)
      if (!token) return null
      delete token._id
      return token
    },
  },
})
