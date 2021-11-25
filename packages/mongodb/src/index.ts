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
      } else if (key === "userId") {
        newObject[key] = value.toHexString()
      } else {
        newObject[key] = value
      }
    }
    return newObject as T
  },
  /** Takes a plain old JavaScript object and turns it into a mongoDB object */
  to<T = Record<string, unknown>>(object: Record<string, any>) {
    const newObject: Record<string, unknown> = {
      _id: _id(object.id),
    }
    for (const key in object) {
      const value = object[key]
      if (key === "userId") {
        newObject[key] = _id(value)
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

export function MongoDBAdapter(options: {
  db: MongoDB.Db
  collectionPrefix?: string
}): Adapter {
  const { db: m, collectionPrefix = "" } = options
  const { from, to } = format

  const { Users, Accounts, Sessions, VerificationTokens } = {
    Users: m.collection<AdapterUser>(`${collectionPrefix}${collections.Users}`),
    Accounts: m.collection<Account>(
      `${collectionPrefix}${collections.Accounts}`
    ),
    Sessions: m.collection<AdapterSession>(
      `${collectionPrefix}${collections.Sessions}`
    ),
    VerificationTokens: m.collection<VerificationToken>(
      `${collectionPrefix}${collections.VerificationTokens}`
    ),
  }
  return {
    async createUser(data) {
      const user = to<AdapterUser>(data)
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
      const user = await Users.findOne({ _id: account.userId })
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
      const userId = _id(id)
      await Promise.all([
        Accounts.deleteMany({ userId }),
        Sessions.deleteMany({ userId }),
        Users.deleteOne({ _id: userId }),
      ])
    },
    linkAccount: async (data) => {
      const account = to<Account>(data)
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
      const session = await Sessions.findOne({ sessionToken })
      if (!session) return null
      const user = await Users.findOne({ _id: session.userId })
      if (!user) return null
      return {
        user: from<AdapterUser>(user),
        session: from<AdapterSession>(session),
      }
    },
    async createSession(data) {
      const session = to<AdapterSession>(data)
      await Sessions.insertOne(session)
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
      await VerificationTokens.insertOne(to(data))
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
