import { runBasicTests } from "../../../basic-tests"
import { FirebaseAdapter } from "../src"
import firebase from "firebase-admin"
import { docSnapshotToObject, querySnapshotToObject } from "../src/utils"

const fb = firebase.initializeApp({ projectId: "next-auth-test" })
const client = fb.firestore()

runBasicTests({
  adapter: FirebaseAdapter(client),
  db: {
    async disconnect() {
      await client.terminate()
    },
    async session(sessionToken) {
      const snapshot = await client
        .collection("sessions")
        .where("sessionToken", "==", sessionToken)
        .limit(1)
        .get()
      return querySnapshotToObject(snapshot)
    },
    async expireSession(sessionToken, expires) {
      const snapshot = await client
        .collection("sessions")
        .where("sessionToken", "==", sessionToken)
        .limit(1)
        .get()

      if (snapshot.empty) {
        console.error(sessionToken, expires)
        throw new Error("Could not expire session")
      }

      return await client
        .collection("sessions")
        .doc(snapshot.docs[0].id)
        .update({ expires })
    },
    async user(id) {
      const snapshot = await client.collection("users").doc(id).get()
      return docSnapshotToObject(snapshot)
    },
    async account(providerId, providerAccountId) {
      const snapshot = await client
        .collection("accounts")
        .where("providerId", "==", providerId)
        .where("providerAccountId", "==", providerAccountId)
        .limit(1)
        .get()
      return querySnapshotToObject(snapshot)
    },
    async verificationRequest(identifier, token) {
      const snapshot = await client
        .collection("verificationRequests")
        .where("identifier", "==", identifier)
        .where("token", "==", token)
        .limit(1)
        .get()
      return querySnapshotToObject(snapshot)
    },
  },
})
