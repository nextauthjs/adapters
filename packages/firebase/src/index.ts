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
> = (firestoreAdmin) => {
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
        async createUser(profile) {
          const newUserRef = await firestoreAdmin.collection("users").add({
            name: profile.name,
            email: profile.email,
            image: profile.image,
            emailVerified: profile.emailVerified,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })

          const newUserSnapshot = await newUserRef.get()

          const newUser: any = {
            ...newUserSnapshot.data(),
            id: newUserSnapshot.id,
          }

          return newUser
        },

        async getUser(id) {
          const snapshot = await firestoreAdmin
            .collection("users")
            .doc(id)
            .get()

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          return { ...snapshot.data(), id: snapshot.id } as any
        },

        async getUserByEmail(email) {
          if (!email) return null

          const snapshot = await firestoreAdmin
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
          const accountSnapshot = await firestoreAdmin
            .collection("accounts")
            .where("providerId", "==", providerId)
            .where("providerAccountId", "==", providerAccountId)
            .limit(1)
            .get()

          if (accountSnapshot.empty) return null

          const userId = accountSnapshot.docs[0].data().userId

          const userSnapshot = await firestoreAdmin
            .collection("users")
            .doc(userId)
            .get()

          // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
          return { ...userSnapshot.data(), id: userSnapshot.id } as any
        },

        async updateUser(user) {
          return await firestoreAdmin
            .collection("users")
            .doc(user.id)
            .update({
              ...user,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            })
        },

        async deleteUser(userId) {
          await firestoreAdmin.collection("users").doc(userId).delete()
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
          const accountRef = await firestoreAdmin.collection("accounts").add({
            userId,
            providerId,
            providerType,
            providerAccountId,
            refreshToken,
            accessToken,
            accessTokenExpires,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          })

          const accountSnapshot = await accountRef.get()
          return accountSnapshot.data()
        },

        async unlinkAccount(userId, providerId, providerAccountId) {
          const snapshot = await firestoreAdmin
            .collection("accounts")
            .where("userId", "==", userId)
            .where("providerId", "==", providerId)
            .where("providerAccountId", "==", providerAccountId)
            .limit(1)
            .get()

          const accountId = snapshot.docs[0].id

          await firestoreAdmin.collection("accounts").doc(accountId).delete()
        },

        async createSession(user) {
          let expires = null

          if (sessionMaxAge) {
            const expireDate = new Date()
            expires = expireDate.setTime(expireDate.getTime() + sessionMaxAge)
          }

          const newSessionRef = await firestoreAdmin
            .collection("sessions")
            .add({
              userId: user.id,
              expires: expires,
              sessionToken: randomBytes(32).toString("hex"),
              accessToken: randomBytes(32).toString("hex"),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            })
          const newSessionSnapshot = await newSessionRef.get()

          return {
            ...newSessionSnapshot.data(),
            id: newSessionSnapshot.id,
          }
        },

        async getSession(sessionToken) {
          const snapshot = await firestoreAdmin
            .collection("sessions")
            .where("sessionToken", "==", sessionToken)
            .limit(1)
            .get()

          if (snapshot.empty) return null

          const session: any = {
            ...snapshot.docs[0].data(),
            id: snapshot.docs[0].id,
          }

          // if the session has expired
          if (
            !snapshot.empty &&
            session.expires &&
            new Date() > session.expires
          ) {
            // delete the session
            await firestoreAdmin
              .collection("sessions")
              .doc(snapshot.docs[0].id)
              .delete()
          }
          // return already existing session
          return session
        },

        async updateSession(session, force) {
          const shouldUpdate =
            sessionMaxAge && sessionUpdateAge && session.expires

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
          await firestoreAdmin
            .collection("sessions")
            .doc(session.id)
            .update(updatedSessionData)

          return updatedSessionData
        },

        async deleteSession(sessionToken) {
          const snapshot = await firestoreAdmin
            .collection("sessions")
            .where("sessionToken", "==", sessionToken)
            .limit(1)
            .get()

          if (snapshot.empty) return

          const sessionId = snapshot.docs[0].id

          await firestoreAdmin.collection("sessions").doc(sessionId).delete()
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          const { sendVerificationRequest, maxAge } = provider

          let expires = null

          if (maxAge) {
            const dateExpires = new Date()
            dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)

            expires = dateExpires
          }

          // add to database
          const newVerification = {
            identifier,
            token: hashToken(token),
            expires,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }
          const newVerificationRequestRef = await firestoreAdmin
            .collection("verificationRequests")
            .add(newVerification)

          const newVerificationRequestSnapshot = await newVerificationRequestRef.get()

          // With the verificationCallback on a provider, you can send an email, or queue
          // an email to be sent, or perform some other action (e.g. send a text message)
          await sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })

          // TODO: How to get typescript to recognize the types from newVerification(L506)
          //       here when spread in? Same pattern in all other types too..
          return {
            ...newVerificationRequestSnapshot.data(),
            id: newVerificationRequestSnapshot.id,
          }
        },

        async getVerificationRequest(identifier, token) {
          const snapshot = await firestoreAdmin
            .collection("verificationRequests")
            .where("token", "==", hashToken(token))
            .where("identifier", "==", identifier)
            .limit(1)
            .get()

          const verificationRequest: any = {
            ...snapshot.docs[0].data(),
            id: snapshot.docs[0].id,
          }

          if (
            verificationRequest?.expires &&
            new Date() > verificationRequest?.expires
          ) {
            // Delete verification entry so it cannot be used again
            await firestoreAdmin
              .collection("verificationRequests")
              .doc(verificationRequest.id)
              .delete()

            return null
          }
          return verificationRequest
        },

        async deleteVerificationRequest(identifier, token) {
          const snapshot = await firestoreAdmin
            .collection("verificationRequests")
            .where("token", "==", hashToken(token))
            .where("identifier", "==", identifier)
            .limit(1)
            .get()

          const verificationRequestId = snapshot.docs[0].id

          await firestoreAdmin
            .collection("verificationRequest")
            .doc(verificationRequestId)
            .delete()
        },
      }
    },
  }
}
