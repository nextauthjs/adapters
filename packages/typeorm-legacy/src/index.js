import { createHash } from "crypto"
import requireOptional from "require_optional"

import * as adapterConfig from "./lib/config"
import { createConnection, getConnection } from "typeorm"
import { updateConnectionEntities } from "./lib/utils"
import adapterTransform from "./lib/transform"
import defaultModels from "./models"

export const Models = defaultModels

/** @type {import("..").TypeORMAdapter} */
export function TypeORMLegacyAdapter(configOrString, options = {}) {
  // Ensure configOrString is normalized to an object
  const typeOrmConfig = adapterConfig.parseConnectionString(configOrString)

  // Load any custom models passed as an option, default to built-in models
  const { models: customModels = {} } = options
  /** @type {import("..").TypeORMAdapterModels} */
  const models = {
    ...defaultModels,
    ...customModels,
  }

  // The models are designed for ANSI SQL databases first (as a baseline).
  // For databases that use a different pragma, we transform the models at run
  // time *unless* the models are user supplied (in which case we don't do
  // anything to do them). This function updates arguments by reference.
  adapterTransform(typeOrmConfig, models, options)

  const config = adapterConfig.loadConfig(typeOrmConfig, {
    ...options,
    models,
  })

  // Create objects from models that can be consumed by functions in the adapter
  const {
    User: { model: User },
    Account: { model: Account },
    Session: { model: Session },
    VerificationRequest: { model: VerificationRequest },
  } = models

  /** @type {import("typeorm").Connection} */
  let connection = null

  return {
    async getAdapter({
      session: { maxAge, updateAge },
      secret,
      logger,
      ...appOptions
    }) {
      // Helper function to reuse / restablish connections
      // (useful if they drop when after being idle)
      async function _connect() {
        // Get current connection by name
        connection = getConnection(config.name)

        // If connection is no longer established, reconnect
        if (!connection.isConnected) {
          connection = await connection.connect()
        }
      }

      if (!connection) {
        // If no connection, create new connection
        try {
          connection = await createConnection(config)
        } catch (error) {
          if (error.name === "AlreadyHasActiveConnectionError") {
            // If creating connection fails because it's already
            // been re-established, check it's really up
            await _connect()
          } else {
            logger.error("ADAPTER_CONNECTION_ERROR", error)
            throw error
          }
        }
      } else {
        // If the connection object already exists, ensure it's valid
        await _connect()
      }

      if (process.env.NODE_ENV !== "production") {
        await updateConnectionEntities(connection, config.entities)
      }

      // Get manager from connection object
      // https://github.com/typeorm/typeorm/blob/master/docs/entity-manager-api.md
      const { manager } = connection

      // The models are primarily designed for ANSI SQL database, but some
      // flexiblity is required in the adapter to support non-SQL databases such
      // as MongoDB which have different pragmas.
      //
      // TypeORM does some abstraction, but doesn't handle everything (e.g. it
      // handles translating `id` and `_id` in models, but not queries) so we
      // need to handle somethings in the adapter to make it compatible.
      let idKey = "id"
      let ObjectId
      if (config.type === "mongodb") {
        idKey = "_id"
        // Using a dynamic import causes problems for some compilers/bundlers
        // that don't handle dynamic imports. To try and work around this we are
        // using the same method mongodb uses to load Object ID type, which is to
        // use the require_optional loader.
        const mongodb = requireOptional("mongodb")
        ObjectId = mongodb.ObjectId
      }

      const sessionMaxAge = maxAge * 1000
      const sessionUpdateAge = updateAge * 1000

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "TYPEORM_LEGACY",
        createUser(profile) {
          return manager.save(new User(profile))
        },
        getUser(id) {
          // In the very specific case of both using JWT for storing session data
          // and using MongoDB to store user data, the ID is a string rather than
          // an ObjectId and we need to turn it into an ObjectId.
          //
          // In all other scenarios it is already an ObjectId, because it will have
          // come from another MongoDB query.
          if (ObjectId && !(id instanceof ObjectId)) {
            id = ObjectId(id)
          }
          return manager.findOne(User, { [idKey]: id })
        },

        getUserByEmail(email) {
          if (email) {
            return manager.findOne(User, { email })
          }
          return null
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const account = await manager.findOne(Account, {
            providerId,
            providerAccountId,
          })
          if (account) {
            return await manager.findOne(User, { [idKey]: account.userId })
          }
          return null
        },

        updateUser(user) {
          return manager.save(User, user)
        },

        async deleteUser() {
          // @TODO Delete user from DB
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
          return manager.save(
            new Account(
              userId,
              providerId,
              providerType,
              providerAccountId,
              refreshToken,
              accessToken,
              accessTokenExpires
            )
          )
        },

        async unlinkAccount() {
          // @TODO Get current user from DB
          // @TODO Delete [provider] object from user object
          // @TODO Save changes to user object in DB
        },

        createSession(user) {
          let expires = null
          if (sessionMaxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
            expires = dateExpires
          }

          return manager.save(new Session(user.id, expires))
        },

        async getSession(sessionToken) {
          const session = await manager.findOne(Session, { sessionToken })
          // Check if session has expired (return null if it has, and delete it from DB)
          if (session?.expires && new Date() > new Date(session.expires)) {
            await manager.delete(Session, { sessionToken })
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

          return manager.save(Session, session)
        },

        deleteSession(sessionToken) {
          return manager.delete(Session, { sessionToken })
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          const { sendVerificationRequest, maxAge } = provider

          const hashedToken = hashToken(token)

          let expires = null
          if (maxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)
            expires = dateExpires
          }

          await manager.save(
            new VerificationRequest(identifier, hashedToken, expires)
          )

          // With the verificationCallback on a provider, you can send an email, or queue
          // an email to be sent, or perform some other action (e.g. send a text message)
          await sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })
        },

        async getVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)
          const verificationRequest = await manager.findOne(
            VerificationRequest,
            {
              identifier,
              token: hashedToken,
            }
          )

          if (
            verificationRequest?.expires &&
            new Date() > new Date(verificationRequest.expires)
          ) {
            // Delete verification entry so it cannot be used again
            await manager.delete(VerificationRequest, { token: hashedToken })
            return null
          }

          return verificationRequest
        },

        async deleteVerificationRequest(identifier, token) {
          // Delete verification entry so it cannot be used again
          const hashedToken = hashToken(token)
          await manager.delete(VerificationRequest, {
            identifier,
            token: hashedToken,
          })
        },
      }
    },
  }
}
