import { SequelizeAdapter } from "../../src/adapter"
import db from "../db/models"
import type { AppOptions } from "next-auth/internals"
import Providers from "next-auth/providers"
import { runBasicTests } from "../../../../basic-tests"
import type { User, Session } from "next-auth"

const sequelizeAdapter = SequelizeAdapter({ models: db })

runBasicTests({
  adapter: sequelizeAdapter,
  db: {
    async disconnect() {
      await db.sequelize.close()
    },
    session(sessionToken) {
      return db.Session.findOne({ where: { sessionToken } })
    },
    expireSession(sessionToken, expires) {
      return db.Session.update({ expires }, { where: { sessionToken } })
    },
    user(id) {
      return db.User.findOne({ where: { id } })
    },
    account(providerId, providerAccountId) {
      return db.Account.findOne({ where: { providerId, providerAccountId } })
    },
    verificationRequest(identifier, token) {
      return db.VerificationRequest.findOne({
        where: { identifier, token },
      })
    },
  },
  mock: {
    user: {
      emailVerified: new Date("2017-01-01"),
    },
  },
})

type SessionAttributes = {
  userId: string
  expires: Date
  sessionToken: string
  accessToken: string
}

type verificationRequestAttributes = {
  id: number
  identifier: string
  token: string
  expires: Date
  createdAt: Date
  updatedAt: Date
}

let session: (Session & SessionAttributes) | null = null
let user: (User & { emailVerified?: Date }) | null = null
let verificationRequest: verificationRequestAttributes

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
  adapter: sequelizeAdapter as any,
}

const sendVerificationRequestMock = jest.fn()

const emailProvider = {
  ...Providers.Email({
    sendVerificationRequest: sendVerificationRequestMock,
  }),
} as any

describe("adapter functions", () => {
  afterAll(async () => {
    await db.sequelize.close()
  })
  // User
  test("createUser", async () => {
    const adapter = await sequelizeAdapter.getAdapter(appOptions)

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
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    if (!user) throw new Error("No User Available")

    user = await adapter.updateUser({
      id: user.id,
      name: "Changed",
    } as any)
    expect(user?.name).toEqual("Changed")
  })
  // Sessions
  test("createSession", async () => {
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    if (!user) throw new Error("No User Available")
    session = await adapter.createSession({
      id: user.id,
    } as any)

    expect(session.sessionToken.length).toMatchInlineSnapshot(`64`)
    expect(session.accessToken.length).toMatchInlineSnapshot(`64`)
  })

  test("getSession", async () => {
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const result = await adapter.getSession(session.sessionToken)

    expect(result?.sessionToken).toEqual(session.sessionToken)
    expect(result?.accessToken).toEqual(session.accessToken)
  })
  test("updateSession", async () => {
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")

    const expires = new Date(2070, 1) as string & Date
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
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    if (!session) throw new Error("No Session Available")
    await adapter.deleteSession(session.sessionToken)
    const result = await db.Session.findOne({
      where: { sessionToken: session.sessionToken },
    })
    expect(result).toBe(null)
  })
  // VerificationRequests
  test("createVerificationRequest", async () => {
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    const identifier = "any"
    await adapter.createVerificationRequest?.(
      identifier,
      "https://some.where",
      TOKEN,
      SECRET,
      emailProvider
    )
    const result = await db.VerificationRequest.findAll({
      where: { identifier },
    })
    verificationRequest = result?.[0]
    expect(verificationRequest.identifier).toEqual(identifier)
    expect(sendVerificationRequestMock).toBeCalledTimes(1)
  })
  test("getVerificationRequest", async () => {
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
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
    const adapter = await sequelizeAdapter.getAdapter(appOptions)
    if (!verificationRequest)
      throw new Error("No Verification Request Available")
    await adapter.deleteVerificationRequest?.(
      verificationRequest.identifier,
      TOKEN,
      SECRET,
      emailProvider
    )
    const result = await db.VerificationRequest.findOne({
      where: { token: TOKEN },
    })
    expect(result).toEqual(null)
  })

  // test('linkAccount', async () => {
  //   let adapter = await sequelizeAdapter.getAdapter();
  //   const result = await adapter.linkAccount()
  //   expect(result).toMatchInlineSnapshot()

  // })
})
