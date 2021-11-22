import { DgraphAdapter, DgraphClientParams, format } from "../src"
import { client as dgraphClient } from "../src/client"
import { runBasicTests } from "../../../basic-tests"
import { User } from "../src/graphql/fragments"

// TODO: We should not rely on services over the network.
const params: DgraphClientParams = {
  endpoint: "https://wild-grass.us-east-1.aws.cloud.dgraph.io/graphql",
  // REVIEW: This should not have been exposed????
  authToken: "OGE3MDZmMjA5ODNmNDk0ZGU0ZDYyMjI3NWIxM2JmYTA=",
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
          deleteVerificationRequest(filter: {}) {
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
    async account(provider_providerAccountId) {},
    async session(sessionToken) {},
    async verificationToken(identifier_token) {},
  },
})
