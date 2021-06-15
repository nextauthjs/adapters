import neo4j from "neo4j-driver"
import { createHash } from "crypto"
import type { Profile } from "next-auth"
import type { Adapter } from "next-auth/adapters"

import {
  Neo4jUser,
  createUser,
  getUser,
  getUserByEmail,
  getUserByProviderAccountId,
  updateUser,
  deleteUser,
} from "./user"

import { linkAccount, unlinkAccount } from "./account"

import {
  Neo4jSession,
  createSession,
  getSession,
  updateSession,
  deleteSession,
} from "./session"

import {
  createVerificationRequest,
  getVerificationRequest,
  deleteVerificationRequest,
} from "./verificationRequest"

export const Neo4jAdapter: Adapter<
  typeof neo4j.Session,
  never,
  Neo4jUser,
  Profile & { emailVerified?: Date },
  Neo4jSession
> = (neo4jSession) => {
  return {
    async getAdapter({ session, secret, ...appOptions }) {
      const sessionMaxAge = session.maxAge * 1000 // default is 30 days
      const sessionUpdateAge = session.updateAge * 1000 // default is 1 day

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token: string) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "NEO4J",

        async createUser(profile) {
          return await createUser(neo4jSession, profile)
        },

        async getUser(id) {
          return await getUser(neo4jSession, id)
        },

        async getUserByEmail(email) {
          return await getUserByEmail(neo4jSession, email)
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          return await getUserByProviderAccountId(
            neo4jSession,
            providerId,
            providerAccountId
          )
        },

        async updateUser(user) {
          return await updateUser(neo4jSession, user)
        },

        async deleteUser(id) {
          return await deleteUser(neo4jSession, id)
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
          return await linkAccount(
            neo4jSession,
            userId,
            providerId,
            providerType,
            providerAccountId,
            refreshToken,
            accessToken,
            accessTokenExpires
          )
        },

        async unlinkAccount(_, providerId, providerAccountId) {
          return await unlinkAccount(
            neo4jSession,
            _,
            providerId,
            providerAccountId
          )
        },

        async createSession(user: Neo4jUser) {
          return await createSession(neo4jSession, user, sessionMaxAge)
        },

        async getSession(sessionToken) {
          return await getSession(neo4jSession, sessionToken)
        },

        async updateSession(session, force) {
          return await updateSession(
            neo4jSession,
            session,
            force,
            sessionMaxAge,
            sessionUpdateAge
          )
        },

        async deleteSession(sessionToken) {
          return await deleteSession(neo4jSession, sessionToken)
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          return await createVerificationRequest(
            neo4jSession,
            identifier,
            url,
            token,
            _,
            provider,
            hashToken,
            appOptions.baseUrl
          )
        },

        async getVerificationRequest(identifier, token) {
          return await getVerificationRequest(
            neo4jSession,
            identifier,
            token,
            hashToken
          )
        },

        async deleteVerificationRequest(identifier, token) {
          return await deleteVerificationRequest(
            neo4jSession,
            identifier,
            token,
            hashToken
          )
        },
      }
    },
  }
}
