import { createHash, randomBytes } from "crypto"

export function getCompoundId(a, b) {
  return createHash("sha256").update(`${a}:${b}`).digest("hex")
}

/** @type {import("..").Adapter} */
export function PrismaLegacyAdapter(config) {
  const {
    prisma,
    modelMapping = {
      User: "user",
      Account: "account",
      Session: "session",
      VerificationRequest: "verificationRequest",
    },
  } = config

  const { User, Account, Session, VerificationRequest } = modelMapping

  return {
    async getAdapter({
      session: { maxAge, updateAge },
      secret,
      ...appOptions
    }) {
      const sessionMaxAge = maxAge * 1000
      const sessionUpdateAge = updateAge * 1000

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "PRISMA_LEGACY",
        createUser(profile) {
          return prisma[User].create({
            data: {
              name: profile.name,
              email: profile.email,
              image: profile.image,
              emailVerified: profile.emailVerified?.toISOString(),
            },
          })
        },
        getUser(id) {
          return prisma[User].findUnique({ where: { id } })
        },
        getUserByEmail(email) {
          if (email) {
            return prisma[User].findUnique({ where: { email } })
          }
          return null
        },
        async getUserByProviderAccountId(providerId, providerAccountId) {
          const account = await prisma[Account].findUnique({
            where: {
              compoundId: getCompoundId(providerId, providerAccountId),
            },
          })
          if (account) {
            return prisma[User].findUnique({ where: { id: account.userId } })
          }
          return null
        },

        updateUser(user) {
          const { id, name, email, image, emailVerified } = user
          return prisma[User].update({
            where: { id },
            data: {
              name,
              email,
              image,
              emailVerified: emailVerified?.toISOString(),
            },
          })
        },

        deleteUser(userId) {
          return prisma[User].delete({ where: { id: userId } })
        },

        linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          return prisma[Account].create({
            data: {
              accessToken,
              refreshToken,
              compoundId: getCompoundId(providerId, providerAccountId),
              providerAccountId: `${providerAccountId}`,
              providerId,
              providerType,
              accessTokenExpires,
              userId,
            },
          })
        },

        unlinkAccount(_, providerId, providerAccountId) {
          return prisma[Account].delete({
            where: {
              compoundId: getCompoundId(providerId, providerAccountId),
            },
          })
        },

        createSession(user) {
          let expires = null
          if (sessionMaxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
            expires = dateExpires.toISOString()
          }

          return prisma[Session].create({
            data: {
              expires,
              userId: user.id,
              sessionToken: randomBytes(32).toString("hex"),
              accessToken: randomBytes(32).toString("hex"),
            },
          })
        },

        async getSession(sessionToken) {
          const session = await prisma[Session].findUnique({
            where: { sessionToken },
          })

          // Check session has not expired (do not return it if it has)
          if (session?.expires && new Date() > session.expires) {
            await prisma[Session].delete({ where: { sessionToken } })
            return null
          }

          return session
        },

        updateSession(session, force) {
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
          return prisma[Session].update({
            where: { id },
            data: { expires: expires.toISOString() },
          })
        },

        deleteSession(sessionToken) {
          return prisma[Session].delete({ where: { sessionToken } })
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          const { sendVerificationRequest, maxAge } = provider

          let expires = null
          if (maxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)
            expires = dateExpires.toISOString()
          }

          // Save to database
          const verificationRequest = await prisma[VerificationRequest].create({
            data: {
              identifier,
              token: hashToken(token),
              expires,
            },
          })

          // With the verificationCallback on a provider, you can send an email, or queue
          // an email to be sent, or perform some other action (e.g. send a text message)
          await sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })

          return verificationRequest
        },

        async getVerificationRequest(identifier, token) {
          // Hash token provided with secret before trying to match it with database
          // @TODO Use bcrypt instead of salted SHA-256 hash for token
          const hashedToken = hashToken(token)
          const verificationRequest = await prisma[
            VerificationRequest
          ].findFirst({
            where: {
              identifier,
              token: hashedToken,
            },
          })
          if (
            verificationRequest &&
            verificationRequest.expires &&
            new Date() > verificationRequest.expires
          ) {
            // Delete verification entry so it cannot be used again
            await prisma[VerificationRequest].deleteMany({
              where: { identifier, token: hashedToken },
            })
            return null
          }

          return verificationRequest
        },

        async deleteVerificationRequest(identifier, token) {
          // Delete verification entry so it cannot be used again
          await prisma[VerificationRequest].deleteMany({
            where: { identifier, token: hashToken(token) },
          })
        },
      }
    },
  }
}

export { PrismaLegacyAdapter as Adapter }
