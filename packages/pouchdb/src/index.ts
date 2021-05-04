import type { Adapter } from "next-auth/adapters"
import { createHash, randomBytes } from "crypto"
import { User, Account, Profile, Session } from "next-auth"
import { ulid } from "ulid"

interface VerificationRequest extends Object {
  id: string
  identifier: string
  token: string
  expires: Date
}

interface UserDoc extends PouchDB.Core.Document<any> {
  data?: User
}

interface AccountDoc extends PouchDB.Core.Document<any> {
  data?: Account & { userId?: string }
}

interface SessionDoc extends PouchDB.Core.Document<any> {
  data?: Session
}

interface VerificationRequestDoc extends PouchDB.Core.Document<any> {
  data?: VerificationRequest
}

function verificationRequestToken({
  token,
  secret,
}: {
  token: string
  secret: string
}) {
  // TODO: Use bcrypt or a more secure method
  return createHash("sha256").update(`${token}${secret}`).digest("hex")
}

export const PouchDBAdapter: Adapter<
  { pouchdb: PouchDB.Database },
  never,
  User,
  Profile & { emailVerified?: Date },
  Session
> = ({ pouchdb }) => {
  return {
    async getAdapter({ logger, session, ...appOptions }) {
      function debug(debugCode: string, ...args: unknown[]) {
        logger.debug(`POUCHDB_${debugCode}`, ...args)
      }

      if (!session.maxAge) {
        debug(
          "GET_ADAPTER",
          "Session expiry not configured (defaulting to 30 days)"
        )
      }
      if (!session.updateAge) {
        debug(
          "GET_ADAPTER",
          "Session update age not configured (defaulting to 1 day)"
        )
      }
      const {
        maxAge = 30 * 24 * 60 * 60, // 30 days
        updateAge = 24 * 60 * 60, // 1 day
      } = session
      const sessionMaxAgeMs = maxAge * 1000
      const sessionUpdateAgeMs = updateAge * 1000

      // create indexes if they don't exist
      const res = await pouchdb.getIndexes()
      const indexes = res.indexes.map((index) => index.name, [])
      // nextAuthUserByEmail
      if (!indexes.includes("nextAuthUserByEmail")) {
        await pouchdb.createIndex({
          index: {
            name: "nextAuthUserByEmail",
            ddoc: "nextAuthUserByEmail",
            fields: ["data.email"],
          },
        })
      }
      // nextAuthAccountByProviderId
      if (!indexes.includes("nextAuthAccountByProviderId")) {
        await pouchdb.createIndex({
          index: {
            name: "nextAuthAccountByProviderId",
            ddoc: "nextAuthAccountByProviderId",
            fields: ["data.providerId", "data.providerAccountId"],
          },
        })
      }
      // nextAuthSessionByToken
      if (!indexes.includes("nextAuthSessionByToken")) {
        await pouchdb.createIndex({
          index: {
            name: "nextAuthSessionByToken",
            ddoc: "nextAuthSessionByToken",
            fields: ["data.sessionToken"],
          },
        })
      }
      // nextAuthVerificationRequestByToken
      if (!indexes.includes("nextAuthVerificationRequestByToken")) {
        await pouchdb.createIndex({
          index: {
            name: "nextAuthVerificationRequestByToken",
            ddoc: "nextAuthVerificationRequestByToken",
            fields: ["data.identifier", "data.token"],
          },
        })
      }

      return {
        async createUser(profile) {
          const data = {
            id: ["USER", ulid()].join("_"),
            name: profile.name,
            email: profile.email,
            image: profile.image,
            emailVerified: profile.emailVerified
              ? profile.emailVerified.toISOString()
              : null,
          }

          await pouchdb.put({
            _id: data.id,
            data,
          })
          return data
        },

        async getUser(id) {
          const res: PouchDB.Core.Document<UserDoc> = await pouchdb.get(id)
          return res?.data ?? null
        },

        async getUserByEmail(email) {
          if (!email) return null
          const res = await pouchdb.find({
            use_index: "nextAuthUserByEmail",
            selector: { "data.email": { $eq: email } },
            limit: 1,
          })
          const user: UserDoc = res.docs[0]
          return user?.data ?? null
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const res = await pouchdb.find({
            use_index: "nextAuthAccountByProviderId",
            selector: {
              "data.providerId": { $eq: providerId },
              "data.providerAccountId": { $eq: providerAccountId },
            },
            limit: 1,
          })
          const accountDoc: AccountDoc = res.docs[0]
          const userDoc: PouchDB.Core.Document<UserDoc> = await pouchdb.get(
            accountDoc.data?.userId ?? ""
          )
          return userDoc?.data ?? null
        },

        async updateUser(user: User & { id: string }) {
          const doc: PouchDB.Core.Document<UserDoc> = await pouchdb.get(user.id)
          doc.data = {
            ...doc.data,
            ...user,
          }
          await pouchdb.put(doc)
          return doc.data
        },

        async deleteUser(id) {
          const doc: PouchDB.Core.Document<UserDoc> = await pouchdb.get(id)
          await pouchdb.put({
            ...doc,
            _deleted: true,
          })
        },

        async linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          await pouchdb.put({
            _id: ["ACCOUNT", ulid()].join("_"),
            data: {
              userId,
              providerId,
              providerType,
              providerAccountId,
              refreshToken,
              accessToken,
              accessTokenExpires:
                accessTokenExpires != null
                  ? new Date(accessTokenExpires)
                  : null,
            },
          })
        },

        async unlinkAccount(_, providerId, providerAccountId) {
          const account = await pouchdb.find({
            use_index: "nextAuthAccountByProviderId",
            selector: {
              "data.providerId": { $eq: providerId },
              "data.providerAccountId": { $eq: providerAccountId },
            },
            limit: 1,
          })
          await pouchdb.put({
            ...account.docs[0],
            _deleted: true,
          })
        },

        async createSession(user) {
          const data = {
            userId: user.id,
            expires: new Date(Date.now() + sessionMaxAgeMs).toISOString(),
            sessionToken: randomBytes(32).toString("hex"),
            accessToken: randomBytes(32).toString("hex"),
          }
          await pouchdb.put({
            _id: ["SESSION", ulid()].join("_"),
            data,
          })
          return data
        },

        async getSession(sessionToken) {
          const res = await pouchdb.find({
            use_index: "nextAuthSessionByToken",
            selector: {
              "data.sessionToken": { $eq: sessionToken },
            },
            limit: 1,
          })
          const sessionDoc: SessionDoc = res.docs[0]
          if (new Date(sessionDoc?.data?.expires ?? Infinity) < new Date()) {
            await pouchdb.put({ ...sessionDoc, _deleted: true })
            return null
          }
          return sessionDoc.data ?? null
        },

        async updateSession(session, force) {
          if (
            !force &&
            Number(session.expires) - sessionMaxAgeMs + sessionUpdateAgeMs >
              Date.now()
          ) {
            return null
          }
          const res = await pouchdb.find({
            use_index: "nextAuthSessionByToken",
            selector: {
              "data.sessionToken": { $eq: session.sessionToken },
            },
            limit: 1,
          })
          const previousSessionDoc: SessionDoc = res.docs[0]
          const currentSessionDoc = {
            ...previousSessionDoc,
            data: {
              ...previousSessionDoc.data,
              expires: new Date(Date.now() + sessionMaxAgeMs).toISOString(),
            },
          }
          await pouchdb.put(currentSessionDoc)
          return currentSessionDoc.data
        },

        async deleteSession(sessionToken) {
          const res = await pouchdb.find({
            use_index: "nextAuthSessionByToken",
            selector: {
              "data.sessionToken": { $eq: sessionToken },
            },
            limit: 1,
          })
          const sessionDoc: SessionDoc = res.docs[0]
          await pouchdb.put({
            ...sessionDoc,
            _deleted: true,
          })
        },

        async createVerificationRequest(
          identifier,
          url,
          token,
          secret,
          provider
        ) {
          const hashedToken = verificationRequestToken({ token, secret })
          const data = {
            identifier,
            token: hashedToken,
            expires: new Date(Date.now() + provider.maxAge * 1000),
          }
          await pouchdb.put({
            _id: ["VERIFICATION-REQUEST", ulid()].join("_"),
            data,
          })
          await provider.sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })
        },

        async getVerificationRequest(identifier, token, secret) {
          const hashedToken = verificationRequestToken({ token, secret })
          const res = await pouchdb.find({
            use_index: "nextAuthVerificationRequestByToken",
            selector: {
              "data.identifier": { $eq: identifier },
              "data.token": { $eq: hashedToken },
            },
            limit: 1,
          })
          const verificationRequestDoc: VerificationRequestDoc = res.docs[0]
          if (
            new Date(verificationRequestDoc?.data?.expires ?? Infinity) <
            new Date()
          ) {
            await pouchdb.put({
              ...verificationRequestDoc,
              _deleted: true,
            })
            return null
          }
          return verificationRequestDoc.data ?? null
        },

        async deleteVerificationRequest(identifier, token, secret) {
          const hashedToken = verificationRequestToken({ token, secret })
          const res = await pouchdb.find({
            use_index: "nextAuthVerificationRequestByToken",
            selector: {
              "data.identifier": { $eq: identifier },
              "data.token": { $eq: hashedToken },
            },
            limit: 1,
          })
          const verificationRequestDoc: VerificationRequestDoc = res.docs[0]
          await pouchdb.put({
            ...verificationRequestDoc,
            _deleted: true,
          })
        },
      }
    },
  }
}
