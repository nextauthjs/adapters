import * as jwt from "jsonwebtoken"
import * as mutations from "./graphql/mutations"
import * as queries from "./graphql/queries"
import fetch, { HeadersInit } from "node-fetch"
import {
  CreateUserInput,
  userEmail,
  userId,
  UpdateUserInput,
  LinkAccountInput,
  CreateSessionInput,
  sessionId,
  UpdateSessionInput,
  CreateVerificationRequestInput,
  DGraphConstructor,
  GetUserByAccountInput,
  GetAccountInput,
  DeleteVerificationInput,
} from "./types"

export class DgraphClient {
  endpoint: string
  headers: HeadersInit
  constructor({
    endpoint,
    apiKey,
    adminSecret,
    jwtSecret,
    authHeader,
  }: DGraphConstructor) {
    if (!apiKey) {
      throw new Error("Dgraph client error: Please provide an api key")
    }
    if (!endpoint) {
      throw new Error("Dgraph client error: Please provide a graphql endpoint")
    }
    const headers = {
      "Content-Type": "application/json",
      "X-Auth-Token": apiKey,
    }

    if (!!authHeader && !!adminSecret && !!jwtSecret) {
      Object.assign(headers, {
        [authHeader]: jwt.sign({ adminSecret: adminSecret }, jwtSecret, {
          algorithm: "HS256",
        }),
      })
    }

    this.endpoint = endpoint
    this.headers = headers
  }

  dgraph = async (query: string, variables?: any): Promise<any> => {
    try {
      const response = await fetch(this.endpoint, {
        body: JSON.stringify({
          query,
          variables,
        }),
        method: "POST",
        headers: this.headers,
      })
      const { data = {}, errors } = await response.json()
      if (errors?.length) {
        throw new Error(JSON.stringify(errors, null, 3))
      }
      const [result] = Object.values(data)
      return result
    } catch (error) {
      throw new Error(JSON.stringify(error, null, 3))
    }
  }

  createUser = async (input: CreateUserInput) => {
    const {
      user: [newUser],
    } = await this.dgraph(mutations.createUser, { input })

    return { ...newUser, emailVerified: new Date(newUser.emailVerified) }
  }

  getUserById = async (id: userId) => {
    try {
      const user = await this.dgraph(queries.getUserById, { id })
      return { ...user, emailVerified: new Date(user.emailVerified) }
    } catch (error) {
      return null
    }
  }

  getUserByEmail = async (email: userEmail) => {
    const [user] = await this.dgraph(queries.getUserByEmail, { email })
    if (!user) return null
    return { ...user, emailVerified: new Date(user.emailVerified) }
  }

  getUserByAccount = async ({
    provider,
    providerAccountId,
  }: GetUserByAccountInput) => {
    const [account] = await this.dgraph(queries.getUserByAccount, {
      provider,
      providerAccountId,
    })
    if (account?.user) {
      return {
        ...account.user,
        emailVerified: new Date(account.user.emailVerified),
      }
    }
    return null
  }

  getAccount = async ({ provider, providerAccountId }: GetAccountInput) => {
    const [result] = await this.dgraph(queries.getAccount, {
      provider,
      providerAccountId,
    })
    if (!result) return null
    const { user, ...account } = result
    return {
      ...account,
      expires_at: new Date(account.expires_at).getTime() / 1000,
      userId: user?.id,
    }
  }

  updateUser = async (id: userId | undefined, input: UpdateUserInput) => {
    if (!id) return input

    const {
      user: [updatedUser],
    } = await this.dgraph(mutations.updateUser, { id, input })
    return updatedUser
  }

  deleteUser = async (id: userId) => {
    const {
      user: [deletedUser],
    } = await this.dgraph(mutations.deleteUser, { id })
    try {
      await this.dgraph(mutations.deleteUserAccountsAndSessions, {
        sessions: deletedUser.sessions.map((x: any) => x.id),
        accounts: deletedUser.accounts.map((x: any) => x.id),
      })

      return deletedUser
    } catch (error) {
      return null
    }
  }

  linkAccount = async (id: userId, account: LinkAccountInput) => {
    return await this.dgraph(mutations.linkAccount, {
      input: {
        ...account,
        user: {
          id,
        },
      },
    })
  }

  unlinkAccount = async ({ provider, providerAccountId }: GetAccountInput) => {
    const account = await this.dgraph(mutations.unlinkAccount, {
      provider,
      providerAccountId,
    })
    return account
  }

  createSession = async (input: CreateSessionInput) => {
    const {
      session: [newSession],
    } = await this.dgraph(mutations.addSession, { input })
    return {
      ...newSession,
      userId: newSession.user.id,
      expires: new Date(newSession.expires),
    }
  }

  getSession = async (sessionToken: string) => {
    const [session] = await this.dgraph(queries.getSession, { sessionToken })
    if (!session) return null

    return {
      ...session,
      userId: session?.user?.id || null,
      expires: new Date(session.expires),
    }
  }

  updateSession = async (
    sessionToken: sessionId | unknown,
    input: UpdateSessionInput
  ) => {
    const {
      session: [updatedSession],
    } = await this.dgraph(mutations.updateSession, {
      sessionToken,
      input,
    })
    console.log({ updatedSession, input })
    if (!updatedSession) return null

    return { ...updatedSession, userId: updatedSession.user.id }
  }

  deleteSession = async (sessionToken: string) => {
    return await this.dgraph(mutations.deleteSession, { sessionToken })
  }

  createVerificationRequest = async (input: CreateVerificationRequestInput) => {
    return await this.dgraph(mutations.createVerificationRequest, { input })
  }

  getVerificationRequest = async ({ identifier, token }: any) => {
    let [verificationRequest] = await this.dgraph(
      queries.getVerificationRequest,
      {
        identifier,
        token,
      }
    )
    if (!verificationRequest) return null

    verificationRequest = {
      ...verificationRequest,
      expires: new Date(verificationRequest.expires),
    }

    return verificationRequest
  }

  deleteVerificationRequest = async ({
    identifier,
    token,
  }: DeleteVerificationInput) => {
    const {
      verificationRequest: [request],
    } = await this.dgraph(mutations.deleteVerificationRequest, {
      identifier,
      token,
    })

    if (!request) return null
    return { ...request, expires: new Date(request.expires) }
  }

  // for testing purpose

  clean = async () => {
    return await this.dgraph(mutations.clean)
  }
}
