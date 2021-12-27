import { runBasicTests } from "../../../basic-tests"
import { format, MongooseAdapter } from "../src"
import { connection } from "mongoose"
import {
  UserModel,
  AccountModel,
  SessionModel,
  VerificationTokenModel,
} from "../src/models"

const uri: string = "mongodb://localhost:27017/test"

runBasicTests({
  adapter: MongooseAdapter(uri),
  db: {
    async disconnect() {
      await connection.dropDatabase()
      await connection.close()
    },
    async user(id) {
      const user = await UserModel.findById(id).lean()
      if (!user) return null
      return format.from(user)
    },
    async account(data) {
      const account = await AccountModel.findOne(data).lean()
      if (!account) return null
      return format.from(account)
    },
    async session(sessionToken) {
      const session = await SessionModel.findOne({
        sessionToken: sessionToken,
      }).lean()
      if (!session) return null
      return format.from(session)
    },
    async verificationToken(data) {
      const token = await VerificationTokenModel.findOne({
        identifier: data.identifier,
      })
        .lean()
        .exec()
      if (!token) return null
      const { _id, __v, ...rest } = token
      return rest
    },
  },
})
