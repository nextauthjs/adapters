import * as admin from "firebase-admin"
import { exposeMockFirebaseAdminApp } from "ts-mock-firebase"
import Adapter, { IUser, ISession, IVerificationRequest } from "../src"
import type { AppOptions } from "next-auth/internals"
import Providers from "next-auth/providers"

const app = admin.initializeApp({})
const mocked = exposeMockFirebaseAdminApp(app)
const firebaseAdapter = Adapter({
  firestoreAdmin: admin.firestore(),
  usersCollection: "users",
  accountsCollection: "accounts",
  sessionsCollection: "sessions",
  verificationRequestsCollection: "verificationRequests",
})

let session: ISession | null = null
let user: IUser | null = null
let verificationRequest: IVerificationRequest | null = null

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
  logger: {
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  } as const,
  pages: {},
  providers: [],
  secret: "",
  session: {
    jwt: false,
    maxAge: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  adapter: firebaseAdapter as any,
}

const sendVerificationRequestMock = jest.fn()

const emailProvider = {
  ...Providers.Email({
    sendVerificationRequest: sendVerificationRequestMock,
  }),
} as any

describe("adapter functions", () => {
  afterAll(async () => {
    // TODO: figure out how mocked or docker firebase works
    await mocked.$disconnect()
  })
  // User
  test("createUser", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)

    user = await adapter.createUser({
      email: "test@next-auth.com",
      name: "test",
      image: "https://",
    } as any)

    expect(user.email).toMatchInlineSnapshot(`"test@next-auth.com"`)
    expect(user.name).toMatchInlineSnapshot(`"test"`)
    expect(user.image).toMatchInlineSnapshot(`"https://"`)
  })
  test("updateUser", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
    if (!user) throw new Error("No User Available")

    user = await adapter.updateUser({
      id: user.id,
      name: "Changed",
    } as any)
    expect(user?.name).toEqual("Changed")
  })
  // Sessions
  test("createSession", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
    if (!user) throw new Error("No User Available")
    session = await adapter.createSession({
      id: user.id,
    } as any)

    expect(session.sessionToken.length).toMatchInlineSnapshot(`64`)
    expect(session.accessToken.length).toMatchInlineSnapshot(`64`)
  })

  test("getSession", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const result = await adapter.getSession(session.sessionToken)

    expect(result?.sessionToken).toEqual(session.sessionToken)
    expect(result?.accessToken).toEqual(session.accessToken)
  })
  test("updateSession", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const expires = new Date(2070, 1)
    session = await adapter.updateSession(
      {
        accessToken: "e.e.e",
        createdAt: new Date(),
        updatedAt: new Date(),
        userId: "userId",
        expires,
        id: session.id,
        sessionToken: session.sessionToken,
      },
      true
    )
    if (!session) throw new Error("No Session Updated")

    // Using default maxAge, which is 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    expect(
      Math.abs(session.expires.getTime() - thirtyDaysFromNow.getTime())
    ).toBeLessThan(1000)
  })

  test("deleteSession", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")
    await adapter.deleteSession(session.sessionToken)
    const result = await prisma.session.findUnique({
      where: { sessionToken: session.sessionToken },
    })
    expect(result).toBe(null)
  })
  // VerificationRequests
  test("createVerificationRequest", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
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
    expect(sendVerificationRequestMock).toBeCalledTimes(1)
  })
  test("getVerificationRequest", async () => {
    const adapter = await firebaseAdapter.getAdapter(appOptions)
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
    const adapter = await firebaseAdapter.getAdapter(appOptions)
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
  //   let adapter = await firebaseAdapter.getAdapter();
  //   const result = await adapter.linkAccount()
  //   expect(result).toMatchInlineSnapshot()

  // })
})
