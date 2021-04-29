import fs from "fs"
import path from "path"
import { ulid } from "ulid"
import PouchDB from "pouchdb"
import leveldbAdapter from "pouchdb-adapter-leveldb"
import find from "pouchdb-find"
import LRU from "lru-cache"
// import { createHash, randomBytes } from "crypto"
import type { Profile } from "next-auth"
import { AppOptions } from "next-auth/internals"
import {
  CreateUserError,
  GetUserByIdError,
  // CreateSessionError,
  // CreateVerificationRequestError,
  // DeleteSessionError,
  // DeleteUserError,
  // DeleteVerificationRequestError,
  // GetSessionError,
  // GetUserByEmailError,
  // GetUserByProviderAccountIdError,
  // GetVerificationRequestError,
  // LinkAccountError,
  // UnlinkAccountError,
  // UpdateSessionError,
  // UpdateUserError,
} from "next-auth/errors"
// import { EmailConfig } from "next-auth/providers"

interface PouchDBOptions {
  name: string
  options: object
  setup?: () => PouchDB.Static
}
interface ModelMapping {
  User: string
  Account: string
  Session: string
  VerificationRequest: string
}
interface Cache {
  maxAge: number
  max: number
}
interface Config {
  pouchdb: PouchDBOptions
  modelMapping: ModelMapping
  cache: Cache
}
const defaultConfig = {
  pouchdb: {
    name: "nextauth",
    options: { adapter: "leveldb" },
    setup: () => {
      // leveldb location folder
      const prefix = path.join(process.cwd(), ".pouchdb/")
      !fs.existsSync(prefix) && fs.mkdirSync(prefix, { recursive: true })
      let CustomPouchDB: any = PouchDB
      CustomPouchDB = CustomPouchDB.defaults({ prefix })
      // leveldb adapter
      CustomPouchDB.plugin(leveldbAdapter)
      return CustomPouchDB
    },
  },
  modelMapping: {
    User: "user",
    Account: "account",
    Session: "session",
    VerificationRequest: "verificationRequest",
  },
  cache: {
    maxAge: 24 * 60 * 60 * 1000,
    max: 1000,
  },
}

export default async function PouchDBAdapter(config: Config = defaultConfig) {
  const {
    User,
    // Account, Session, VerificationRequest
  } = config.modelMapping

  // setup LRU caching
  // const sessionCache = new LRU(config.cache)
  const userCache = new LRU(config.cache)
  // const maxAge = (expires?: string | number | Date | null) => {
  //   return expires ? new Date(expires).getTime() - Date.now() : undefined
  // }

  // setup PouchDB
  let CustomPouchDB: PouchDB.Static
  if (config.pouchdb.setup) {
    CustomPouchDB = config.pouchdb.setup()
  } else {
    CustomPouchDB = PouchDB
  }
  CustomPouchDB.plugin(find)

  const pouchdb = new CustomPouchDB(config.pouchdb.name, config.pouchdb.options)
  await pouchdb.createIndex({
    index: {
      fields: ["email"],
      ddoc: "byEmail",
    },
  })

  // return adapter
  return {
    async getAdapter(appOptions: AppOptions) {
      const logger = appOptions.logger ?? console

      function debug(debugCode: string, ...args: any) {
        logger.debug(`POUCHDB_${debugCode}`, ...args)
      }

      if (!appOptions.session?.maxAge) {
        debug(
          "GET_ADAPTER",
          "Session expiry not configured (defaulting to 30 days)"
        )
      }

      // const defaultSessionMaxAge = 30 * 24 * 60 * 60
      // const sessionMaxAge =
      //   (appOptions.session?.maxAge ?? defaultSessionMaxAge) * 1000
      // const sessionUpdateAge = (appOptions.session?.updateAge ?? 0) * 1000

      return {
        async createUser(profile: Profile & { emailVerified?: Date }) {
          debug("CREATE_USER", profile)
          try {
            const data = {
              id: [User, ulid()].join("_"),
              name: profile.name,
              email: profile.email,
              image: profile.image,
              emailVerified: profile.emailVerified
                ? profile.emailVerified.toISOString()
                : null,
            }
            const user = await pouchdb.put({
              _id: data.id,
              data,
            })
            userCache.set(user.id, data)
            return data
          } catch (error) {
            logger.error("CREATE_USER_ERROR", error)
            throw new CreateUserError(error)
          }
        },
        async getUser(id: string) {
          debug("GET_USER", id)
          try {
            const cachedUser = userCache.get(id)
            if (cachedUser) {
              debug("GET_USER - Fetched from LRU Cache", cachedUser)
              // stale while revalidate
              // eslint-disable-next-line @typescript-eslint/no-floating-promises
              ;(async () => {
                const user = await pouchdb.get(id)
                if (user) userCache.set(user._id, user)
                return user
              })()
              return cachedUser
            }
            const user = await pouchdb.get(id)
            if (user) userCache.set(user._id, user)
            return user
          } catch (error) {
            logger.error("GET_USER_BY_ID_ERROR", error)
            throw new GetUserByIdError(error)
          }
        },
      }
    },
  }
}

export { defaultConfig }
