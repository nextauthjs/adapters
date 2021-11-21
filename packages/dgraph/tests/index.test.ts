import { DgraphAdapter } from "../src"
import { DgraphClient } from "../src/dgraphClient"
import { runBasicTests } from "../../../basic-tests"

const dgraph = new DgraphClient({
  endpoint: "https://wild-grass.us-east-1.aws.cloud.dgraph.io/graphql",
  apiKey: "OGE3MDZmMjA5ODNmNDk0ZGU0ZDYyMjI3NWIxM2JmYTA=",
})

runBasicTests({
  adapter: DgraphAdapter(dgraph),
  db: {
    disconnect: async () => await dgraph.clean(),
    verificationToken: async (identifier_token) =>
      await dgraph.getVerificationRequest(identifier_token),
    user: async (id) => await DgraphAdapter(dgraph).getUser(id),
    account: async (provider_providerAccountId) =>
      await dgraph.getAccount(provider_providerAccountId),
    session: async (sessionToken) => {
      const sessionAndUser = await DgraphAdapter(dgraph).getSessionAndUser(
        sessionToken
      )
      if (sessionAndUser === null) return null
      const { session } = sessionAndUser
      if (!session?.id) return null
      Object.assign(session, { expires: new Date(session.expires) })
      return session
    },
  },
})
