import { runBasicTests } from "../../../basic-tests"
import { FirebaseAdapter } from "../src"
import firebase from "firebase-admin"

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
      if (snapshot.empty) {
        return null
      }
      const doc = snapshot.docs[0]
      const data = doc.data()
      return {
        ...data,
        id: doc.id,
        expires: data.expires.toDate(),
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
      }
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
      const { data } = await client.collection("users").doc(id).get()
      return { ...data(), id }
    },
    account(id) {},
    async verificationRequest(identifier, token) {
      const snapshot = await client
        .collection("verificationRequests")
        .where("identifier", "==", identifier)
        .where("token", "==", token)
        .limit(1)
        .get()
      if (snapshot.empty) {
        return null
      }
      const verificationRequest = snapshot.docs[0]
      return {
        id: verificationRequest.id,
        ...verificationRequest.data(),
        expires: verificationRequest.data().expires.toDate(),
      }
    },
  },
})
