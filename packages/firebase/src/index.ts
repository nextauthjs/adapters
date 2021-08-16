/* eslint-disable @typescript-eslint/no-non-null-assertion */
import type firebase from "firebase"
import { Account } from "next-auth"

import {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"

export function collections(f: firebase.firestore.Firestore) {
  return {
    Users: f.collection("users"),
    Sessions: f.collection("sessions"),
    Accounts: f.collection("accounts"),
    VerificationTokens: f.collection("verificationTokens"),
  }
}

export const format = {
  to<T = any>(object: any): T {
    const newObject: any = {}

    for (const key in object) {
      const value = object[key]

      // Strip away undefined values, as Firestore doesn't like them
      if (value === undefined) continue
      newObject[key] = object[key]
    }

    return newObject
  },
  from<T = any>(
    snapshot:
      | firebase.firestore.DocumentSnapshot<firebase.firestore.DocumentData>
      | firebase.firestore.QuerySnapshot<firebase.firestore.DocumentData>
  ): T | null {
    let newObject: any = null
    if ("docs" in snapshot) {
      if (snapshot.empty) return null
      const doc = snapshot.docs[0]
      newObject = { ...doc.data(), id: doc.id }
    } else {
      if (!snapshot.exists) return null
      newObject = { ...snapshot.data(), id: snapshot.id }
    }

    if (!newObject) return null

    for (const key in newObject) {
      const value = newObject[key]
      if (value?.toDate) {
        newObject[key] = value.toDate()
      }
    }
    return newObject
  },
}

export function FirebaseAdapter(f: firebase.firestore.Firestore): Adapter {
  const { to, from } = format
  const { Users, Sessions, Accounts, VerificationTokens } = collections(f)

  return {
    async createUser(user) {
      const { id } = await Users.add(to(user))
      return { ...(user as any), id }
    },
    getUser: async (id) => from<AdapterUser>(await Users.doc(id).get()),
    async getUserByEmail(email) {
      return from<AdapterUser>(
        await Users.where("email", "==", email).limit(1).get()
      )
    },

    async getUserByAccount({ provider, providerAccountId }) {
      const account = from<Account>(
        await Accounts.where("provider", "==", provider)
          .where("providerAccountId", "==", providerAccountId)
          .limit(1)
          .get()
      )

      if (!account) return null

      return from<AdapterUser>(await Users.doc(account.userId).get())
    },

    async updateUser(partialUser) {
      await Users.doc(partialUser.id).update(to(partialUser))
      return from<AdapterUser>(await Users.doc(partialUser.id).get())!
    },

    async deleteUser(userId) {
      await f.runTransaction(async (transaction) => {
        transaction.delete(Users.doc(userId))
        const accounts = await Accounts.where("userId", "==", userId).get()
        accounts.forEach((account) => transaction.delete(account.ref))
        const sessions = await Sessions.where("userId", "==", userId).get()
        sessions.forEach((session) => transaction.delete(session.ref))
      })
    },

    async linkAccount(account) {
      const { id } = await Accounts.add(to(account))
      return { ...account, id }
    },

    async unlinkAccount({ provider, providerAccountId }) {
      const snapshot = await Accounts.where("provider", "==", provider)
        .where("providerAccountId", "==", providerAccountId)
        .limit(1)
        .get()

      const accountId = snapshot.docs[0].id

      await Accounts.doc(accountId).delete()
    },

    async createSession(session) {
      const { id } = await Sessions.add(to(session))
      return { ...session, id }
    },

    async getSessionAndUser(sessionToken) {
      const session = from<AdapterSession>(
        await f
          .collection("sessions")
          .where("sessionToken", "==", sessionToken)
          .limit(1)
          .get()
      )
      if (!session) return null
      const user = from<AdapterUser>(await Users.doc(session.userId).get())!

      return { session, user }
    },

    async updateSession(partialSession) {
      const session = from<AdapterSession>(
        await f
          .collection("sessions")
          .where("sessionToken", "==", partialSession.sessionToken)
          .limit(1)
          .get()
      )
      if (!session) return null
      await Sessions.doc(session.id).update(to(partialSession))
      return { ...session, ...partialSession }
    },

    async deleteSession(sessionToken) {
      const session = await f
        .collection("sessions")
        .where("sessionToken", "==", sessionToken)
        .limit(1)
        .get()
      if (session.empty) return null
      await Sessions.doc(session.docs[0].id).delete()
    },

    async createVerificationToken(verificationToken) {
      await VerificationTokens.add(to(verificationToken))
      return verificationToken
    },

    async useVerificationToken({ identifier, token }) {
      let verificationToken: any = await VerificationTokens.where(
        "token",
        "==",
        token
      )
        .where("identifier", "==", identifier)
        .limit(1)
        .get()

      if (verificationToken.empty) return null

      await VerificationTokens.doc(verificationToken.docs[0].id).delete()

      verificationToken = from<VerificationToken>(verificationToken)
      delete verificationToken.id
      return verificationToken
    },
  }
}
