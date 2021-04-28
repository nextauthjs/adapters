import type { Session, User, PrismaClient } from "@prisma/client"
import { createHash, randomBytes } from "crypto"
import LRU from "lru-cache"
import { Adapter } from "next-auth/adapters"
import {
  CreateSessionError,
  CreateUserError,
  CreateVerificationRequestError,
  DeleteSessionError,
  DeleteUserError,
  DeleteVerificationRequestError,
  GetSessionError,
  GetUserByEmailError,
  GetUserByIdError,
  GetUserByProviderAccountIdError,
  GetVerificationRequestError,
  LinkAccountError,
  UnlinkAccountError,
  UpdateSessionError,
  UpdateUserError,
} from "next-auth/errors"

const sessionCache = new LRU({
  maxAge: 24 * 60 * 60 * 1000,
  max: 1000,
})

const userCache = new LRU<User["id"], User>({
  maxAge: 24 * 60 * 60 * 1000,
  max: 1000,
})

function maxAge(expires?: string | number | Date | null) {
  return expires ? new Date(expires).getTime() - Date.now() : undefined
}

interface PrismaAdapterConfig {
  prisma: PrismaClient
  modelMapping?: Record<string, string>
}

const PrismaAdapter: Adapter<
  PrismaAdapterConfig,
  never,
  User,
  User,
  Session
