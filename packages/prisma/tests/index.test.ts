import {
  PrismaClient,
  Session,
  User,
  VerificationRequest,
} from "@prisma/client";
import Adapter from "../src";
const prisma = new PrismaClient();
const prismaAdapter = Adapter({
  prisma: prisma,
  modelMapping: {
    Account: "account",
    Session: "session",
    User: "user",
    VerificationRequest: "verificationRequest",
  },
});
let session: Session | null = null;
let user: User | null = null;
let verificationRequest: VerificationRequest | null = null;

const SECRET = "secret";
const TOKEN = "secret";

describe("adapter functions", () => {
  afterAll(async () => {
    prisma.$disconnect();
  });
  // User
  test("createUser", async () => {
    let adapter = await prismaAdapter.getAdapter();

    user = await adapter.createUser({
      email: "test@next-auth.com",
      name: "test",
      image: "https://",
    } as any);

    expect(typeof user.id === "string").toBeTruthy();
    expect(user.email).toMatchInlineSnapshot(`"test@next-auth.com"`);
    expect(user.name).toMatchInlineSnapshot(`"test"`);
    expect(user.image).toMatchInlineSnapshot(`"https://"`);
  });
  test("updateUser", async () => {
    let adapter = await prismaAdapter.getAdapter();
    if (!user) throw new Error("No User Available");

    user = await adapter.updateUser({
      id: user.id,
      name: "Changed",
    } as any);
    expect(user!.name).toEqual("Changed");
  });
  // Sessions
  test("createSession", async () => {
    let adapter = await prismaAdapter.getAdapter();
    if (!user) throw new Error("No User Available");
    session = await adapter.createSession({
      id: user.id,
    } as any);

    expect(session.sessionToken.length).toMatchInlineSnapshot(`64`);
    expect(session.accessToken.length).toMatchInlineSnapshot(`64`);
    expect(typeof session.userId === "string").toBeTruthy();
  });

  test("getSession", async () => {
    let adapter = await prismaAdapter.getAdapter();
    if (!session) throw new Error("No Session Available");

    const result = (await adapter.getSession(session.sessionToken)) as Session;

    expect(result.sessionToken).toEqual(session.sessionToken);
    expect(result.accessToken).toEqual(session.accessToken);
    expect(typeof result.userId === "string").toBeTruthy();
  });
  test("updateSession", async () => {
    let adapter = await prismaAdapter.getAdapter();
    if (!session) throw new Error("No Session Available");

    const expires = new Date(2070, 1);
    session = (await adapter.updateSession(
      {
        expires: expires,
        id: session.id,
        sessionToken: session.sessionToken,
      },
      true
    )) as Session;
    expect(session.expires).toEqual(expires);
  });

  test("deleteSession", async () => {
    let adapter = await prismaAdapter.getAdapter();
    if (!session) throw new Error("No Session Available");
    const result = await adapter.deleteSession(session.sessionToken);
    expect(result.sessionToken).toEqual(session.sessionToken);
  });
  // VerificationRequests
  test("createVerificationRequest", async () => {
    let adapter = await prismaAdapter.getAdapter();
    verificationRequest = await adapter.createVerificationRequest(
      "any",
      "https://some.where",
      TOKEN,
      SECRET,
      {
        maxAge: 90,
        sendVerificationRequest: async (request: any) => {},
      } as any
    );
    expect(typeof verificationRequest.id === "string").toBeTruthy();
    expect(verificationRequest.identifier).toEqual("any");
  });
  test("getVerificationRequest", async () => {
    let adapter = await prismaAdapter.getAdapter();
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
    let adapter = await prismaAdapter.getAdapter();
    if (!verificationRequest)
      throw new Error("No Verification Request Available");
    const result = await adapter.deleteVerificationRequest(
      verificationRequest.identifier,
      TOKEN,
      SECRET,
      "provider"
    );
    expect(result.id).toEqual(verificationRequest.id);
  });

  // test('linkAccount', async () => {
  //   let adapter = await prismaAdapter.getAdapter();
  //   const result = await adapter.linkAccount()
  //   expect(result).toMatchInlineSnapshot()

  // })
});
