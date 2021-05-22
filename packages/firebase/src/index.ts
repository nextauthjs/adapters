import * as admin from "firebase-admin"
import { createHash, randomBytes } from "crypto"
import { Adapter } from "next-auth/adapters"

export interface FirebaseProfile {
  name: string
  email: string | null
  image: string | null
  emailVerified: Date | null
}

export interface FirebaseUser extends FirebaseProfile {
  id: string
  createdAt: admin.firestore.FieldValue
  updatedAt: admin.firestore.FieldValue
}

export interface FirebaseAccount {
  providerId: string
  providerAccountId: number | string
  userId: string
  providerType: string
  refreshToken?: string
  accessToken: string
  accessTokenExpires: string
  createdAt: admin.firestore.FieldValue
  updatedAt: admin.firestore.FieldValue
}

export interface FirebaseSession {
  id: string
  userId: FirebaseUser["id"]
  expires: Date
  sessionToken: string
  accessToken: string
  createdAt: admin.firestore.FieldValue
  updatedAt: admin.firestore.FieldValue
}

export interface FirebaseVerificationRequest {
  id: string
  identifier: string
  token: string
  expires: Date | null
  createdAt: admin.firestore.FieldValue
  updatedAt: admin.firestore.FieldValue
}

// @ts-expect-error
export const FirebaseAdapter: Adapter<
  admin.firestore.Firestore,
  never,
  FirebaseUser,
  FirebaseProfile,
  FirebaseSession
