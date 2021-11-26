import { DgraphAdapter, DgraphClientParams, format } from "../src"
import { client as dgraphClient, DgraphJwtAlgorithm } from "../src/client"
import { runBasicTests } from "../../../basic-tests"
import {
  Account,
  Session,
  User,
  VerificationToken,
} from "../src/graphql/fragments"

const DGRAPH_JWT_SECRET_HS256 = "test"
const DGRAPH_JWT_SECRET_RS256 = `-----BEGIN RSA PRIVATE KEY-----
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
-----END RSA PRIVATE KEY-----`

function testDgraph(clientParams: {
  endpoint?: string
  jwtAlgorithm?: DgraphJwtAlgorithm
  jwtSecret?: string
}) {
  describe(
    clientParams.jwtAlgorithm
      ? `secure ${clientParams.jwtAlgorithm}`
      : "unsecure",
    () => {
      const params: DgraphClientParams = {
        endpoint: "http://localhost:8080/graphql",
        authToken: "test",
        ...clientParams,
      }

      /** TODO: Add test to `dgraphClient` */
      const c = dgraphClient(params)

      runBasicTests({
        adapter: DgraphAdapter(params),
        db: {
          id: () => "0x0a0a00a00",
          async disconnect() {
            await c.run(/* GraphQL */ `
              mutation {
                deleteUser(filter: {}) {
                  numUids
                }
                deleteVerificationToken(filter: {}) {
                  numUids
                }
                deleteSession(filter: {}) {
                  numUids
                }
                deleteAccount(filter: {}) {
                  numUids
                }
              }
            `)
          },
          async user(id) {
            const result = await c.run<any>(
              /* GraphQL */ `
                query ($id: ID!) {
                  getUser(id: $id) {
                    ...UserFragment
                  }
                }
                ${User}
              `,
              { id }
            )

            return format.from(result)
          },
          async session(sessionToken) {
            const result = await c.run<any>(
              /* GraphQL */ `
                query ($sessionToken: String!) {
                  querySession(
                    filter: { sessionToken: { eq: $sessionToken } }
                  ) {
                    ...SessionFragment
                    user {
                      id
                    }
                  }
                }
                ${Session}
              `,
              { sessionToken }
            )

            const { user, ...session } = result?.[0] ?? {}
            if (!user?.id) return null
            return format.from({ ...session, userId: user.id })
          },
          async account(provider_providerAccountId) {
            const result = await c.run<any>(
              /* GraphQL */ `
                query (
                  $providerAccountId: String = ""
                  $provider: String = ""
                ) {
                  queryAccount(
                    filter: {
                      providerAccountId: { eq: $providerAccountId }
                      provider: { eq: $provider }
                    }
                  ) {
                    ...AccountFragment
                    user {
                      id
                    }
                  }
                }
                ${Account}
              `,
              provider_providerAccountId
            )

            const account = format.from<any>(result?.[0])
            if (!account?.user) return null

            account.userId = account.user.id
            delete account.user
            return account
          },
          async verificationToken(identifier_token) {
            const result = await c.run<any>(
              /* GraphQL */ `
                query ($identifier: String = "", $token: String = "") {
                  queryVerificationToken(
                    filter: {
                      identifier: { eq: $identifier }
                      token: { eq: $token }
                    }
                  ) {
                    ...VerificationTokenFragment
                  }
                }
                ${VerificationToken}
              `,
              identifier_token
            )

            return format.from(result?.[0])
          },
        },
      })
    }
  )
}

describe("DgraphAdapter", () => {
  const testCases: Array<{
    endpoint?: string
    jwtSecret?: string
    jwtAlgorithm?: DgraphJwtAlgorithm
  }> = [
    {
      endpoint: "http://localhost:8080/graphql",
    },
    {
      endpoint: "http://localhost:8081/graphql",
      jwtAlgorithm: "HS256",
      jwtSecret: DGRAPH_JWT_SECRET_HS256,
    },
    {
      endpoint: "http://localhost:8082/graphql",
      jwtAlgorithm: "RS256",
      jwtSecret: DGRAPH_JWT_SECRET_RS256,
    },
  ]

  testCases.map(testDgraph)
})
