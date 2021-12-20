import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"
import type { Account } from "next-auth"
import type { AdapterOptions, ConnectionType } from "./types"
import {
  createUser,
  deleteUser,
  getUser,
  getUserByMail,
  updateUser,
} from "./lib/dao/user"
import { createSession, deleteSession, updateSession } from "./lib/dao/session"
import { getUserSession } from "./lib/dao/userSession"
import { createAccount, deleteAccount } from "./lib/dao/account"
import { getUserAccount } from "./lib/dao/userAccount"
import {
  createVerificationToken,
  deleteVerificationToken,
  getVerificationToken,
} from "./lib/dao/verificationToken"

/**
 * NextAuth.js adapter for mysql2
 *
 * @param connectionPromise Mysql2 Connection or Pool promise
 * @param opt Additional configuration for this adapter
 * @constructor
 */
const MySql2Adapter = (
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
    async deleteUser(userId: string): Promise<void> {
      return await deleteUser(userId, connectionPromise)
    },
    async updateUser(user: Partial<AdapterUser>): Promise<AdapterUser> {
      return await updateUser(user, connectionPromise, opt?.extendUserModel)
    },
    async getUserByAccount(
      providerAccountId: Pick<Account, "provider" | "providerAccountId">
    ): Promise<AdapterUser | null> {
      return await getUserAccount(
        providerAccountId,
        connectionPromise,
        opt?.extendUserModel
      )
    },
    async getUserByEmail(email: string): Promise<AdapterUser | null> {
      return await getUserByMail(email, connectionPromise, opt?.extendUserModel)
    },
    async linkAccount(account: Account): Promise<void> {
      return await createAccount(account, connectionPromise)
    },
    async unlinkAccount(
      providerAccountId: Pick<Account, "provider" | "providerAccountId">
    ): Promise<void> {
      return await deleteAccount(providerAccountId, connectionPromise)
    },
    async createVerificationToken(
      verificationToken: VerificationToken
    ): Promise<VerificationToken | null | undefined> {
      return await createVerificationToken(verificationToken, connectionPromise)
    },
    async useVerificationToken(params: {
      identifier: string
      token: string
    }): Promise<VerificationToken | null> {
      const { identifier, token } = params
      const verificationToken = await getVerificationToken(
        identifier,
        token,
        connectionPromise
      )
      await deleteVerificationToken(identifier, token, connectionPromise)
      return verificationToken
    },
  }
}

export default MySql2Adapter
