// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { Adapter } from "../src"
import runBasicTests from "../../../basic-tests"
import * as Fauna from "faunadb"

const client = new Fauna.Client({
  secret: "secret",
  scheme: "http",
  domain: "localhost",
  port: 8443,
})

const adapter = Adapter({ faunaClient: client })

const q = Fauna.query

runBasicTests({
  adapter,
  db: {
    async user(id) {
      return await client.query(q.Get(q.Ref(q.Collection("users"), id)))
    },
    async session(sessionToken) {
      return await client.query(
        q.Get(q.Match(q.Index("session_by_token"), sessionToken))
      )
    },
    async account(id) {
      return await client.query(q.Get(q.Ref(q.Collection("accounts"), id)))
    },
    async verificationRequest(id) {
      return await client.query(
        q.Get(q.Ref(q.Collection("verification_requests"), id))
      )
    },
  },
})
