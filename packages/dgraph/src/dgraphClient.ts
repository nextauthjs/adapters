import * as jwt from "jsonwebtoken"
import fetch, { HeadersInit } from "node-fetch"
import { makeUserFragment } from "./graphql/fragments"

interface DGraphConstructor {
  endpoint: string
  apiKey: string
  jwtSecret?: string
  authHeader?: string
  userFields?: string[]
}
export class DgraphClient {
  endpoint: string
  headers: HeadersInit
  userFragment: string
  constructor({
    endpoint,
    apiKey,
    jwtSecret,
    authHeader,
    userFields,
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

    if (!!authHeader && !!jwtSecret) {
      Object.assign(headers, {
        [authHeader]: jwt.sign({ nextAuth: true }, jwtSecret, {
          algorithm: "HS256",
        }),
      })
    }

    this.userFragment = makeUserFragment(
      userFields ? userFields.join("\n") : ""
    )

    this.endpoint = endpoint
    this.headers = headers
  }

  dgraph = async (query: string, variables?: any): Promise<any> => {
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
      return null
    }
    return Object.values(data)[0]
  }
}
