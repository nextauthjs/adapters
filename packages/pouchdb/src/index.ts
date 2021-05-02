import type { Adapter } from "next-auth/adapters"
import { createHash, randomBytes } from "crypto"
import { User, Profile, Session } from "next-auth"
import { ulid } from "ulid"

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
          const res: any = await pouchdb.get(id)
          return res?.data ?? null
        },

        async getUserByEmail(email: string) {
          if (!email) return null
          const res: any = await pouchdb.find({
            use_index: "nextAuthUserByEmail",
            selector: { "data.email": { $eq: email } },
            limit: 1,
          })
          return res.docs?.[0].data ?? null
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const account: any = await pouchdb.find({
            use_index: "nextAuthAccountByProviderId",
            selector: {
              "data.providerId": { $eq: providerId },
              "data.providerAccountId": { $eq: providerAccountId },
            },
            limit: 1,
          })
          const user: any = await pouchdb
            .get(account.docs?.[0].data.userId)
            .catch(() => ({ data: null }))
          return user?.data ?? null
        },

        async updateUser(user: any) {
          const doc: any = await pouchdb.get(user.id)
          doc.data = {
            ...doc.data,
            ...user,
          }
          await pouchdb.put(doc)
          return doc.data
        },

        async deleteUser(id) {
          const doc = await pouchdb.get(id)
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
            expires: new Date(Date.now() + sessionMaxAgeMs),
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
          const session: any = await pouchdb.find({
            use_index: "nextAuthSessionByToken",
            selector: {
              "data.sessionToken": { $eq: sessionToken },
            },
            limit: 1,
          })
          if (
            new Date(session.docs?.[0].data.expires ?? Infinity) < new Date()
          ) {
            await pouchdb.put({ ...session.docs[0], _deleted: true })
            return null
          }
          return session.docs?.[0].data
        },

        async updateSession(session, force) {
          if (
            !force &&
            Number(session.expires) - sessionMaxAgeMs + sessionUpdateAgeMs >
              Date.now()
          ) {
            return null
          }
          const previousSession: any = await pouchdb.find({
            use_index: "nextAuthSessionByToken",
            selector: {
              "data.sessionToken": { $eq: session.sessionToken },
            },
            limit: 1,
          })
          const currentSession = {
            ...previousSession.docs[0],
          }
          currentSession.data.expires = new Date(Date.now() + sessionMaxAgeMs)
          await pouchdb.put(currentSession)
          return currentSession.data
        },

        async deleteSession(sessionToken) {
          const session = await pouchdb.find({
            use_index: "nextAuthSessionByToken",
            selector: {
              "data.sessionToken": { $eq: sessionToken },
            },
            limit: 1,
          })
          await pouchdb.put({
            ...session.docs[0],
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
          const verificationRequest: any = await pouchdb.find({
            use_index: "nextAuthVerificationRequestByToken",
            selector: {
              "data.identifier": { $eq: identifier },
              "data.token": { $eq: hashedToken },
            },
            limit: 1,
          })
          if (
            new Date(verificationRequest.docs?.[0].data.expires ?? Infinity) <
            new Date()
          ) {
            await pouchdb.put({
              ...verificationRequest.docs[0],
              _deleted: true,
            })
            return null
          }
          return verificationRequest.docs?.[0].data
        },

        async deleteVerificationRequest(identifier, token, secret) {
          const hashedToken = verificationRequestToken({ token, secret })
          const verificationRequest: any = await pouchdb.find({
            use_index: "nextAuthVerificationRequestByToken",
            selector: {
              "data.identifier": { $eq: identifier },
              "data.token": { $eq: hashedToken },
            },
            limit: 1,
          })
          await pouchdb.put({
            ...verificationRequest.docs[0],
            _deleted: true,
          })
        },
      }
    },
  }
}
