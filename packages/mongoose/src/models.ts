import type { Types } from "mongoose"
import { Schema, model } from "mongoose"

// Interface representing a document in MongoDB.
interface User {
  _id: Types.ObjectId
  __v: any
  id: any
  name: string
  email: string
  emailVerified: Date | null
  image: string
}

interface Account {
  _id: Types.ObjectId
  __v: any
  id: any
  type: string
  provider: string
  providerAccountId: string
  refresh_token: string
  access_token: string
  expires_at: number
  token_type: string
  scope: string
  id_token: string
  userId: Types.ObjectId
  oauth_token_secret: string
  oauth_token: string
  session_state: string
}

interface Session {
  _id: Types.ObjectId
  __v: any
  id: any
  expires: Date
  sessionToken: string
  userId: Types.ObjectId | string
}

interface VerificationToken {
  _id: Types.ObjectId
  __v: any
  token: string
  expires: Date
  identifier: string
}

// Schema corresponding to the document interface.
const userSchema = new Schema<User>({
  name: { type: String },
  email: { type: String },
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
  sessionToken: { type: String },
  userId: { type: Schema.Types.ObjectId || String, ref: "User" },
})

const verificationTokenSchema = new Schema<VerificationToken>({
  token: { type: String },
  expires: { type: Date },
  identifier: { type: String },
})

// Created models.
export const UserModel = model<User>("User", userSchema)
export const AccountModel = model<Account>("Account", accountSchema)
export const SessionModel = model<Session>("Session", sessionSchema)
export const VerificationTokenModel = model<VerificationToken>(
  "VerificationToken",
  verificationTokenSchema
)
