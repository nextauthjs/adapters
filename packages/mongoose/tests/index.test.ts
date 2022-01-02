import { runBasicTests } from "../../../basic-tests"
import { format, MongooseAdapter } from "../src"
import {
  userSchema,
  accountSchema,
  sessionSchema,
  verificationTokenSchema,
} from "../src/models"
import dbConnect from "../src/dbConnect"

const uri: string = "mongodb://localhost:27017/test"

const conn = dbConnect(uri)

const UserModel = conn.model("User", userSchema)
const AccountModel = conn.model("Account", accountSchema)
const SessionModel = conn.model("Session", sessionSchema)
const VerificationTokenModel = conn.model(
  "VerificationToken",
  verificationTokenSchema
)

runBasicTests({
  adapter: MongooseAdapter(uri),
  db: {
    async disconnect() {
      await conn.dropDatabase()
      await conn.close()
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
