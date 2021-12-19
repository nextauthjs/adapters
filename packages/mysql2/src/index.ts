import type { Adapter, AdapterSession, AdapterUser } from "next-auth/adapters"
import type { Account, Awaitable } from "next-auth"
import type { AdapterOptions, ConnectionType } from "./types"
import { createUser, getUser, getUserByMail } from "./lib/dao/user"
import { createSession, deleteSession, updateSession } from "./lib/dao/session"
import { getUserSession } from "./lib/dao/userSession"
import { createAccount } from "./lib/dao/account"
import { getUserAccount } from "./lib/dao/userAccount"

const MySqlAdapter = (
  connectionPromise: ConnectionType,
  opt: AdapterOptions = {}
): Adapter => {
  // prevent some wrong configs
  if (opt.extendUserModel) {
    const extendedTableFields = Object.values(opt.extendUserModel).map((v) =>
      typeof v === "string" ? v : v.dbField
    )

    if (
      extendedTableFields.includes("expires") ||
      extendedTableFields.includes("sessionToken") ||
      extendedTableFields.includes("userId")
    ) {
      throw new Error(
        "User model extensions can not include names that conflict with fields in the Session table"
      )
    }
  }

  return {
    async createSession(session: {
      sessionToken: string
      userId: string
      expires: Date
    }): Promise<AdapterSession> {
      return await createSession(session, connectionPromise)
    },
    async updateSession(
      session: Partial<AdapterSession> & Pick<AdapterSession, "sessionToken">
    ): Promise<AdapterSession | null> {
      return await updateSession(session, connectionPromise)
    },
    async deleteSession(sessionToken: string): Promise<void> {
      await deleteSession(sessionToken, connectionPromise)
    },
    async getSessionAndUser(
      sessionToken: string
    ): Promise<{ session: AdapterSession; user: AdapterUser } | null> {
      return await getUserSession(
        sessionToken,
        connectionPromise,
        opt?.extendUserModel
      )
    },
    async createUser(user: Omit<AdapterUser, "id">): Promise<AdapterUser> {
      return await createUser(user, connectionPromise, opt?.extendUserModel)
    },
    async getUser(id: string): Promise<AdapterUser | null> {
      return await getUser(id, connectionPromise, opt?.extendUserModel)
    },
    updateUser(user: Partial<AdapterUser>): Awaitable<AdapterUser> {
      // TODO: implement
      const mock: AdapterUser = {
        email: undefined,
        emailVerified: null,
        id: "",
        image: undefined,
        name: undefined,
      }
      return mock
    },
    async getUserByAccount(
      providerAccountId: Pick<Account, "provider" | "providerAccountId">
    ): Promise<AdapterUser | null> {
      return await getUserAccount(providerAccountId, connectionPromise)
    },
    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      return await getUserByMail(email, connectionPromise, opt?.extendUserModel)
    },
    async linkAccount(account: Account): Promise<void> {
      return await createAccount(account, connectionPromise)
    },
  }
}

export default MySqlAdapter
