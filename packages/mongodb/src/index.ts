/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"
import type * as MongoDB from "mongodb"
import { ObjectId } from "mongodb"
import { Account } from "next-auth"

export const collections = {
  Users: "users",
  Accounts: "accounts",
  Sessions: "sessions",
  VerificationTokens: "verification_tokens",
}

export const format = {
  /** Takes a mongoDB object and returns a plain old JavaScript object */
  from<T = Record<string, unknown>>(object: Record<string, any>): T {
    const newObject: Record<string, unknown> = {}
    for (const key in object) {
      const value = object[key]
      if (key === "_id") {
        newObject.id = value.toHexString()
      } else {
        newObject[key] = value
      }
    }
    return newObject as T
  },
}

/** Converts from string to ObjectId */
export function _id(hex?: string) {
  if (hex?.length !== 24) return new ObjectId()
  return new ObjectId(hex)
}

export function MongoDBAdapter(options: { db: MongoDB.Db }): Adapter {
  const { db: m } = options
  const { from } = format

  const { Users, Accounts, Sessions, VerificationTokens } = {
    Users: m.collection<AdapterUser>(collections.Users),
    Accounts: m.collection<Account>(collections.Accounts),
    Sessions: m.collection<AdapterSession>(collections.Sessions),
    VerificationTokens: m.collection<VerificationToken>(
      collections.VerificationTokens
    ),
  }
  return {
    async createUser(data) {
      const user = { _id: _id(), ...(data as any) }
      await Users.insertOne(user)
      return from<AdapterUser>(user)
    },
    async getUser(id) {
      const user = await Users.findOne({ _id: _id(id) })
      if (!user) return null
      return from<AdapterUser>(user)
    },
    async getUserByEmail(email) {
      const user = await Users.findOne({ email })
      if (!user) return null
      return from<AdapterUser>(user)
    },
    async getUserByAccount(provider_providerAccountId) {
      const account = await Accounts.findOne(provider_providerAccountId)
      if (!account) return null
      const user = await Users.findOne({ _id: _id(account.userId) })
      if (!user) return null
      return from<AdapterUser>(user)
    },
    async updateUser(data) {
      const { value: user } = await Users.findOneAndUpdate(
        { _id: _id(data.id) },
        { $set: data }
      )
      return from<AdapterUser>(user!)
    },
    async deleteUser(id) {
      await Promise.all([
        m.collection(collections.Accounts).deleteMany({ userId: id }),
        m.collection(collections.Sessions).deleteMany({ userId: id }),
        m.collection(collections.Users).deleteOne({ _id: _id(id) }),
      ])
    },
    linkAccount: async (data) => {
      const account = { _id: _id(), ...data }
      await Accounts.insertOne(account)
      return account
    },
    async unlinkAccount(provider_providerAccountId) {
      const { value: account } = await Accounts.findOneAndDelete(
        provider_providerAccountId
      )
      return from<Account>(account!)
    },
    async getSessionAndUser(sessionToken) {
      const session = await Sessions.findOne({
        sessionToken,
      })
      if (!session) return null
      const user = await Users.findOne({ _id: _id(session.userId) })
      if (!user) return null
      return {
        user: from<AdapterUser>(user),
        session: from<AdapterSession>(session),
      }
    },
    async createSession(data) {
      const session = { _id: _id(), ...data }
      await Sessions.insertOne(session as any)
      return from<AdapterSession>(session)
    },
    async updateSession(data) {
      const { value: session } = await Sessions.findOneAndUpdate(
        { sessionToken: data.sessionToken },
        { $set: data }
      )
      return from<AdapterSession>(session!)
    },
    async deleteSession(sessionToken) {
      const { value: session } = await Sessions.findOneAndDelete({
        sessionToken,
      })
      return from<AdapterSession>(session!)
    },
    async createVerificationToken(data) {
      const token = { _id: _id(), ...data }
      await VerificationTokens.insertOne(token)
      return data
    },
    async useVerificationToken(identifier_token) {
      const { value: verificationToken } =
        await VerificationTokens.findOneAndDelete(identifier_token)

      if (!verificationToken) return null
      // @ts-expect-error
      delete verificationToken._id
      return verificationToken
    },
  }
}
