import * as jwt from "jsonwebtoken";
import * as mutations from "../graphql/mutations";
import * as queries from "../graphql/queries";
import fetch, { HeadersInit } from "node-fetch";
import {
  CreateUserInput,
  userEmail,
  userId,
  providerId,
  providerAccountId,
  UpdateUserInput,
  LinkAccountInput,
  CreateSessionInput,
  sessionId,
  UpdateSessionInput,
  CreateVerificationRequestInput,
  DGraphConstructor
} from "./types";

class DgraphClient {
  endpoint: string;
  headers: HeadersInit;
  constructor({ endpoint, apiKey, adminSecret, jwtSecret, authHeader }: DGraphConstructor) {
    if (!apiKey) {
      throw new Error("Dgraph client error: Please provide an api key");
    }
    if (!endpoint) {
      throw new Error("Dgraph client error: Please provide a graphql endpoint");
    }
    let headers = { "Content-Type": "application/json", "X-Auth-Token": apiKey };

    if (!!authHeader && !!adminSecret && !!jwtSecret) {
      Object.assign(headers, {
        [authHeader]: jwt.sign({ adminSecret: adminSecret }, jwtSecret, { algorithm: "HS256" })
      });
    }

    this.endpoint = endpoint;
    this.headers = headers;
  }

  dgraph = async (query: string, variables?: any): Promise<any> => {
    const response = await fetch(this.endpoint, {
      body: JSON.stringify({
        query,
        variables
      }),
      method: "POST",
      headers: this.headers
    });
    const { data = {}, errors } = await response.json();
    if (errors && errors.length) {
      throw new Error(JSON.stringify(errors, null, 3));
    }
    const [result] = Object.values(data);
    return result;
  };
  createUser = async (input: CreateUserInput) => {
    const {
      user: [newUser]
    } = await this.dgraph(mutations.createUser, { input });
    return newUser;
  };
  getUserById = async (id: userId) => {
    return await this.dgraph(queries.getUserById, { id });
  };
  getUserByEmail = async (email: userEmail) => {
    const [user] = await this.dgraph(queries.getUserByEmail, { email });
    return user;
  };
  getUserByAccount = async (providerId: providerId, providerAccountId: providerAccountId) => {
    const [account] = await this.dgraph(queries.getUserByAccount, { providerId, providerAccountId });
    return account?.user || null;
  };
  getAccount = async (providerId: providerId, providerAccountId: providerAccountId) => {
    let [account] = await this.dgraph(queries.getAccount, { providerId, providerAccountId });
    account.userId = account.user.id;
    return account;
  };
  updateUser = async (id: userId, input: UpdateUserInput) => {
    const {
      user: [updatedUser]
    } = await this.dgraph(mutations.updateUser, { id, input });
    return updatedUser;
  };
  deleteUser = async (id: userId) => {
    return await this.dgraph(mutations.deleteUser, { id });
  };
  linkAccount = async (id: userId, account: LinkAccountInput) => {
    return await this.dgraph(mutations.linkAccount, {
      input: {
        ...account,
        user: {
          id
        }
      }
    });
  };
  unlinkAccount = async (providerId: providerId, providerAccountId: providerAccountId) => {
    return await this.dgraph(mutations.unlinkAccount, { providerId, providerAccountId });
  };
  createSession = async (input: CreateSessionInput) => {
    let {
      session: [newSession]
    } = await this.dgraph(mutations.addSession, { input });
    newSession.userId = newSession.user.id;
    newSession.expires = new Date(newSession.expires);
    return newSession;
  };
  getSession = async (sessionToken: string) => {
    let [session] = await this.dgraph(queries.getSession, { sessionToken });
    if (!session) return null;
    session.expires = new Date(session.expires);
    session.userId = session.user.id;
    return session;
  };
  updateSession = async (id: sessionId | unknown, input: UpdateSessionInput) => {
    let {
      session: [updatedSession]
    } = await this.dgraph(mutations.updateSession, {
      id,
      input
    });
    if (!updatedSession) return null;
    updatedSession.userId = updatedSession.user.id;
    return updatedSession;
  };
  deleteSession = async (sessionToken: string) => {
    return await this.dgraph(mutations.deleteSession, { sessionToken });
  };
  createVerificationRequest = async (input: CreateVerificationRequestInput) => {
    return await this.dgraph(mutations.createVerificationRequest, { input });
  };
  getVerificationRequest = async (identifier: string, token: string) => {
    let [verificationRequest] = await this.dgraph(queries.getVerificationRequest, {
      identifier,
      token
    });
    if (!verificationRequest) return null;

    verificationRequest.expires = new Date(verificationRequest.expires);
    return verificationRequest;
  };
  deleteVerificationRequest = async (identifier: string, token: string) => {
    return await this.dgraph(mutations.deleteVerificationRequest, { identifier, token });
  };
  clean = async () => {
    return await this.dgraph(mutations.clean);
  };
}

export default DgraphClient;
