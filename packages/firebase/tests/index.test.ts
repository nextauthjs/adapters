/* eslint-disable @typescript-eslint/no-non-null-assertion */
import { runBasicTests } from "../../../basic-tests"
import { collections, FirebaseAdapter, format } from "../src"

import { initializeApp } from "firebase/app"

import {
  getFirestore,
  terminate,
  connectFirestoreEmulator,
  collection,
  query,
  getDocs,
  where,
  limit,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
} from "firebase/firestore"

const db = getFirestore(initializeApp({ projectId: "next-auth-test" }))
connectFirestoreEmulator(db, "localhost", 8080)

const adapter = FirebaseAdapter({
  db,
  collection,
  query,
  getDocs,
  where,
  limit,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  runTransaction,
})

const Users = collection(db, collections.Users).withConverter<any>(format)

const Sessions = collection(db, collections.Sessions).withConverter<any>(format)

const Accounts = collection(db, collections.Accounts).withConverter<any>(format)
const VerificationTokens = collection(
  db,
  collections.VerificationTokens
).withConverter<any>(format)

runBasicTests({
  adapter,
  db: {
    async disconnect() {
      await terminate(db)
    },
    async session(sessionToken) {
      const sessionQuery = query(
        Sessions,
        where("sessionToken", "==", sessionToken)
      )
      const sessionDocs = await getDocs(sessionQuery)
      if (sessionDocs.empty) return null
      return Sessions.converter!.fromFirestore(sessionDocs.docs[0])
    },
    async user(id) {
      const userDoc = await getDoc(doc(Users, id))
      return Users.converter!.fromFirestore(userDoc)
    },
    async account({ provider, providerAccountId }) {
      const accountQuery = query(
        Accounts,
        where("provider", "==", provider),
        where("providerAccountId", "==", providerAccountId),
        limit(1)
      )
      const accountDocs = await getDocs(accountQuery)
      if (accountDocs.empty) return null
      const account = await getDoc(doc(Accounts, accountDocs.docs[0].id))
      return Accounts.converter!.fromFirestore(account)
    },
    async verificationToken({ identifier, token }) {
      const verificationTokenQuery = query(
        VerificationTokens,
        where("identifier", "==", identifier),
        where("token", "==", token)
      )
      const verificationTokenDocs = await getDocs(verificationTokenQuery)
      if (verificationTokenDocs.empty) return null
      const verificationToken = VerificationTokens.converter!.fromFirestore(
        verificationTokenDocs.docs[0]
      )
      delete verificationToken.id
      return verificationToken
    },
  },
})
