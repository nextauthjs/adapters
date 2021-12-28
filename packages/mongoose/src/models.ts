import type { Types } from "mongoose"
import { Schema } from "mongoose"

// Interface representing a document in MongoDB.
interface User {
  _id: Types.ObjectId
  __v: string
  id: string
  name: string | null
  email: string | null
  emailVerified: Date | null
  image: string | null
}

interface Account {
  _id: Types.ObjectId
  __v: string
  id: string
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string
  access_token: string | null
  expires_at: number | null
  token_type: string | null
  scope: string
  id_token: string
  userId: Types.ObjectId
  oauth_token_secret: string
  oauth_token: string
  session_state: string
}

interface Session {
  _id: Types.ObjectId
  __v: string
  id: string
  expires: Date
  sessionToken: string
  userId: Types.ObjectId
}

interface VerificationToken {
  _id: Types.ObjectId
  __v: string
  token: string
  expires: Date
  identifier: string
}

// Schema corresponding to the document interface.
const userSchema = new Schema<User>({
  name: { type: String },
  email: { type: String, unique: true },
  emailVerified: { type: Date },
  image: { type: String },
})

const accountSchema = new Schema<Account>({
  type: { type: String },
  provider: { type: String },
  providerAccountId: { type: String },
  refresh_token: { type: String },
  access_token: { type: String },
  expires_at: { type: Number },
  token_type: { type: String },
  scope: { type: String },
  id_token: { type: String },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
  oauth_token_secret: { type: String },
  oauth_token: { type: String },
  session_state: { type: String },
})

const sessionSchema = new Schema<Session>({
  expires: { type: Date },
  sessionToken: { type: String, unique: true },
  userId: { type: Schema.Types.ObjectId, ref: "User" },
})

const verificationTokenSchema = new Schema<VerificationToken>({
  token: { type: String },
  expires: { type: Date },
  identifier: { type: String },
})

// Export schemas.
export { userSchema, accountSchema, sessionSchema, verificationTokenSchema }
