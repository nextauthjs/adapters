import {
  PrismaClient,
  Session,
  User,
  VerificationRequest,
} from "@prisma/client"
import Adapter from "../src"
import { AppOptions } from "next-auth/internals"
const prisma = new PrismaClient()
const prismaAdapter = Adapter({
  prisma: prisma,
  modelMapping: {
    Account: "account",
    Session: "session",
    User: "user",
    VerificationRequest: "verificationRequest",
  },
})
let session: Session | null = null
let user: User | null = null
let verificationRequest: VerificationRequest | null = null

const SECRET = "secret"
const TOKEN = "secret"

const appOptions: AppOptions = {
  action: "signin",
  basePath: "",
  baseUrl: "",
  callbacks: {},
  cookies: {},
  debug: false,
  events: {},
  jwt: {},
  theme: "auto",
  logger: console,
  pages: {},
  providers: [],
  secret: "",
  session: {},
  adapter: prismaAdapter as any,
}

describe("adapter functions", () => {
  afterAll(async () => {
    await prisma.$disconnect()
  })
  // User
  test("createUser", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)

    user = await adapter.createUser({
      email: "test@next-auth.com",
      name: "test",
      image: "https://",
    } as any)

    expect(user.id).toEqual(1)
    expect(user.email).toMatchInlineSnapshot(`"test@next-auth.com"`)
    expect(user.name).toMatchInlineSnapshot(`"test"`)
    expect(user.image).toMatchInlineSnapshot(`"https://"`)
  })
  test("updateUser", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!user) throw new Error("No User Available")

    user = await adapter.updateUser({
      id: user.id,
      name: "Changed",
    } as any)
    expect(user?.name).toEqual("Changed")
  })
  // Sessions
  test("createSession", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!user) throw new Error("No User Available")
    session = await adapter.createSession({
      id: user.id,
    } as any)

    expect(session.sessionToken.length).toMatchInlineSnapshot(`64`)
    expect(session.accessToken.length).toMatchInlineSnapshot(`64`)
    expect(session.userId).toEqual(1)
  })

  test("getSession", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const result = (await adapter.getSession(session.sessionToken)) as Session

    expect(result.sessionToken).toEqual(session.sessionToken)
    expect(result.accessToken).toEqual(session.accessToken)
    expect(result.userId).toEqual(1)
  })
  test("updateSession", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const expires = new Date(2070, 1)
    session = (await adapter.updateSession(
      {
        expires: expires,
        id: session.id,
        sessionToken: session.sessionToken,
      },
      true
    )) as Session
    expect(session.expires).toEqual(expires)
  })

  test("deleteSession", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")
    const result = await adapter.deleteSession(session.sessionToken)
    expect(result.sessionToken).toEqual(session.sessionToken)
  })
  // VerificationRequests
  test("createVerificationRequest", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    verificationRequest = await adapter.createVerificationRequest(
      "any",
      "https://some.where",
      TOKEN,
      SECRET,
      {
        maxAge: 90,
        sendVerificationRequest: async (request: any) => {},
      } as any
    )
    expect(verificationRequest.id).toEqual(1)
    expect(verificationRequest.identifier).toEqual("any")
  })
  test("getVerificationRequest", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!verificationRequest)
      throw new Error("No Verification Request Available")

    const result = await adapter.getVerificationRequest(
      verificationRequest.identifier,
      TOKEN,
      SECRET
    )
    expect(result?.token).toEqual(verificationRequest.token)
  })
  test("deleteVerificationRequest", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!verificationRequest)
      throw new Error("No Verification Request Available")
    const result = await adapter.deleteVerificationRequest(
      verificationRequest.identifier,
      TOKEN,
      SECRET
    )
    expect(result.id).toEqual(verificationRequest.id)
  })

  // test('linkAccount', async () => {
  //   let adapter = await prismaAdapter.getAdapter();
  //   const result = await adapter.linkAccount()
  //   expect(result).toMatchInlineSnapshot()

  // })
})
