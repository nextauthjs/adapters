import admin from "firebase-admin";
import { createHash, randomBytes } from "crypto";
import { AppOptions } from "next-auth";

interface IAdapterConfig {
  firestoreAdmin: admin.firestore.Firestore;
  usersCollection: "users" | string;
  accountsCollection: "accounts" | string;
  sessionsCollection: "sessions" | string;
  verificationRequestsCollection: "verificationRequests" | string;
}

export interface IProfile {
  name: string;
  email: string | null;
  image: string | null;
  emailVerified: boolean | undefined;
}

export interface IUser extends IProfile {
  id: string;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

export interface IAccount {
  providerId: string;
  providerAccountId: number | string;
  userId: string;
  providerType: string;
  refreshToken?: string;
  accessToken: string;
  accessTokenExpires: string;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

export interface ISession {
  id: string;
  userId: IUser["id"];
  expires: Date;
  sessionToken: string;
  accessToken: string;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

interface IVerificationRequest {
  id: string;
  identifier: string;
  token: string;
  expires: Date | null;
  createdAt: admin.firestore.FieldValue;
  updatedAt: admin.firestore.FieldValue;
}

const Adapter = (config: IAdapterConfig, _options = {}) => {
  async function getAdapter(appOptions: AppOptions) {
    // Display debug output if debug option enabled
    function _debug(...args: any[]) {
      if (appOptions.debug) {
        console.log("[next-auth][firebase][debug]", ...args);
      }
    }

    if (appOptions && (!appOptions.session || !appOptions.session.maxAge)) {
      _debug(
        "GET_ADAPTER",
        "Session expiry not configured (defaulting to 30 days"
      );
    }

    const DEFAULT_SESSION_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
    const SESSION_MAX_AGE =
      appOptions && appOptions.session && appOptions.session.maxAge
        ? appOptions.session.maxAge * 1000
        : DEFAULT_SESSION_MAX_AGE;
    const SESSION_UPDATE_AGE =
      appOptions && appOptions.session && appOptions.session.updateAge
        ? appOptions.session.updateAge * 1000
        : 0;

    async function createUser(profile: IProfile): Promise<IUser | null> {
      _debug("createUser", profile);

      const { firestoreAdmin, usersCollection } = config;

      try {
        const newUserRef = await firestoreAdmin
          .collection(usersCollection)
          .add({
            name: profile.name,
            email: profile.email,
            image: profile.image,
            emailVerified: profile.emailVerified
              ? profile.emailVerified
              : false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });

        const newUserSnapshot = await newUserRef.get();

        const newUser = {
          ...newUserSnapshot.data(),
          id: newUserSnapshot.id,
        } as IUser;

        return newUser;
      } catch (error) {
        console.error("CREATE_USER", error);
        return Promise.reject(new Error("CREATE_USER"));
      }
    }

    async function getUser(id: IUser["id"]): Promise<IUser> {
      _debug("getUser", id);

      const { firestoreAdmin, usersCollection } = config;

      try {
        const snapshot = await firestoreAdmin
          .collection(usersCollection)
          .doc(id)
          .get();

        return { ...snapshot.data(), id: snapshot.id } as IUser;
      } catch (error) {
        console.error("GET_USER", error.message);
        return Promise.reject(new Error("GET_USER"));
      }
    }

    async function getUserByEmail(email: string): Promise<IUser | null> {
      _debug("getUserByEmail", email);

      if (!email) return Promise.resolve(null);

      const { firestoreAdmin, usersCollection } = config;

      try {
        const snapshot = await firestoreAdmin
          .collection(usersCollection)
          .where("email", "==", email)
          .limit(1)
          .get();

        if (snapshot.empty) return Promise.resolve(null);

        const user = {
          ...snapshot.docs[0].data(),
          id: snapshot.docs[0].id,
        } as IUser;

        return user;
      } catch (error) {
        console.error("GET_USER_BY_EMAIL", error.message);
        return Promise.reject(new Error("GET_USER_BY_EMAIL"));
      }
    }

    async function getUserByProviderAccountId(
      providerId: IAccount["providerId"],
      providerAccountId: IAccount["providerAccountId"]
    ): Promise<IUser | null> {
      _debug("getUserByProviderAccountId", providerId, providerAccountId);

      const { firestoreAdmin, accountsCollection, usersCollection } = config;

      try {
        const accountSnapshot = await firestoreAdmin
          .collection(accountsCollection)
          .where("providerId", "==", providerId)
          .where("providerAccountId", "==", providerAccountId)
          .limit(1)
          .get();

        if (accountSnapshot.empty) return null;

        const userId = accountSnapshot.docs[0].data().userId;

        const userSnapshot = await firestoreAdmin
          .collection(usersCollection)
          .doc(userId)
          .get();

        const user = { ...userSnapshot.data(), id: userSnapshot.id } as IUser;

        return user;
      } catch (error) {
        console.error("GET_USER_BY_PROVIDER_ACCOUNT_ID", error.message);
        return Promise.reject(new Error("GET_USER_BY_PROVIDER_ACCOUNT_ID"));
      }
    }

    async function updateUser(user: IUser): Promise<IUser> {
      _debug("updateUser", user);

      const { firestoreAdmin, usersCollection } = config;

      const updatedUser: IUser = {
        ...user,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      try {
        await firestoreAdmin
          .collection(usersCollection)
          .doc(user.id)
          .update(updatedUser);

        return updatedUser;
      } catch (error) {
        console.error("UPDATE_USER", error.message);
        return Promise.reject(new Error("UPDATE_USER"));
      }
    }

    async function deleteUser(userId: IUser["id"]): Promise<void> {
      _debug("deleteUser", userId);

      const { firestoreAdmin, usersCollection } = config;

      try {
        await firestoreAdmin.collection(usersCollection).doc(userId).delete();
      } catch (error) {
        console.error("DELETE_USER", error.message);
        return Promise.reject(new Error("DELETE_USER"));
      }
    }

    async function linkAccount(
      userId: IAccount["userId"],
      providerId: IAccount["providerId"],
      providerType: IAccount["providerType"],
      providerAccountId: IAccount["providerAccountId"],
      refreshToken: IAccount["refreshToken"],
      accessToken: IAccount["accessToken"],
      accessTokenExpires: IAccount["accessTokenExpires"]
    ): Promise<IAccount> {
      _debug(
        "linkAccount",
        userId,
        providerId,
        providerType,
        providerAccountId,
        refreshToken,
        accessToken,
        accessTokenExpires
      );

      const { firestoreAdmin, accountsCollection } = config;

      const newAccountData: IAccount = removeUndefinedValues({
        userId,
        providerId,
        providerType,
        providerAccountId,
        refreshToken,
        accessToken,
        accessTokenExpires,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      } as IAccount);

      try {
        // create Account
        const accountRef = await firestoreAdmin
          .collection(accountsCollection)
          .add(newAccountData);

        const accountSnapshot = await accountRef.get();

        return accountSnapshot.data() as IAccount;
      } catch (error) {
        console.error("LINK_ACCOUNT", error.message);
        return Promise.reject(new Error("LINK_ACCOUNT"));
      }
    }

    async function unlinkAccount(
      userId: IAccount["userId"],
      providerId: IAccount["providerId"],
      providerAccountId: IAccount["providerAccountId"]
    ): Promise<void> {
      _debug("unlinkAccount", userId, providerId, providerAccountId);

      const { firestoreAdmin, accountsCollection } = config;

      try {
        const snapshot = await firestoreAdmin
          .collection(accountsCollection)
          .where("userId", "==", userId)
          .where("providerId", "==", providerId)
          .where("providerAccountId", "==", providerAccountId)
          .limit(1)
          .get();

        const accountId = snapshot.docs[0].id;

        await firestoreAdmin
          .collection(accountsCollection)
          .doc(accountId)
          .delete();
      } catch (error) {
        console.error("UNLINK_ACCOUNT", error.message);
        return Promise.reject(new Error("UNLINK_ACCOUNT"));
      }
    }

    async function createSession(user: IUser): Promise<ISession> {
      _debug("createSession", user);

      const { firestoreAdmin, sessionsCollection } = config;

      let expires = null;

      if (SESSION_MAX_AGE) {
        const expireDate = new Date();
        expires = expireDate.setTime(expireDate.getTime() + SESSION_MAX_AGE);
      }

      try {
        const newSessionRef = await firestoreAdmin
          .collection(sessionsCollection)
          .add({
            userId: user.id,
            expires: expires,
            sessionToken: randomBytes(32).toString("hex"),
            accessToken: randomBytes(32).toString("hex"),
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        const newSessionSnapshot = await newSessionRef.get();

        return {
          ...newSessionSnapshot.data(),
          id: newSessionSnapshot.id,
        } as ISession;
      } catch (error) {
        console.error("CREATE_SESSION", error.message);
        return Promise.reject(new Error("CREATE_SESSION"));
      }
    }

    async function getSession(
      sessionToken: ISession["sessionToken"]
    ): Promise<ISession | null> {
      _debug("getSession", sessionToken);

      const { firestoreAdmin, sessionsCollection } = config;

      try {
        const snapshot = await firestoreAdmin
          .collection(sessionsCollection)
          .where("sessionToken", "==", sessionToken)
          .limit(1)
          .get();

        if (snapshot.empty) return null;

        const session = {
          ...snapshot.docs[0].data(),
          id: snapshot.docs[0].id,
        } as ISession;

        // if the session has expired
        if (
          !snapshot.empty &&
          session.expires &&
          new Date() > session.expires
        ) {
          // delete the session
          await firestoreAdmin
            .collection(sessionsCollection)
            .doc(snapshot.docs[0].id)
            .delete();
        }
        // return already existing session
        return session;
      } catch (error) {
        console.error("GET_SESSION", error.message);
        return Promise.reject(new Error("GET_SESSION"));
      }
    }

    async function updateSession(
      session: ISession,
      force: boolean
    ): Promise<ISession | null> {
      _debug("updateSession", session);

      const { firestoreAdmin, sessionsCollection } = config;

      try {
        const shouldUpdate =
          SESSION_MAX_AGE &&
          (SESSION_UPDATE_AGE || SESSION_UPDATE_AGE === 0) &&
          session.expires;

        if (!shouldUpdate && !force) return null;

        // Calculate last updated date, to throttle write updates to database
        // Formula: ({expiry date} - sessionMaxAge) + sessionUpdateAge
        //     e.g. ({expiry date} - 30 days) + 1 hour
        //
        // Default for sessionMaxAge is 30 days.
        // Default for sessionUpdateAge is 1 hour.
        const dateSessionIsDueToBeUpdated = new Date(session.expires);
        dateSessionIsDueToBeUpdated.setTime(
          dateSessionIsDueToBeUpdated.getTime() - SESSION_MAX_AGE
        );
        dateSessionIsDueToBeUpdated.setTime(
          dateSessionIsDueToBeUpdated.getTime() + SESSION_UPDATE_AGE
        );

        // Trigger update of session expiry date and write to database, only
        // if the session was last updated more than {sessionUpdateAge} ago
        const currentDate = new Date();
        if (currentDate < dateSessionIsDueToBeUpdated && !force) return null;

        const newExpiryDate = new Date();
        newExpiryDate.setTime(newExpiryDate.getTime() + SESSION_MAX_AGE);

        const updatedSessionData: ISession = {
          ...session,
          expires: newExpiryDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };
        // Update the item in the database
        await firestoreAdmin
          .collection(sessionsCollection)
          .doc(session.id)
          .update(updatedSessionData);

        return updatedSessionData;
      } catch (error) {
        console.error("UPDATE_SESSION", error.message);
        return Promise.reject(new Error("UPDATE_SESSION"));
      }
    }

    async function deleteSession(
      sessionToken: ISession["sessionToken"]
    ): Promise<void> {
      _debug("deleteSession", sessionToken);

      const { firestoreAdmin, sessionsCollection } = config;

      try {
        const snapshot = await firestoreAdmin
          .collection(sessionsCollection)
          .where("sessionToken", "==", sessionToken)
          .limit(1)
          .get();

        if (snapshot.empty) return;

        const sessionId = snapshot.docs[0].id;

        await firestoreAdmin
          .collection(sessionsCollection)
          .doc(sessionId)
          .delete();
      } catch (error) {
        console.error("DELETE_SESSION", error.message);
        return Promise.reject(new Error("DELETE_SESSION"));
      }
    }

    async function createVerificationRequest(
      identifier: string,
      url: string,
      token: string,
      secret: string,
      provider: {
        maxAge: number;
        sendVerificationRequest: ({}: any) => {};
      }
    ): Promise<IVerificationRequest> {
      _debug("createVerificationRequest", identifier);
      const { firestoreAdmin, verificationRequestsCollection } = config;
      const { baseUrl } = appOptions;
      const { sendVerificationRequest, maxAge } = provider;

      // Store hashed token (using secret as salt) so that tokens cannot be exploited
      // even if the contents of the database is compromised
      // @TODO Use bcrypt function here instead of simple salted hash
      const hashedToken = createHash("sha256")
        .update(`${token}${secret}`)
        .digest("hex");

      let expires = null;

      if (maxAge) {
        const dateExpires = new Date();
        dateExpires.setTime(dateExpires.getTime() + maxAge * 1000);

        expires = dateExpires;
      }

      try {
        // add to database
        const newVerificationRequestRef = await firestoreAdmin
          .collection(verificationRequestsCollection)
          .add({
            identifier,
            token: hashedToken,
            expires,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          } as IVerificationRequest);

        const newVerificationRequestSnapshot = await newVerificationRequestRef.get();

        // With the verificationCallback on a provider, you can send an email, or queue
        // an email to be sent, or perform some other action (e.g. send a text message)
        await sendVerificationRequest({
          identifier,
          url,
          token,
          baseUrl,
          provider,
        });

        return {
          ...newVerificationRequestSnapshot.data(),
          id: newVerificationRequestSnapshot.id,
        } as IVerificationRequest;
      } catch (error) {
        console.error("CREATE_VERIFICATION_REQUEST", error.message);
        return Promise.reject(new Error("CREATE_VERIFICATION_REQUEST"));
      }
    }

    async function getVerificationRequest(
      identifier: string,
      token: string,
      secret: string,
      _provider: any
    ): Promise<IVerificationRequest | null> {
      _debug("getVerificationRequest", identifier, token);
      const { firestoreAdmin, verificationRequestsCollection } = config;

      const hashedToken = createHash("sha256")
        .update(`${token}${secret}`)
        .digest("hex");

      try {
        const snapshot = await firestoreAdmin
          .collection(verificationRequestsCollection)
          .where("token", "==", hashedToken)
          .limit(1)
          .get();

        const verificationRequest = {
          ...snapshot.docs[0].data(),
          id: snapshot.docs[0].id,
        } as IVerificationRequest;

        if (
          verificationRequest &&
          verificationRequest.expires &&
          new Date() > verificationRequest.expires
        ) {
          // Delete verification entry so it cannot be used again
          await firestoreAdmin
            .collection(verificationRequestsCollection)
            .doc(verificationRequest.id)
            .delete();

          return null;
        }
        return verificationRequest;
      } catch (error) {
        console.error("GET_VERIFICATION_REQUEST", error.message);
        return Promise.reject(new Error("GET_VERIFICATION_REQUEST"));
      }
    }

    async function deleteVerificationRequest(
      identifier: string,
      token: string,
      secret: string,
      _provider: any
    ): Promise<void> {
      _debug("deleteVerification", identifier, token);
      const { firestoreAdmin, verificationRequestsCollection } = config;

      try {
        // Delete verification entry so it cannot be used again
        const hashedToken = createHash("sha256")
          .update(`${token}${secret}`)
          .digest("hex");
        const snapshot = await firestoreAdmin
          .collection(verificationRequestsCollection)
          .where("token", "==", hashedToken)
          .limit(1)
          .get();

        const verificationRequestId = snapshot.docs[0].id;

        await firestoreAdmin
          .collection(verificationRequestsCollection)
          .doc(verificationRequestId)
          .delete();
      } catch (error) {
        console.error("DELETE_VERIFICATION_REQUEST_ERROR", error.message);
        return Promise.reject(new Error("DELETE_VERIFICATION_REQUEST_ERROR"));
      }
    }

    return Promise.resolve({
      createUser,
      getUser,
      getUserByEmail,
      getUserByProviderAccountId,
      updateUser,
      deleteUser,
      linkAccount,
      unlinkAccount,
      createSession,
      getSession,
      updateSession,
      deleteSession,
      createVerificationRequest,
      getVerificationRequest,
      deleteVerificationRequest,
    });
  }

  return {
    getAdapter,
  };
};

export default {
  Adapter,
};

// helpers
function removeUndefinedValues(obj: any) {
  Object.keys(obj).map((key) => {
    if (typeof obj[key] === "undefined") {
      delete obj[key];
    }
  });

  return obj;
}