> = (client) => {
  return {
    async getAdapter({ session, secret, ...appOptions }) {
      const sessionMaxAge = session.maxAge * 1000 // default is 30 days
      const sessionUpdateAge = session.updateAge * 1000 // default is 1 day
      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token: string) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "FIREBASE",
        async createUser(profile) {
          const user = {
            name: profile.name,
            email: profile.email,
            image: profile.image,
            emailVerified: profile.emailVerified ?? null,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }
          const { id } = await client.collection("users").add(user)

          return { ...user, id }
        },

        async getUser(id) {
          const snapshot = await client.collection("users").doc(id).get()
          if (snapshot.exists) {
            return {
              ...snapshot.data(),
              id,
              updatedAt: snapshot.updateTime?.toDate(),
              createdAt: snapshot.createTime?.toDate(),
            }
          }
          return null
        },

        async getUserByEmail(email) {
          if (!email) return null

          const snapshot = await client
            .collection("users")
            .where("email", "==", email)
            .limit(1)
            .get()

          if (snapshot.empty) return null

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          return {
            ...snapshot.docs[0].data(),
            id: snapshot.docs[0].id,
          } as any
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const accountSnapshot = await client
            .collection("accounts")
            .where("providerId", "==", providerId)
            .where("providerAccountId", "==", providerAccountId)
            .limit(1)
            .get()

          if (accountSnapshot.empty) return null

          const userId = accountSnapshot.docs[0].data().userId

          const userSnapshot = await client
            .collection("users")
            .doc(userId)
            .get()

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          return { ...userSnapshot.data(), id: userSnapshot.id } as any
        },

        async updateUser(user) {
          const snapshot = await client
            .collection("users")
            .doc(user.id)
            .update(user)
          return { ...user, updatedAt: snapshot.writeTime.toDate() }
        },

        async deleteUser(userId) {
          await client.collection("users").doc(userId).delete()
        },

        async linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          const accountRef = await client.collection("accounts").add({
            userId,
            providerId,
            providerType,
            providerAccountId,
            refreshToken,
            accessToken,
            accessTokenExpires,
          })

          const accountSnapshot = await accountRef.get()
          return accountSnapshot.data()
        },

        async unlinkAccount(userId, providerId, providerAccountId) {
          const snapshot = await client
            .collection("accounts")
            .where("userId", "==", userId)
            .where("providerId", "==", providerId)
            .where("providerAccountId", "==", providerAccountId)
            .limit(1)
            .get()

          const accountId = snapshot.docs[0].id

          await client.collection("accounts").doc(accountId).delete()
        },

        async createSession(user) {
          const session = {
            userId: user.id,
            expires: new Date(Date.now() + sessionMaxAge),
            sessionToken: randomBytes(32).toString("hex"),
            accessToken: randomBytes(32).toString("hex"),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }

          const { id } = await client.collection("sessions").add(session)
          const now = new Date()
          return { ...session, id, createdAt: now, updatedAt: now }
        },

        async getSession(sessionToken) {
          const snapshot = await client
            .collection("sessions")
            .where("sessionToken", "==", sessionToken)
            .limit(1)
            .get()

          if (snapshot.empty) return null

          const data = snapshot.docs[0].data()
          const session = {
            ...data,
            id: snapshot.docs[0].id,
            expires: data.expires.toDate(),
            updatedAt: data.updatedAt.toDate(),
            createdAt: data.createdAt.toDate(),
          }

          // if the session has expired
          if (session.expires < new Date()) {
            // delete the session
            await client.collection("sessions").doc(session.id).delete()
            return null
          }
          // return already existing session
          return session
        },

        async updateSession(session, force) {
          const shouldUpdate = session.expires

          if (!shouldUpdate && !force) return null

          // Calculate last updated date, to throttle write updates to database
          // Formula: ({expiry date} - sessionMaxAge) + sessionUpdateAge
          //     e.g. ({expiry date} - 30 days) + 1 hour
          //
          // Default for sessionMaxAge is 30 days.
          // Default for sessionUpdateAge is 1 hour.
          const dateSessionIsDueToBeUpdated = new Date(session.expires)
          dateSessionIsDueToBeUpdated.setTime(
            dateSessionIsDueToBeUpdated.getTime() - sessionMaxAge
          )
          dateSessionIsDueToBeUpdated.setTime(
            dateSessionIsDueToBeUpdated.getTime() + sessionUpdateAge
          )

          // Trigger update of session expiry date and write to database, only
          // if the session was last updated more than {sessionUpdateAge} ago
          const currentDate = new Date()
          if (currentDate < dateSessionIsDueToBeUpdated && !force) return null

          const newExpiryDate = new Date()
          newExpiryDate.setTime(newExpiryDate.getTime() + sessionMaxAge)

          const updatedSessionData: any = {
            ...session,
            expires: new Date(Date.now() + sessionMaxAge),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }
          // Update the item in the database
          await client
            .collection("sessions")
            .doc(session.id)
            .update(updatedSessionData)

          return updatedSessionData
        },

        async deleteSession(sessionToken) {
          const snapshot = await client
            .collection("sessions")
            .where("sessionToken", "==", sessionToken)
            .limit(1)
            .get()

          if (snapshot.empty) return

          const sessionId = snapshot.docs[0].id

          await client.collection("sessions").doc(sessionId).delete()
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          const verificationRequest = {
            identifier,
            token: hashToken(token),
            expires: new Date(Date.now() + provider.maxAge * 1000),
          }
          // add to database
          const { id } = await client
            .collection("verificationRequests")
            .add(verificationRequest)

          // With the verificationCallback on a provider, you can send an email, or queue
          // an email to be sent, or perform some other action (e.g. send a text message)
          await provider.sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })

          return { ...verificationRequest, id }
        },

        async getVerificationRequest(identifier, token) {
          const snapshot = await client
            .collection("verificationRequests")
            .where("token", "==", hashToken(token))
            .where("identifier", "==", identifier)
            .limit(1)
            .get()

          const data = snapshot.docs[0].data()
          const verificationRequest: any = {
            ...data,
            id: snapshot.docs[0].id,
            expires: data.expires.toDate(),
            createdAt: snapshot.docs[0].createTime.toDate(),
            updatedAt: snapshot.docs[0].updateTime.toDate(),
          }

          if (verificationRequest.expires.toDate() < new Date()) {
            // Delete verification entry so it cannot be used again
            await client
              .collection("verificationRequests")
              .doc(verificationRequest.id)
              .delete()

            return null
          }
          return verificationRequest
        },

        async deleteVerificationRequest(identifier, token) {
          const snapshot = await client
            .collection("verificationRequests")
            .where("token", "==", hashToken(token))
            .where("identifier", "==", identifier)
            .limit(1)
            .get()

          const verificationRequestId = snapshot.docs[0].id

          await client
            .collection("verificationRequest")
            .doc(verificationRequestId)
            .delete()
        },
      }
    },
  }
}
