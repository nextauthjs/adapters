import * as jwt from "jsonwebtoken"
import * as mutations from "./graphql/mutations"
import * as queries from "./graphql/queries"
import fetch, { HeadersInit } from "node-fetch"
import { DGraphConstructor, GetAccountInput } from "./types"
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

  getVerificationRequest = async ({ identifier, token }: any) => {
    const [verificationRequest] = await this.dgraph(
      queries.getVerificationRequest,
      {
        identifier,
        token,
      }
    )
    if (!verificationRequest) return null
    return {
      ...verificationRequest,
      expires: new Date(verificationRequest.expires),
    }
  }

  // for testing purpose
  clean = async () => {
    return await this.dgraph(mutations.clean)
  }
}
