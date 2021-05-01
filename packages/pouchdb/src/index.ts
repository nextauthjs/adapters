import { ulid } from "ulid"
// import { createHash, randomBytes } from "crypto"
// import type PouchDB from "pouchdb"
// import type { Profile } from "next-auth"
// import type { Adapter } from "next-auth/adapters"
import {
  CreateUserError,
  GetUserByIdError,
  GetUserByEmailError,
  UpdateUserError,
  DeleteUserError,
  // CreateSessionError,
  // CreateVerificationRequestError,
  // DeleteSessionError,
  // DeleteVerificationRequestError,
  // GetSessionError,
  // GetUserByProviderAccountIdError,
  // GetVerificationRequestError,
  // LinkAccountError,
  // UnlinkAccountError,
  // UpdateSessionError,
} from "next-auth/errors"

// function verificationRequestToken({
//   token,
//   secret,
// }: {
//   token: string
//   secret: string
// }) {
//   // TODO: Use bcrypt or a more secure method
//   return createHash("sha256").update(`${token}${secret}`).digest("hex")
// }

// const PouchDBAdapter: Adapter<
//   { pouchdb: PouchDB.Database },
//   never,
//   User,
//   Profile & { emailVerified?: Date },
//   Session
// > = ({ pouchdb }) => {
const PouchDBAdapter: any = ({ pouchdb }: { pouchdb: PouchDB.Database }) => {
  return {
    async getAdapter({ logger, session, ...appOptions }: any) {
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

      // const {
      //   maxAge = 30 * 24 * 60 * 60, // 30 days
      //   updateAge = 24 * 60 * 60, // 1 day
      // } = session
      // const sessionMaxAgeMs = maxAge * 1000
      // const sessionUpdateAgeMs = updateAge * 1000

      return {
        async createUser(profile: any) {
          debug("CREATE_USER", profile)
          try {
            const data = {
              id: ["User", ulid()].join("_"),
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
          } catch (error) {
            logger.error("CREATE_USER_ERROR", error)
            throw new CreateUserError(error)
          }
        },
        async getUser(id: string) {
          debug("GET_USER", id)
          try {
            const res: any = await pouchdb.get(id)
            return res.data
          } catch (error) {
            logger.error("GET_USER_BY_ID_ERROR", error)
            throw new GetUserByIdError(error)
          }
        },
        async getUserByEmail(email: string) {
          debug("GET_USER_BY_EMAIL", email)
          try {
            if (!email) return null
            const res: any = await pouchdb.find({
              use_index: "byEmail",
              selector: { "data.email": { $eq: email } },
              limit: 1,
            })
            return res.docs[0]?.data ?? null
          } catch (error) {
            logger.error("GET_USER_BY_EMAIL_ERROR", error)
            throw new GetUserByEmailError(error)
          }
        },
        //   async getUserByProviderAccountId(providerId, providerAccountId) {
        //     debug(
        //       "GET_USER_BY_PROVIDER_ACCOUNT_ID",
        //       providerId,
        //       providerAccountId
        //     )
        //     try {
        //       const account = await prisma.account.findUnique({
        //         where: {
        //           providerId_providerAccountId: { providerId, providerAccountId },
        //         },
        //         select: { user: true },
        //       })
        //       return account ? account.user : null
        //     } catch (error) {
        //       logger.error("GET_USER_BY_PROVIDER_ACCOUNT_ID_ERROR", error)
        //       throw new GetUserByProviderAccountIdError(error)
        //     }
        //   },

        async updateUser(user: any) {
          debug("UPDATE_USER", user)
          try {
            const doc: any = await pouchdb.get(user.id)
            doc.data = {
              ...doc.data,
              ...user,
            }
            await pouchdb.put(doc)
            return doc.data
          } catch (error) {
            logger.error("UPDATE_USER_ERROR", error)
            throw new UpdateUserError(error)
          }
        },

        async deleteUser(id: string) {
          debug("DELETE_USER", id)
          try {
            const doc: any = await pouchdb.get(id)
            await pouchdb.put({
              ...doc,
              _deleted: true,
            })
            return
          } catch (error) {
            logger.error("DELETE_USER_ERROR", error)
            throw new DeleteUserError(error)
          }
        },

        //   async linkAccount(
        //     userId,
        //     providerId,
        //     providerType,
        //     providerAccountId,
        //     refreshToken,
        //     accessToken,
        //     accessTokenExpires
        //   ) {
        //     debug(
        //       "LINK_ACCOUNT",
        //       userId,
        //       providerId,
        //       providerType,
        //       providerAccountId,
        //       refreshToken,
        //       accessToken,
        //       accessTokenExpires
        //     )
        //     try {
        //       await prisma.account.create({
        //         data: {
        //           userId,
        //           providerId,
        //           providerType,
        //           providerAccountId,
        //           refreshToken,
        //           accessToken,
        //           accessTokenExpires:
        //             accessTokenExpires != null
        //               ? new Date(accessTokenExpires)
        //               : null,
        //         },
        //       })
        //     } catch (error) {
        //       logger.error("LINK_ACCOUNT_ERROR", error)
        //       throw new LinkAccountError(error)
        //     }
        //   },

        //   async unlinkAccount(userId, providerId, providerAccountId) {
        //     debug("UNLINK_ACCOUNT", userId, providerId, providerAccountId)
        //     try {
        //       await prisma.account.delete({
        //         where: {
        //           providerId_providerAccountId: { providerId, providerAccountId },
        //         },
        //       })
        //     } catch (error) {
        //       logger.error("UNLINK_ACCOUNT_ERROR", error)
        //       throw new UnlinkAccountError(error)
        //     }
        //   },

        //   async createSession(user) {
        //     debug("CREATE_SESSION", user)
        //     try {
        //       return await prisma.session.create({
        //         data: {
        //           userId: user.id,
        //           expires: new Date(Date.now() + sessionMaxAgeMs),
        //           sessionToken: randomBytes(32).toString("hex"),
        //           accessToken: randomBytes(32).toString("hex"),
        //         },
        //       })
        //     } catch (error) {
        //       logger.error("CREATE_SESSION_ERROR", error)
        //       throw new CreateSessionError(error)
        //     }
        //   },

        //   async getSession(sessionToken) {
        //     debug("GET_SESSION", sessionToken)
        //     try {
        //       const session = await prisma.session.findUnique({
        //         where: { sessionToken },
        //       })
        //       if (session && session.expires < new Date()) {
        //         await prisma.session.delete({ where: { sessionToken } })
        //         return null
        //       }
        //       return session
        //     } catch (error) {
        //       logger.error("GET_SESSION_ERROR", error)
        //       throw new GetSessionError(error)
        //     }
        //   },

        //   async updateSession(session, force) {
        //     debug("UPDATE_SESSION", session)
        //     try {
        //       if (
        //         !force &&
        //         Number(session.expires) - sessionMaxAgeMs + sessionUpdateAgeMs >
        //           Date.now()
        //       ) {
        //         return null
        //       }
        //       return await prisma.session.update({
        //         where: { id: session.id },
        //         data: {
        //           expires: new Date(Date.now() + sessionMaxAgeMs),
        //         },
        //       })
        //     } catch (error) {
        //       logger.error("UPDATE_SESSION_ERROR", error)
        //       throw new UpdateSessionError(error)
        //     }
        //   },

        //   async deleteSession(sessionToken) {
        //     debug("DELETE_SESSION", sessionToken)
        //     try {
        //       await prisma.session.delete({ where: { sessionToken } })
        //     } catch (error) {
        //       logger.error("DELETE_SESSION_ERROR", error)
        //       throw new DeleteSessionError(error)
        //     }
        //   },

        //   async createVerificationRequest(
        //     identifier,
        //     url,
        //     token,
        //     secret,
        //     provider
        //   ) {
        //     debug("CREATE_VERIFICATION_REQUEST", identifier)
        //     try {
        //       const hashedToken = verificationRequestToken({ token, secret })
        //       await prisma.verificationRequest.create({
        //         data: {
        //           identifier,
        //           token: hashedToken,
        //           expires: new Date(Date.now() + provider.maxAge * 1000),
        //         },
        //       })
        //       await provider.sendVerificationRequest({
        //         identifier,
        //         url,
        //         token,
        //         baseUrl: appOptions.baseUrl,
        //         provider,
        //       })
        //     } catch (error) {
        //       logger.error("CREATE_VERIFICATION_REQUEST_ERROR", error)
        //       throw new CreateVerificationRequestError(error)
        //     }
        //   },

        //   async getVerificationRequest(identifier, token, secret) {
        //     debug("GET_VERIFICATION_REQUEST", identifier, token)
        //     try {
        //       const hashedToken = verificationRequestToken({ token, secret })
        //       const verificationRequest = await prisma.verificationRequest.findUnique(
        //         {
        //           where: { identifier_token: { identifier, token: hashedToken } },
        //         }
        //       )
        //       if (
        //         verificationRequest &&
        //         verificationRequest.expires < new Date()
        //       ) {
        //         await prisma.verificationRequest.delete({
        //           where: { identifier_token: { identifier, token: hashedToken } },
        //         })
        //         return null
        //       }
        //       return verificationRequest
        //     } catch (error) {
        //       logger.error("GET_VERIFICATION_REQUEST_ERROR", error)
        //       throw new GetVerificationRequestError(error)
        //     }
        //   },

        //   async deleteVerificationRequest(identifier, token, secret) {
        //     debug("DELETE_VERIFICATION_REQUEST", identifier, token)
        //     try {
        //       const hashedToken = verificationRequestToken({ token, secret })
        //       await prisma.verificationRequest.delete({
        //         where: { identifier_token: { identifier, token: hashedToken } },
        //       })
        //     } catch (error) {
        //       logger.error("DELETE_VERIFICATION_REQUEST_ERROR", error)
        //       throw new DeleteVerificationRequestError(error)
        //     }
        //   },
      }
    },
  }
}

export default PouchDBAdapter
