import * as jwt from "jsonwebtoken"
import fetch, { HeadersInit } from "node-fetch"

export interface DgraphClientParams {
  endpoint: string
  /** `X-Auth-Token` header value */
  authToken: string
  jwtSecret?: string
  authHeader?: string
}

export function client(params: DgraphClientParams) {
  if (!params.authToken) {
    throw new Error("Dgraph client error: Please provide an api key")
  }
  if (!params.endpoint) {
    throw new Error("Dgraph client error: Please provide a graphql endpoint")
  }

  const { endpoint, authToken, jwtSecret, authHeader } = params
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Auth-Token": authToken,
  }

  if (authHeader && jwtSecret) {
    headers[authHeader] = jwt.sign({ nextAuth: true }, jwtSecret, {
      algorithm: "HS256",
    })
  }

  return {
    async run(query: string, variables?: Record<string, any>): Promise<any> {
      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({ query, variables }),
      })

      const { data = {}, errors } = await response.json()
      if (errors?.length) return null
      return Object.values(data)[0] as any
    },
  }
}
