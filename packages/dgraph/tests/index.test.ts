import { DgraphAdapter, DgraphClientParams } from "../src"
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
      return await c.run(
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
    },
    async account(provider_providerAccountId) {},
    async session(sessionToken) {},
    async verificationToken(identifier_token) {},
  },
})
