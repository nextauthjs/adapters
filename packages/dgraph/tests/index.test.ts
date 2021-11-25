import { resolve, join } from "path"
import { readFile } from "fs/promises"
import { DgraphAdapter, DgraphClientParams, format } from "../src"
import { client as dgraphClient, DgraphJwtAlgorithm } from "../src/client"
import { runBasicTests } from "../../../basic-tests"
import {
  Account,
  Session,
  User,
  VerificationToken,
} from "../src/graphql/fragments"

const readSchema = async (
  jwtAlgorithm?: DgraphJwtAlgorithm
): Promise<string> => {
  const path = resolve(
    process.cwd(),
    join(
      "./src/graphql",
      jwtAlgorithm
        ? `test${jwtAlgorithm}.schema.graphql`
        : "unsecure.schema.graphql"
    )
  )
  return await readFile(path, { encoding: "utf-8" })
}

const loadSchema = async (
  jwtAlgorithm?: DgraphJwtAlgorithm
): Promise<boolean> => {
  const res = await fetch("localhost:8080/admin/schema", {
    method: "POST",
    body: await readSchema(jwtAlgorithm),
  })
  return res.ok
}

async function testDgraph(clientParams: {
  jwtAlgorithm?: DgraphJwtAlgorithm
  jwtSecret?: string
}) {
  await loadSchema(clientParams.jwtAlgorithm)

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
              querySession(filter: { sessionToken: { eq: $sessionToken } }) {
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
            query ($providerAccountId: String = "", $provider: String = "") {
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

const testCases: Array<{
  jwtSecret?: string
  jwtAlgorithm?: DgraphJwtAlgorithm
}> = [
  {},
  { jwtAlgorithm: "HS256", jwtSecret: process.env.DGRAPH_JWT_SECRET_HS256 },
  {
    jwtAlgorithm: "RS256",
    jwtSecret: process.env.DGRAPH_JWT_SECRET_RS256?.replace(/\\n/g, "\n"),
  },
]

testCases.map(testDgraph)
