import * as admin from "firebase-admin";
import { exposeMockFirebaseAdminApp } from 'ts-mock-firebase';
import Adapter, {
    IUser,
    ISession,
    IVerificationRequest
} from "../src";

const app = admin.initializeApp({});
const mocked = exposeMockFirebaseAdminApp(app);
const firebaseAdapter = Adapter({
    firestoreAdmin: admin.firestore(),
    usersCollection: "users",
    accountsCollection: "accounts",
    sessionsCollection: "sessions",
    verificationRequestsCollection: "verificationRequests"
});

let session: ISession | null = null;
let user: IUser | null = null;
let verificationRequest: IVerificationRequest | null = null;
const SECRET = "secret";
const TOKEN = "secret";
describe("adapter functions", () => {
    // User
    test("createUser", async () => {
       const nextDocId = "mocked_user_id";
       mocked.firestore().mocker.setNextDocumentIds([nextDocId]);
       let adapter = await firebaseAdapter.getAdapter();

        user = await adapter.createUser({
            email: "test@next-auth.com",
            name: "test",
            image: "https://",
        } as any);
        if (!user) {
            throw new Error('user is bad');
        }
        expect(user.id).toMatchInlineSnapshot(`"${nextDocId}"`);
        expect(user.email).toMatchInlineSnapshot(`"test@next-auth.com"`);
        expect(user.name).toMatchInlineSnapshot(`"test"`);
        expect(user.image).toMatchInlineSnapshot(`"https://"`);
    });
    test("updateUser", async () => {
        let adapter = await firebaseAdapter.getAdapter();
        if (!user) throw new Error("No User Available");

        user = await adapter.updateUser({
            id: user.id,
            name: "Changed",
        } as any);
        expect(user!.name).toEqual("Changed");
    });
    // Sessions
    test("createSession", async () => {
        let adapter = await firebaseAdapter.getAdapter();
        session = await adapter.createSession({
            id: 1,
        } as any);

        expect(session.sessionToken.length).toMatchInlineSnapshot(`64`);
        expect(session.accessToken.length).toMatchInlineSnapshot(`64`);
        expect(session.userId).toMatchInlineSnapshot(`1`);
    });

    test("getSession", async () => {
        let adapter = await firebaseAdapter.getAdapter();
        if (!session) throw new Error("No Session Available");

        const result = (await adapter.getSession(session.sessionToken)) as ISession;

        expect(result.sessionToken).toEqual(session.sessionToken);
        expect(result.accessToken).toEqual(session.accessToken);
        expect(result.userId).toMatchInlineSnapshot(`1`);
    });
    test("updateSession", async () => {
        const maxAge = 30 * 24 * 60 * 60;
        let adapter = await firebaseAdapter.getAdapter({
            session: { maxAge }
        });
        if (!session) throw new Error("No Session Available");

        const expiresRequested = new Date(2070, 1);
        const expiresExpected = Date.now() + (maxAge * 1000);
        session = (await adapter.updateSession(
            {
                ...session,
                expires: expiresRequested,
            },
            true
        )) as ISession;

        const difference = Math.abs(session.expires.getTime() - expiresExpected);
        expect(difference).toBeLessThan(5);
    });

    test("deleteSession", async () => {
        let adapter = await firebaseAdapter.getAdapter();
        if (!session) throw new Error("No Session Available");
        await adapter.deleteSession(session.sessionToken);
    });
    // VerificationRequests
    test("createVerificationRequest", async () => {
        const nextDocId = "mocked_verification_request_id";
        mocked.firestore().mocker.setNextDocumentIds([nextDocId]);
        let adapter = await firebaseAdapter.getAdapter();
        verificationRequest = await adapter.createVerificationRequest(
            "any",
            "https://some.where",
            TOKEN,
            SECRET,
            {
                maxAge: 90,
                sendVerificationRequest: async (request: any) => {

                },
            } as any
        );
        expect(verificationRequest.id).toMatchInlineSnapshot(`"${nextDocId}"`);
        expect(verificationRequest.identifier).toEqual("any");
    });
    test("getVerificationRequest", async () => {
        let adapter = await firebaseAdapter.getAdapter();
        if (!verificationRequest)
            throw new Error("No Verification Request Available");

        const result = await adapter.getVerificationRequest(
            verificationRequest.identifier,
            TOKEN,
            SECRET,
            "provider"
        );
        expect(result?.token).toEqual(verificationRequest.token);
    });
    test("deleteVerificationRequest", async () => {
        let adapter = await firebaseAdapter.getAdapter();
        if (!verificationRequest)
            throw new Error("No Verification Request Available");
        await adapter.deleteVerificationRequest(
            verificationRequest.identifier,
            TOKEN,
            SECRET,
            "provider"
        );
    });

    // test('linkAccount', async () => {
    //   let adapter = await firebaseAdapter.getAdapter();
    //   const result = await adapter.linkAccount()
    //   expect(result).toMatchInlineSnapshot()

    // })
});