> = ({ prisma }) => {
  return {
    async getAdapter(appOptions) {
      const logger = appOptions.logger ?? console

      function debug(debugCode: string, ...args: any) {
        logger.debug(`PRISMA_${debugCode}`, ...args)
      }

      if (!appOptions.session?.maxAge) {
        debug(
          "GET_ADAPTER",
          "Session expiry not configured (defaulting to 30 days)"
        )
      }

      const defaultSessionMaxAge = 30 * 24 * 60 * 60
      const sessionMaxAge =
        (appOptions.session?.maxAge ?? defaultSessionMaxAge) * 1000
      const sessionUpdateAge = (appOptions.session?.updateAge ?? 0) * 1000

      return {
        async createUser(profile) {
          debug("CREATE_USER", profile)
          try {
            const user = await prisma.user.create({
              data: {
                name: profile.name,
                email: profile.email,
                image: profile.image,
                emailVerified: profile.emailVerified?.toISOString() ?? null,
              },
            })
            userCache.set(user.id, user)
            return user
          } catch (error) {
            logger.error("CREATE_USER_ERROR", error)
            throw new CreateUserError(error)
          }
        },
        async getUser(id: number) {
          debug("GET_USER", id)
          try {
            const cachedUser = userCache.get(id)
            if (cachedUser) {
              debug("GET_USER - Fetched from LRU Cache", cachedUser)
              // stale while revalidate
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(async () => {
                const user = await prisma.user.findUnique({
                  where: { id },
                })
                if (user) userCache.set(user.id, user)
              })()
              return cachedUser
            }
            const user = await prisma.user.findUnique({
              where: { id },
            })
            if (user) userCache.set(user.id, user)
            return user
          } catch (error) {
            logger.error("GET_USER_BY_ID_ERROR", error)
            throw new GetUserByIdError(error)
          }
        },
        async getUserByEmail(email) {
          debug("GET_USER_BY_EMAIL", email)
          try {
            if (!email) {
              return null
            }
            return await prisma.user.findUnique({
              where: { email },
            })
          } catch (error) {
            logger.error("GET_USER_BY_EMAIL_ERROR", error)
            throw new GetUserByEmailError(error)
          }
        },
        async getUserByProviderAccountId(providerId, providerAccountId) {
          debug(
            "GET_USER_BY_PROVIDER_ACCOUNT_ID",
            providerId,
            providerAccountId
          )
          try {
            if (!providerId || !providerAccountId) return null
            const account = await prisma.account.findUnique({
              where: {
                providerId_providerAccountId: {
                  providerId: providerId,
                  providerAccountId: String(providerAccountId),
                },
              },
              include: {
                user: true,
              },
            })
            return account?.user ?? null
          } catch (error) {
            logger.error("GET_USER_BY_PROVIDER_ACCOUNT_ID_ERROR", error)
            throw new GetUserByProviderAccountIdError(error)
          }
        },
        async updateUser(user) {
          debug("UPDATE_USER", user)
          try {
            const { id, name, email, image, emailVerified } = user
            userCache.set(id, user)
            return await prisma.user.update({
              where: { id },
              data: {
                name,
                email,
                image,
                emailVerified: emailVerified?.toISOString?.() ?? null,
              },
            })
          } catch (error) {
            logger.error("UPDATE_USER_ERROR", error)
            throw new UpdateUserError(error)
          }
        },
        async deleteUser(userId: number) {
          userCache.del(userId)
          debug("DELETE_USER", userId)
          try {
            return await prisma.user.delete({
              where: { id: userId },
            })
          } catch (error) {
            logger.error("DELETE_USER_ERROR", error)
            throw new DeleteUserError(error)
          }
        },
        async linkAccount(
          userId: number,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          debug(
            "LINK_ACCOUNT",
            userId,
            providerId,
            providerType,
            providerAccountId,
            refreshToken,
            accessToken,
            accessTokenExpires
          )
          try {
            return await prisma.account.create({
              data: {
                accessToken,
                refreshToken,
                providerAccountId: providerAccountId,
                providerId,
                providerType,
                accessTokenExpires,
                user: { connect: { id: userId } },
              },
            })
          } catch (error) {
            logger.error("LINK_ACCOUNT_ERROR", error)
            throw new LinkAccountError(error)
          }
        },
        async unlinkAccount(userId, providerId, providerAccountId) {
          debug("UNLINK_ACCOUNT", userId, providerId, providerAccountId)
          try {
            return await prisma.account.delete({
              where: {
                providerId_providerAccountId: {
                  providerAccountId: String(providerAccountId),
                  providerId: providerId,
                },
              },
            })
          } catch (error) {
            logger.error("UNLINK_ACCOUNT_ERROR", error)
            throw new UnlinkAccountError(error)
          }
        },
        async createSession(user) {
          debug("CREATE_SESSION", user)
          try {
            let expires: string | Date | null = null
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
            expires = dateExpires.toISOString()

            const session = {
              userId: user.id,
              expires,
              sessionToken: randomBytes(32).toString("hex"),
              accessToken: randomBytes(32).toString("hex"),
            }

            sessionCache.set(session.sessionToken, session, maxAge(expires))
            const res = await prisma.session.create({
              data: session,
            })
            return res
          } catch (error) {
            logger.error("CREATE_SESSION_ERROR", error)
            throw new CreateSessionError(error)
          }
        },
        async getSession(sessionToken) {
          debug("GET_SESSION", sessionToken)
          try {
            const cachedSession = sessionCache.get(sessionToken)
            if (cachedSession) {
              debug("GET_SESSION - Fetched from LRU Cache", cachedSession)
              return cachedSession
            }
            const session = await prisma.session.findUnique({
              where: { sessionToken: sessionToken },
            })

            // Check session has not expired (do not return it if it has)
            if (session?.expires && new Date() > session.expires) {
              await prisma.session.delete({
                where: { sessionToken },
              })
              return null
            }

            session &&
              sessionCache.set(
                session.sessionToken,
                session,
                maxAge(session.expires)
              )

            return session
          } catch (error) {
            logger.error("GET_SESSION_ERROR", error)
            throw new GetSessionError(error)
          }
        },
        async updateSession(session, force) {
          debug("UPDATE_SESSION", session)
          try {
            if (
              sessionMaxAge &&
              (sessionUpdateAge || sessionUpdateAge === 0) &&
              session.expires
            ) {
              // Calculate last updated date, to throttle write updates to database
              // Formula: ({expiry date} - sessionMaxAge) + sessionUpdateAge
              //     e.g. ({expiry date} - 30 days) + 1 hour
              //
              // Default for sessionMaxAge is 30 days.
              // Default for sessionUpdateAge is 1 hour.
              const dateSessionIsDueToBeUpdated = new Date(session.expires)
              dateSessionIsDueToBeUpdated.setTime(
                dateSessionIsDueToBeUpdated.getTime() - sessionMaxAge
              )
              dateSessionIsDueToBeUpdated.setTime(
                dateSessionIsDueToBeUpdated.getTime() + sessionUpdateAge
              )

              // Trigger update of session expiry date and write to database, only
              // if the session was last updated more than {sessionUpdateAge} ago
              if (new Date() > dateSessionIsDueToBeUpdated) {
                const newExpiryDate = new Date()
                newExpiryDate.setTime(newExpiryDate.getTime() + sessionMaxAge)
                session.expires = newExpiryDate
              } else if (!force) {
                return null
              }
            } else {
              // If session MaxAge, session UpdateAge or session.expires are
              // missing then don't even try to save changes, unless force is set.
              if (!force) {
                return null
              }
            }

            const { id, expires } = session
            sessionCache.set(session.sessionToken, session, maxAge(expires))
            return await prisma.session.update({
              where: { id },
              data: { expires },
            })
          } catch (error) {
            logger.error("UPDATE_SESSION_ERROR", error)
            throw new UpdateSessionError(error)
          }
        },
        async deleteSession(sessionToken) {
          debug("DELETE_SESSION", sessionToken)
          try {
            sessionCache.del(sessionToken)
            return await prisma.session.delete({
              where: { sessionToken },
            })
          } catch (error) {
            logger.error("DELETE_SESSION_ERROR", error)
            throw new DeleteSessionError(error)
          }
        },
        async createVerificationRequest(
          identifier,
          url,
          token: string,
          secret: string,
          provider
        ) {
          debug("CREATE_VERIFICATION_REQUEST", identifier)
          try {
            const baseUrl = appOptions.baseUrl ?? ""
            const { sendVerificationRequest, maxAge } = provider

            // Store hashed token (using secret as salt) so that tokens cannot be exploited
            // even if the contents of the database is compromised.
            // @TODO Use bcrypt function here instead of simple salted hash
            const hashedToken = createHash("sha256")
              .update(`${token}${secret}`)
              .digest("hex")

            let expires = ""
            if (maxAge) {
              const dateExpires = new Date()
              dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)
              expires = dateExpires.toISOString()
            }

            // Save to database
            const verificationRequest = await prisma.verificationRequest.create(
              {
                data: {
                  identifier,
                  token: hashedToken,
                  expires,
                },
              }
            )

            // With the verificationCallback on a provider, you can send an email, or queue
            // an email to be sent, or perform some other action (e.g. send a text message)
            await sendVerificationRequest(
              identifier,
              url,
              token,
              baseUrl,
              provider
            )

            return verificationRequest
          } catch (error) {
            logger.error("CREATE_VERIFICATION_REQUEST_ERROR", error)
            throw new CreateVerificationRequestError(error)
          }
        },
        async getVerificationRequest(
          identifier,
          token: string,
          secret: string
        ) {
          debug("GET_VERIFICATION_REQUEST", identifier, token)
          try {
            // Hash token provided with secret before trying to match it with database
            // @TODO Use bcrypt instead of salted SHA-256 hash for token
            const _token = `${token}${secret}`
            const hashedToken = createHash("sha256")
              .update(_token)
              .digest("hex")
            const verificationRequest = await prisma.verificationRequest.findUnique(
              {
                where: {
                  identifier_token: {
                    identifier: identifier,
                    token: hashedToken,
                  },
                },
              }
            )

            if (
              verificationRequest?.expires &&
              new Date() > verificationRequest.expires
            ) {
              // Delete verification entry so it cannot be used again
              await prisma.verificationRequest.delete({
                where: {
                  identifier_token: {
                    identifier: identifier,
                    token: hashedToken,
                  },
                },
              })
              return null
            }

            return verificationRequest
          } catch (error) {
            logger.error("GET_VERIFICATION_REQUEST_ERROR", error)
            throw new GetVerificationRequestError(error)
          }
        },
        async deleteVerificationRequest(
          identifier,
          token: string,
          secret: string
        ) {
          debug("DELETE_VERIFICATION", identifier, token)
          try {
            // Delete verification entry so it cannot be used again
            const hashedToken = createHash("sha256")
              .update(`${token}${secret}`)
              .digest("hex")
            return await prisma.verificationRequest.delete({
              where: {
                identifier_token: {
                  identifier: identifier,
                  token: hashedToken,
                },
              },
            })
          } catch (error) {
            logger.error("DELETE_VERIFICATION_REQUEST_ERROR", error)
            throw new DeleteVerificationRequestError(error)
          }
        },
      }
    },
  }
}

export default PrismaAdapter
