// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { Adapter } from "../src"
import { runBasicTests } from "../../../basic-tests"
import * as Fauna from "faunadb"

const client = new Fauna.Client({
  secret: "secret",
  scheme: "http",
  domain: "localhost",
  port: 8443,
})

const adapter = Adapter({ faunaClient: client })

const q = Fauna.query

/**
 * FaunaDB throws an error when something is not found in the db,
 * but the basic tests expect it to be `null`.
 */
async function returnNullIfError(fql: any) {
  try {
    return await client.query(fql)
  } catch (error) {
    if (error.name === "NotFound") return null
    throw error
  }
}
runBasicTests({
  adapter,
  db: {
    async user(id) {
      return await returnNullIfError(q.Get(q.Ref(q.Collection("users"), id)))
    },
    async session(sessionToken) {
      return await returnNullIfError(
        q.Get(q.Match(q.Index("session_by_token"), sessionToken))
      )
    },
    async account(id) {
      return await returnNullIfError(q.Get(q.Ref(q.Collection("accounts"), id)))
    },
    async verificationRequest(id) {
      return await returnNullIfError(
        q.Get(q.Ref(q.Collection("verification_requests"), id))
      )
    },
  },
})
