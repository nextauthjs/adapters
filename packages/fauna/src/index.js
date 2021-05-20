import { query as q } from "faunadb"
import { createHash, randomBytes } from "crypto"

/** @type {import("next-auth/adapters").Adapter} */
export function Adapter(config, options = {}) {
  const {
    faunaClient,
    collections = {
      User: "users",
      Account: "accounts",
      Session: "sessions",
      VerificationRequest: "verification_requests",
    },
    indexes = {
      Account: "account_by_provider_account_id",
      User: "user_by_email",
      Session: "session_by_token",
      VerificationRequest: "verification_request_by_token_and_identifier",
    },
  } = config

  return {
    async getAdapter({ session, secret, ...appOptions }) {
      const sessionMaxAge = session.maxAge * 1000 // default is 30 days
      const sessionUpdateAge = session.updateAge * 1000 // default is 1 day

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "FAUNA",
        async createUser(profile) {
          const newUser = await faunaClient.query(
            q.Create(q.Collection(collections.User), {
              data: {
                name: profile.name,
                email: profile.email,
                image: profile.image,
                emailVerified: profile.emailVerified
                  ? q.Time(profile.emailVerified.toISOString())
                  : null,
                username: profile.username,
                createdAt: q.Now(),
                updatedAt: q.Now(),
              },
            })
          )
          newUser.data.id = newUser.ref.id

          return newUser.data
        },
        async getUser(id) {
          const user = await faunaClient.query(
            q.Get(q.Ref(q.Collection(collections.User), id))
          )
          user.data.id = user.ref.id
          return user.data
        },
        async getUserByEmail(email) {
          if (!email) {
            return null
          }

          const user = await faunaClient.query(
            q.Let(
              {
                ref: q.Match(q.Index(indexes.User), email),
              },
              q.If(q.Exists(q.Var("ref")), q.Get(q.Var("ref")), null)
            )
          )

          if (user == null) {
            return null
          }

          user.data.id = user.ref.id
          return user.data
        },
        async getUserByProviderAccountId(providerId, providerAccountId) {
          const user = await faunaClient.query(
            q.Let(
              {
                ref: q.Match(q.Index(indexes.Account), [
                  providerId,
                  providerAccountId,
                ]),
              },
              q.If(
                q.Exists(q.Var("ref")),
                q.Get(
                  q.Ref(
                    q.Collection(collections.User),
                    q.Select(["data", "userId"], q.Get(q.Var("ref")))
                  )
                ),
                null
              )
            )
          )

          if (user == null) {
            return null
          }

          user.data.id = user.ref.id

          return user.data
        },
        async updateUser(user) {
          const newUser = await faunaClient.query(
            q.Update(q.Ref(q.Collection(collections.User), user.id), {
              data: {
                name: user.name,
                email: user.email,
                image: user.image,
                emailVerified: user.emailVerified
                  ? q.Time(user.emailVerified.toISOString())
                  : null,
                username: user.username,
                updatedAt: q.Now(),
              },
            })
          )
          newUser.data.id = newUser.ref.id

          return newUser.data
        },
        async deleteUser(userId) {
          await faunaClient.query(
            q.Delete(q.Ref(q.Collection(collections.User), userId))
          )
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
          const account = await faunaClient.query(
            q.Create(q.Collection(collections.Account), {
              data: {
                userId: userId,
                providerId: providerId,
                providerType: providerType,
                providerAccountId: providerAccountId,
                refreshToken: refreshToken,
                accessToken: accessToken,
                accessTokenExpires: accessTokenExpires,
                createdAt: q.Now(),
                updatedAt: q.Now(),
              },
            })
          )

          return account.data
        },
        async unlinkAccount(userId, providerId, providerAccountId) {
          await faunaClient.query(
            q.Delete(
              q.Select(
                "ref",
                q.Get(
                  q.Match(q.Index(indexes.Account), [
                    providerId,
                    providerAccountId,
                  ])
                )
              )
            )
          )
        },
        async createSession(user) {
          let expires = null
          if (sessionMaxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
            expires = dateExpires.toISOString()
          }

          const session = await faunaClient.query(
            q.Create(q.Collection(collections.Session), {
              data: {
                userId: user.id,
                expires: q.Time(expires),
                sessionToken: randomBytes(32).toString("hex"),
                accessToken: randomBytes(32).toString("hex"),
                createdAt: q.Now(),
                updatedAt: q.Now(),
              },
            })
          )

          session.data.id = session.ref.id
          session.data.expires = new Date(session.data.expires.value)
          return session.data
        },
        async getSession(sessionToken) {
          const { data, ref } = await faunaClient.query(
            q.Get(q.Match(q.Index(indexes.Session), sessionToken))
          )
          const session = data
          session.id = ref.id
          session.expires = new Date(session.expires.value)
          // Check session has not expired (do not return it if it has)
          if (session?.expires && new Date() > session.expires) {
            await faunaClient.query(
              q.Delete(q.Ref(q.Collection(collections.Session), ref.id))
            )
            return null
          }
          return session
        },
        async updateSession(session, force) {
          const shouldUpdate =
            sessionMaxAge &&
            (sessionUpdateAge || sessionUpdateAge === 0) &&
            session.expires
          if (!shouldUpdate && !force) {
            return null
          }

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
          const currentDate = new Date()
          if (currentDate < dateSessionIsDueToBeUpdated && !force) {
            return null
          }

          const newExpiryDate = new Date()
          newExpiryDate.setTime(newExpiryDate.getTime() + sessionMaxAge)

          const updatedSession = await faunaClient.query(
            q.Update(q.Ref(q.Collection(collections.Session), session.id), {
              data: {
                expires: q.Time(newExpiryDate.toISOString()),
                updatedAt: q.Time(new Date().toISOString()),
              },
            })
          )

          updatedSession.data.id = updatedSession.ref.id

          return updatedSession.data
        },
        async deleteSession(sessionToken) {
          return await faunaClient.query(
            q.Delete(
              q.Select(
                "ref",
                q.Get(q.Match(q.Index(indexes.Session), sessionToken))
              )
            )
          )
        },
        async createVerificationRequest(identifier, url, token, _, provider) {
          const { baseUrl } = appOptions
          const { sendVerificationRequest, maxAge } = provider

          let expires = null
          if (maxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)

            expires = dateExpires.toISOString()
          }

          const verificationRequest = await faunaClient.query(
            q.Create(q.Collection(collections.VerificationRequest), {
              data: {
                identifier: identifier,
                token: hashToken(token),
                expires: expires === null ? null : q.Time(expires),
                createdAt: q.Now(),
                updatedAt: q.Now(),
              },
            })
          )

          // With the verificationCallback on a provider, you can send an email, or queue
          // an email to be sent, or perform some other action (e.g. send a text message)
          await sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl,
            provider,
          })

          return verificationRequest.data
        },
        async getVerificationRequest(identifier, token) {
          const { ref, request: verificationRequest } = await faunaClient.query(
            q.Let(
              {
                ref: q.Match(q.Index(indexes.VerificationRequest), [
                  hashToken(token),
                  identifier,
                ]),
              },
              q.If(
                q.Exists(q.Var("ref")),
                {
                  ref: q.Var("ref"),
                  request: q.Select("data", q.Get(q.Var("ref"))),
                },
                null
              )
            )
          )

          if (
            verificationRequest?.expires &&
            new Date(verificationRequest.expires.value) < new Date()
          ) {
            // Delete the expired request so it cannot be used
            await faunaClient.query(q.Delete(ref))

            return null
          }

          return {
            ...verificationRequest,
            expires: new Date(verificationRequest.expires.value),
            createdAt: new Date(verificationRequest.createdAt.value),
            updatedAt: new Date(verificationRequest.updatedAt.value),
          }
        },
        async deleteVerificationRequest(identifier, token) {
          await faunaClient.query(
            q.Delete(
              q.Select(
                "ref",
                q.Get(
                  q.Match(q.Index(indexes.VerificationRequest), [
                    hashToken(token),
                    identifier,
                  ])
                )
              )
            )
          )
        },
      }
    },
  }
}
