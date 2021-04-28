import * as Prisma from "@prisma/client"
import Adapter from "../src"
import type { AppOptions } from "next-auth/internals"
import Providers from "next-auth/providers"
const prisma = new Prisma.PrismaClient()
const prismaAdapter = Adapter({ prisma })
let session: Prisma.Session | null = null
let user: Prisma.User | null = null
let verificationRequest: Prisma.VerificationRequest | null = null

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

const emailProvider = { ...Providers.Email({}), maxAge: 40, from: "test" }

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

    const result = await adapter.getSession(session.sessionToken)

    expect(result?.sessionToken).toEqual(session.sessionToken)
    expect(result?.accessToken).toEqual(session.accessToken)
    expect(result?.userId).toEqual(1)
  })
  test("updateSession", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const expires = new Date(2070, 1)
    session = await adapter.updateSession(
      {
        accessToken: "e.e.e",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "userId",
        expires: expires,
        id: session.id,
        sessionToken: session.sessionToken,
      },
      true
    )
    expect(session?.expires).toEqual(expires)
  })

  test("deleteSession", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")
    await adapter.deleteSession(session.sessionToken)
    const result = await prisma.session.findUnique({
      where: { sessionToken: session.sessionToken },
    })
    expect(result).toBe(null)
  })
  // VerificationRequests
  test("createVerificationRequest", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    const identifier = "any"
    await adapter.createVerificationRequest?.(
      identifier,
      "https://some.where",
      TOKEN,
      SECRET,
      emailProvider
    )
    const result = await prisma.verificationRequest.findMany({
      where: { identifier },
    })
    verificationRequest = result?.[0]
    expect(verificationRequest.identifier).toEqual(identifier)
  })
  test("getVerificationRequest", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!verificationRequest)
      throw new Error("No Verification Request Available")

    const result = await adapter.getVerificationRequest?.(
      verificationRequest.identifier,
      TOKEN,
      SECRET,
      emailProvider
    )
    expect(result?.token).toEqual(verificationRequest.token)
  })
  test("deleteVerificationRequest", async () => {
    const adapter = await prismaAdapter.getAdapter(appOptions)
    if (!verificationRequest)
      throw new Error("No Verification Request Available")
    await adapter.deleteVerificationRequest?.(
      verificationRequest.identifier,
      TOKEN,
      SECRET,
      emailProvider
    )
    const result = await prisma.verificationRequest.findUnique({
      where: { token: TOKEN },
    })
    expect(result).toEqual(null)
  })

  // test('linkAccount', async () => {
  //   let adapter = await prismaAdapter.getAdapter();
  //   const result = await adapter.linkAccount()
  //   expect(result).toMatchInlineSnapshot()

  // })
})
