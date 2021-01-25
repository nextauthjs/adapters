import { PrismaClient } from "@prisma/client";
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
describe("adapter functions", () => {
  
  afterAll(async () => {
    prisma.$disconnect();
  });
  test("createUser", async () => {
    let adapter = await prismaAdapter.getAdapter();

    const result = await adapter.createUser({
      email: "test@next-auth.com",
      name: "test",
      image: "https://",
    } as any);
    expect(result.email).toMatchInlineSnapshot(`"test@next-auth.com"`);
    expect(result.name).toMatchInlineSnapshot(`"test"`);
    expect(result.image).toMatchInlineSnapshot(`"https://"`);
  });
  test("createSession", async () => {
    let adapter = await prismaAdapter.getAdapter();
    const result = await adapter.createSession({
      id: 1,
    } as any);

    expect(result.sessionToken.length).toMatchInlineSnapshot(`64`);
    expect(result.accessToken.length).toMatchInlineSnapshot(`64`);
    expect(result.userId).toMatchInlineSnapshot(`1`);
  });
  // test('createVerificationRequest', async () => {
  //   const result = await adapter.createVerificationRequest()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('deleteSession', async () => {
  //   const result = await adapter.deleteSession()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('deleteVerificationRequest', async () => {
  //   const result = await adapter.deleteVerificationRequest()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('getSession', async () => {
  //   const result = await adapter.getSession()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('getUser', async () => {
  //   const result = await adapter.getUser()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('getUserByEmail', async () => {
  //   const result = await adapter.getUserByEmail()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('getUserByProviderAccountId', async () => {
  //   const result = await adapter.getUserByProviderAccountId()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('getVerificationRequest', async () => {
  //   const result = await adapter.getVerificationRequest()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('linkAccount', async () => {
  //   const result = await adapter.linkAccount()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('updateSession', async () => {
  //   const result = await adapter.updateSession()
  //   expect(result).toMatchInlineSnapshot()

  // })
  // test('updateUser', async () => {
  //   const result = await adapter.updateUser()
  //   expect(result).toMatchInlineSnapshot()

  // })
});
