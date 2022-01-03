/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { initializeApp } from "firebase-admin"
import { getFirestore } from "firebase-admin/firestore"
import { getAuth } from "firebase-admin/auth"
import { runBasicTests } from "../../../basic-tests"
import { collections, FirebaseAdapter, formatFirestore } from "../src"

initializeApp({ projectId: "next-auth-test" })
const db = getFirestore()
const auth = getAuth()

const adapter = FirebaseAdapter({
  db,
  auth,
})

const Users = db.collection(collections.Users).withConverter(formatFirestore)
const Sessions = db.collection(collections.Sessions).withConverter(formatFirestore)
const Accounts = db.collection(collections.Accounts).withConverter(formatFirestore)
const VerificationTokens = db
  .collection(collections.VerificationTokens)
  .withConverter(formatFirestore)

runBasicTests({
  adapter,
  db: {
    async disconnect() {
      await db.terminate()
    },
    async session(sessionToken) {
      const sessionDocs = await Sessions.where(
        "sessionToken",
        "==",
        sessionToken
      ).get()
      if (sessionDocs.empty) return null
      return sessionDocs.docs[0].data()
    },
    async user(id) {
      const userDoc = await Users.doc(id).get()
      if (!userDoc.exists) return null
      return userDoc.data()
    },
    async account({ provider, providerAccountId }) {
      const accountDocs = await Accounts.where("provider", "==", provider)
        .where("providerAccountId", "==", providerAccountId)
        .limit(1)
        .get()
      if (accountDocs.empty) return null
      return accountDocs.docs[0].data()
    },
    async verificationToken({ identifier, token }) {
      const verificationTokenDocs = await VerificationTokens.where(
        "identifier",
        "==",
        identifier
      )
        .where("token", "==", token)
        .get()
      if (verificationTokenDocs.empty) return null
      const verificationToken = verificationTokenDocs.docs[0].data()
      delete verificationToken.id
      return verificationToken
    },
  },
})
