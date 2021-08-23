import neo4j from "neo4j-driver"
import type { Adapter } from "next-auth/adapters"

import {
  createUser,
  getUser,
  getUserByEmail,
  getUserByAccount,
  updateUser,
  deleteUser,
} from "./user"

import { linkAccount, unlinkAccount } from "./account"

import {
  createSession,
  getSessionAndUser,
  updateSession,
  deleteSession,
} from "./session"

import {
  createVerificationToken,
  useVerificationToken,
} from "./verificationToken"

export function Neo4jAdapter(neo4jSession: typeof neo4j.Session): Adapter {
  return {
    async createUser(data) {
      return await createUser(neo4jSession, data)
    },

    async getUser(id) {
      return await getUser(neo4jSession, id)
    },

    async getUserByEmail(email) {
      return await getUserByEmail(neo4jSession, email)
    },

    async getUserByAccount(provider_providerAccountId) {
      return await getUserByAccount(neo4jSession, provider_providerAccountId)
    },

    async updateUser(data) {
      return await updateUser(neo4jSession, data)
    },

    async deleteUser(id) {
      return await deleteUser(neo4jSession, id)
    },

    async linkAccount(data) {
      return await linkAccount(neo4jSession, data)
    },

    async unlinkAccount(provider_providerAccountId) {
      return await unlinkAccount(neo4jSession, provider_providerAccountId)
    },

    async createSession(data) {
      return await createSession(neo4jSession, data)
    },

    async getSessionAndUser(sessionToken) {
      return await getSessionAndUser(neo4jSession, sessionToken)
    },

    async updateSession(data) {
      return await updateSession(neo4jSession, data)
    },

    async deleteSession(sessionToken) {
      return await deleteSession(neo4jSession, sessionToken)
    },

    async createVerificationToken(data) {
      return await createVerificationToken(neo4jSession, data)
    },

    async useVerificationToken(data) {
      return await useVerificationToken(neo4jSession, data)
    },
  }
}
