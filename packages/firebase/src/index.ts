import type { Adapter, AdapterUser } from "next-auth/adapters"

import { Firestore, FirestoreDataConverter } from "firebase-admin/firestore"
import type { Auth } from "firebase-admin/auth"

export const formatFirestore: FirestoreDataConverter<any> = {
  toFirestore(object) {
    const newObjectobject: any = {}
    for (const key in object) {
      const value = object[key]
      if (value === undefined) continue
      newObjectobject[key] = value
    }
    return newObjectobject
  },
  fromFirestore(snapshot) {
    if (!snapshot.exists) return null
    const newUser: any = { ...snapshot.data(), id: snapshot.id }
    for (const key in newUser) {
      const value = newUser[key]
      if (value?.toDate) newUser[key] = value.toDate()
      else newUser[key] = value
    }
    return newUser
  },
}

export const formatUserRecord = {
  toUserRecord(user: Partial<AdapterUser>): any {
    const userRecord: any = {}
    for (const key in user) {
      const value = user[key]
      if (value === undefined) continue
      if (key === "name") {
        userRecord.displayName = value
        continue
      }
      if (key === "image") {
        userRecord.photoURL = value
        continue
      }
      if (key === "emailVerified") {
        userRecord.emailVerified = !!value
        continue
      }
      userRecord[key] = value
    }
    return userRecord
  },
}

export const collections = {
  Users: "users",
  Sessions: "sessions",
  Accounts: "accounts",
  VerificationTokens: "verificationTokens",
} as const

export interface FirebaseClient {
  db: Firestore
  auth: Auth
}

export function FirebaseAdapter(client: FirebaseClient): Adapter {
  const { db, auth } = client

  const Users = db.collection(collections.Users).withConverter(formatFirestore)
  const Sessions = db
    .collection(collections.Sessions)
    .withConverter(formatFirestore)
  const Accounts = db
    .collection(collections.Accounts)
    .withConverter(formatFirestore)
  const VerificationTokens = db
    .collection(collections.VerificationTokens)
    .withConverter(formatFirestore)

  return {
    async createUser(user) {
      const newUser = await auth.createUser(formatUserRecord.toUserRecord(user))
      await Users.doc(newUser.uid).set(user)
      return { ...(user as any), id: newUser.uid }
    },
    async getUser(id) {
      const user = await Users.doc(id).get()
      if (!user.exists) return null
      return user.data()
    },
    async getUserByEmail(email) {
      const user = await Users.where("email", "==", email).limit(1).get()
      if (user.empty) return null
      return user.docs[0].data()
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const account = await Accounts.where("provider", "==", provider)
        .where("providerAccountId", "==", providerAccountId)
        .limit(1)
        .get()
      if (account.empty) return null
      const user = await Users.doc(account.docs[0].data().userId).get()
      if (!user.exists) return null
      return user.data()
    },
    async updateUser(user) {
      await auth.updateUser(
        user.id as string,
        formatUserRecord.toUserRecord(user)
      )
      const userRef = Users.doc(user.id as string)
      await userRef.update(user)
      const userRes = await userRef.get()
      return userRes.data()
    },
    async deleteUser(userId) {
      await auth.deleteUser(userId)
      const accountsQuery = Accounts.where("userId", "==", userId)
      const sessionsQuery = Sessions.where("userId", "==", userId)

      await db.runTransaction(async (transaction) => {
        transaction.delete(Users.doc(userId))
        const accounts = await accountsQuery.get()
        accounts.forEach((account) => transaction.delete(account.ref))

        const sessions = await sessionsQuery.get()
        sessions.forEach((session) => transaction.delete(session.ref))
      })
    },
    async linkAccount(account) {
      const { id } = await Accounts.add(account)
      return { ...account, id }
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const accounts = await Accounts.where("provider", "==", provider)
        .where("providerAccountId", "==", providerAccountId)
        .limit(1)
        .get()
      if (accounts.empty) return
      await accounts.docs[0].ref.delete()
    },
    async createSession(session) {
      const { id } = await Sessions.add(session)
      return { ...session, id }
    },
    async getSessionAndUser(sessionToken) {
      const sessionDocs = await Sessions.where(
        "sessionToken",
        "==",
        sessionToken
      )
        .limit(1)
        .get()
      if (sessionDocs.empty) return null
      const session = sessionDocs.docs[0].data()

      const user = await Users.doc(session.userId).get()
      if (!user.exists) return null
      return {
        session,
        user: user.data(),
      }
    },
    async updateSession(partialSession) {
      const sessionDocs = await Sessions.where(
        "sessionToken",
        "==",
        partialSession.sessionToken
      )
        .limit(1)
        .get()
      if (sessionDocs.empty) return null
      await sessionDocs.docs[0].ref.update(partialSession)
    },
    async deleteSession(sessionToken) {
      const sessionDocs = await Sessions.where(
        "sessionToken",
        "==",
        sessionToken
      )
        .limit(1)
        .get()
      if (sessionDocs.empty) return null
      await sessionDocs.docs[0].ref.delete()
    },
    async createVerificationToken(verificationToken) {
      await VerificationTokens.add(verificationToken)
      return verificationToken
    },
    async useVerificationToken({ identifier, token }) {
      const verificationTokenDocs = await VerificationTokens.where(
        "identifier",
        "==",
        identifier
      )
        .where("token", "==", token)
        .limit(1)
        .get()

      if (verificationTokenDocs.empty) return null

      await verificationTokenDocs.docs[0].ref.delete()
      const verificationToken = verificationTokenDocs.docs[0].data()
      delete verificationToken.id
      return verificationToken
    },
  }
}
