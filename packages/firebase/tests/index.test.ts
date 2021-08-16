import { runBasicTests } from "../../../basic-tests"
import { collections, FirebaseAdapter, format } from "../src"

import firebase from "firebase/app"
import "firebase/firestore"

const app =
  firebase.apps[0] ?? firebase.initializeApp({ projectId: "next-auth-test" })

const f = app.firestore()

f.useEmulator("localhost", 8080)

const { Users, Accounts, Sessions, VerificationTokens } = collections(f)

runBasicTests({
  adapter: FirebaseAdapter(f),
  db: {
    disconnect: async () => await f.terminate(),
    async session(sessionToken) {
      const session = await Sessions.where("sessionToken", "==", sessionToken)
        .limit(1)
        .get()

      return format.from(session)
    },
    async user(id) {
      const user = await Users.doc(id).get()
      return format.from(user)
    },
    async account({ provider, providerAccountId }) {
      const account = await Accounts.where("provider", "==", provider)
        .where("providerAccountId", "==", providerAccountId)
        .limit(1)
        .get()

      return format.from(account)
    },
    async verificationToken({ identifier, token }) {
      let verificationToken: any = await VerificationTokens.where(
        "identifier",
        "==",
        identifier
      )
        .where("token", "==", token)
        .limit(1)
        .get()

      verificationToken = format.from(verificationToken)
      delete verificationToken.id
      return verificationToken
    },
  },
})
