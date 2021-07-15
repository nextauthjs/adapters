import { createHash, randomBytes } from "crypto";
import type { Profile, User, Session } from "next-auth";
import type { Adapter } from "next-auth/adapters";
import DgraphClient from "./dgraphClient";
export { DgraphClient };

export const DgraphAdapter: Adapter<DgraphClient, never, User, Profile & { emailVerified?: Date }, Session> = (
  dgraph: DgraphClient
) => {
  const sessionMaxAge = 30 * 24 * 60 * 60 * 1000; // default is 30 days
  const sessionUpdateAge = 24 * 60 * 60 * 1000; // default is 1 day
  return {
    displayName: "DGRAPH",
    async createUser(profile) {
      return dgraph.createUser({
        name: profile.name,
        email: profile.email,
        image: profile.image,
        emailVerified: profile.emailVerified?.toISOString() ?? null,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    },
    async getUser(id) {
      return dgraph.getUserById(id);
    },

    async getUserByEmail(email) {
      if (!email) return Promise.resolve(null);
      return dgraph.getUserByEmail(email);
    },

    async getUserByProviderAccountId(providerId, providerAccountId) {
      return await dgraph.getUserByAccount(providerId, providerAccountId);
    },

    async updateUser(user) {
      return dgraph.updateUser(user.id as string, {
        name: user.name,
        email: user.email,
        image: user.image,
        //@ts-ignore
        emailVerified: user?.emailVerified?.toISOString() ?? undefined,
        updatedAt: new Date()
      });
    },

    async deleteUser(userId) {
      return await dgraph.deleteUser(userId);
    },

    async linkAccount(userId, account) {
      return await dgraph.linkAccount(userId, account);
    },

    async unlinkAccount(_, providerId, providerAccountId) {
      return await dgraph.unlinkAccount(providerId, providerAccountId);
    },

    async createSession(user) {
      return await dgraph.createSession({
        user: {
          id: user.id
        },
        expires: new Date(Date.now() + sessionMaxAge),
        sessionToken: randomBytes(32).toString("hex"),
        accessToken: randomBytes(32).toString("hex"),
        createdAt: new Date(),
        updatedAt: new Date()
      });
    },

    async getSession(sessionToken) {
      const session = await dgraph.getSession(sessionToken);

      if (!!session && new Date(session.expires) < new Date()) {
        await dgraph.deleteSession(sessionToken);
        return null;
      }
      return session;
    },

    async updateSession(session, force) {
      //@ts-ignore
      if (!force && new Date(session.expires).getTime() - sessionMaxAge + sessionUpdateAge > Date.now()) {
        return null;
      }

      return await dgraph.updateSession(session.id, {
        expires: new Date(Date.now() + sessionMaxAge),
        updatedAt: new Date()
      });
    },

    deleteSession(sessionToken) {
      return dgraph.deleteSession(sessionToken);
    },

    async createVerificationToken({identifier, expires, token}) {
      return await dgraph.createVerificationRequest({
        createdAt: new Date(),
        updatedAt: new Date(),
        identifier,
        token,
        expires
      });
    },

    async useVerificationToken({ identifier, token, expires }) {
      const request = await dgraph.createVerificationRequest({
        createdAt: new Date(),
        updatedAt: new Date(),
        identifier,
        token,
        expires
      });
      return request;
    },
    async useVerificationToken(identifier, token) {
      const verificationRequest = await dgraph.getVerificationRequest(identifier, token);
      if (verificationRequest && verificationRequest.expires.getTime() < Date.now()) {
        await dgraph.deleteVerificationRequest(identifier, token);
        return null;
      }
      return verificationRequest;
    }
  };
};
