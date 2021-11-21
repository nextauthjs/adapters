import { DgraphAdapter } from "../src"
import { DgraphClient } from "../src/dgraphClient"
import { runBasicTests } from "../../../basic-tests"
import { getAccount, getVerificationRequest } from "../src/graphql/queries"
import { clean } from "../src/graphql/mutations"
const dgraph = new DgraphClient({
  endpoint: "https://wild-grass.us-east-1.aws.cloud.dgraph.io/graphql",
  apiKey: "OGE3MDZmMjA5ODNmNDk0ZGU0ZDYyMjI3NWIxM2JmYTA=",
})

runBasicTests({
  adapter: DgraphAdapter(dgraph),
  db: {
    disconnect: async () => await dgraph.dgraph(clean),
    verificationToken: async (identifier_token) => {
      const [verificationRequest] = await dgraph.dgraph(
        getVerificationRequest,
        identifier_token
      )
      if (!verificationRequest) return null
      return {
        ...verificationRequest,
        expires: new Date(verificationRequest.expires),
      }
    },
    user: (id) => DgraphAdapter(dgraph).getUser(id),
    account: async (provider_providerAccountId) => {
      const [result] = await dgraph.dgraph(
        getAccount,
        provider_providerAccountId
      )
      if (!result) return null
      const { user, ...account } = result
      return {
        ...account,
        expires_at: new Date(account.expires_at).getTime() / 1000,
        userId: user?.id,
      }
    },
    session: async (sessionToken) => {
      const sessionAndUser = await DgraphAdapter(dgraph).getSessionAndUser(
        sessionToken
      )
      if (sessionAndUser === null) return null
      const { session } = sessionAndUser
      if (!session?.id) return null

      return Object.assign(session, { expires: new Date(session.expires) })
    },
  },
})
