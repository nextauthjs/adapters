import PouchDB from "pouchdb"
import memoryAdapter from "pouchdb-adapter-memory"
import find from "pouchdb-find"
import { ulid } from "ulid"
import { PouchDBAdapter } from "../src"
import type { AppOptions } from "next-auth/internals"
import Providers from "next-auth/providers"
import { createHash } from "crypto"

// pouchdb setup
PouchDB.plugin(memoryAdapter).plugin(find)
let pouchdb: PouchDB.Database

// jest setup
// Prevent "ReferenceError: You are trying to import a file after the Jest environment has been torn down" https://stackoverflow.com/questions/50793885/referenceerror-you-are-trying-to-import-a-file-after-the-jest-environment-has#50793993
jest.useFakeTimers()

const sendVerificationRequestMock = jest.fn()

const emailProvider = {
  ...Providers.Email({
    sendVerificationRequest: sendVerificationRequestMock,
  }),
} as any

// nextauth-pouchdb setup
let pouchdbAdapter: any
let adapter: any
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
  session: {},
  adapter: pouchdbAdapter,
}

// data for testing
const mock = {
  user: {
    email: "EMAIL",
    name: "NAME",
    image: "IMAGE",
  },
  updatedUser: {
    email: "UPDATED_EMAIL",
    name: "UPDATED_NAME",
    image: "UPDATED_IMAGE",
  },
  account: {
    providerId: "PROVIDER_ID",
    providerType: "PROVIDER_TYPE",
    providerAccountId: "PROVIDER_ACCOUNT_ID",
    refreshToken: "REFRESH_TOKEN",
    accessToken: "ACCESS_TOKEN",
    accessTokenExpires: 0,
  },
  session: {
    sessionToken: "SESSION_TOKEN",
    accessToken: "ACCESS_TOKEN",
    expires: new Date(Date.now() + 10000).toISOString(),
  },
  verificationRequest: {
    identifier: "any",
    url: "URL",
    token: createHash("sha256").update(`${"TOKEN"}${"SECRET"}`).digest("hex"),
    baseUrl: appOptions.baseUrl,
    provider: emailProvider,
  },
  TOKEN: "TOKEN",
  SECRET: "SECRET",
}

describe("adapter functions", () => {
  beforeEach(async () => {
    try {
      pouchdb = new PouchDB(ulid(), { adapter: "memory" })
      pouchdbAdapter = PouchDBAdapter({ pouchdb })
      adapter = await pouchdbAdapter.getAdapter({ ...appOptions })
    } catch (error) {
      console.log(error)
    }
  })

  afterEach(async () => {
    try {
      // destroy test database
      await pouchdb.destroy()
    } catch (error) {
      console.log(error)
    }
  })

  test("createUser", async () => {
    const res = await adapter.createUser(mock.user)

    expect(res.id).not.toBeUndefined()
    expect(res).toEqual(expect.objectContaining(mock.user))
  })

  test("getUser", async () => {
    const id = ["USER", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    const res = await adapter.getUser(id)

    expect(res).toEqual({ id, ...mock.user })
  })

  test("getUserByEmail", async () => {
    const id = ["USER", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    const res = await adapter.getUserByEmail(mock.user.email)

    expect(res).toEqual({ id, ...mock.user })
  })

  test("getUserByProviderAccountId", async () => {
    const userId = ["User", ulid()].join("_")
    const accountId = [
      "ACCOUNT",
      mock.account.providerId,
      mock.account.providerAccountId,
    ].join("_")
    await pouchdb.put({ _id: userId, data: { id: userId, ...mock.user } })
    await pouchdb.put({
      _id: accountId,
      data: {
        ...mock.account,
        userId,
      },
    })

    const user = await adapter.getUserByProviderAccountId(
      mock.account.providerId,
      mock.account.providerAccountId
    )

    expect(user).toEqual({ id: userId, ...mock.user })
  })

  test("updateUser", async () => {
    const id = ["USER", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    const updated = await adapter.updateUser({ id, ...mock.updatedUser })

    const res: any = await pouchdb.get(id)
    expect(updated).toEqual(res.data)
  })

  test("deleteUser", async () => {
    const id = ["USER", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    await adapter.deleteUser(id)

    const res = await pouchdb.get(id).catch((e) => e.status)
    expect(res).toBe(404)
  })

  test("linkAccount", async () => {
    const id = ["USER", ulid()].join("_")
    const adapter = await pouchdbAdapter.getAdapter({ ...appOptions })

    await adapter.linkAccount(
      id,
      mock.account.providerId,
      mock.account.providerType,
      mock.account.providerAccountId,
      mock.account.refreshToken,
      mock.account.accessToken,
      mock.account.accessTokenExpires
    )

    const res: any = await pouchdb.find({
      use_index: "nextAuthAccountByProviderId",
      selector: {
        "data.providerId": { $eq: mock.account.providerId },
        "data.providerAccountId": { $eq: mock.account.providerAccountId },
      },
      limit: 1,
    })
    expect(res.docs[0].data).toEqual({
      ...mock.account,
      userId: id,
      accessTokenExpires: new Date(
        mock.account.accessTokenExpires
      ).toISOString(),
    })
  })

  test("unlinkAccount", async () => {
    const userId = ["USER", ulid()].join("_")
    const accountId = ["ACCOUNT", ulid()].join("_")
    await pouchdb.put({ _id: userId, data: { id: userId, ...mock.user } })
    await pouchdb.put({
      _id: accountId,
      data: {
        ...mock.account,
        userId,
        accessTokenExpires: new Date(mock.account.accessTokenExpires),
      },
    })

    await adapter.unlinkAccount(
      userId,
      mock.account.providerId,
      mock.account.providerAccountId
    )

    const res: any = await pouchdb.find({
      use_index: "nextAuthAccountByProviderId",
      selector: {
        "data.providerId": { $eq: mock.account.providerId },
        "data.providerAccountId": { $eq: mock.account.providerAccountId },
      },
      limit: 1,
    })
    expect(res.docs).toHaveLength(0)
  })

  test("createSession", async () => {
    const id = ["USER", ulid()].join("_")
    const res = await adapter.createSession({ id, ...mock.user })

    expect(res).toEqual(expect.objectContaining({ userId: id }))
    expect(res).toHaveProperty("expires")
    expect(res).toHaveProperty("sessionToken")
    expect(res).toHaveProperty("accessToken")
  })

  test("getSession", async () => {
    const userId = ["USER", ulid()].join("_")
    const sessionId = ["SESSION", ulid()].join("_")
    const data = {
      ...mock.session,
      userId,
    }
    await pouchdb.put({ _id: sessionId, data })

    const session = await adapter.getSession(data.sessionToken)

    expect(session).toEqual(data)
  })

  test("updateSession", async () => {
    const userId = ["USER", ulid()].join("_")
    const sessionId = ["SESSION", ulid()].join("_")
    const data = {
      ...mock.session,
      userId,
    }
    await pouchdb.put({ _id: sessionId, data })

    const expires = new Date(2070, 1)
    const session = await adapter.updateSession(
      {
        ...data,
        userId: "userId",
        expires,
      },
      true
    )

    // Using default maxAge, which is 30 days
    const thirtyDaysFromNow = new Date()
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30)
    expect(
      Math.abs(session.expires.getTime() - thirtyDaysFromNow.getTime())
    ).toBeLessThan(1000)
  })

  test("deleteSession", async () => {
    const userId = ["USER", ulid()].join("_")
    const sessionId = ["SESSION", ulid()].join("_")
    const data = {
      ...mock.session,
      userId,
    }
    await pouchdb.put({ _id: sessionId, data })

    await adapter.deleteSession(data.sessionToken)

    // Using default maxAge, which is 30 days
    const res: any = await pouchdb.find({
      use_index: "nextAuthSessionByToken",
      selector: {
        "data.sessionToken": { $eq: data.sessionToken },
      },
      limit: 1,
    })
    expect(res.docs).toHaveLength(0)
  })

  test("createVerificationRequest", async () => {
    await adapter.createVerificationRequest(
      mock.verificationRequest.identifier,
      mock.verificationRequest.url,
      mock.TOKEN,
      mock.SECRET,
      emailProvider
    )

    const res: any = await pouchdb.find({
      use_index: "nextAuthVerificationRequestByToken",
      selector: {
        "data.identifier": { $eq: mock.verificationRequest.identifier },
      },
      limit: 1,
    })

    expect(res.docs?.[0].data.identifier).toEqual(
      mock.verificationRequest.identifier
    )
    expect(sendVerificationRequestMock).toBeCalledTimes(1)
  })

  test("getVerificationRequest", async () => {
    const verificationRequestId = ["VERIFICATION-REQUEST", ulid()].join("_")
    await pouchdb.put({
      _id: verificationRequestId,
      data: { ...mock.verificationRequest },
    })

    const result = await adapter.getVerificationRequest(
      mock.verificationRequest.identifier,
      mock.TOKEN,
      mock.SECRET
    )

    expect(result?.token).toEqual(mock.verificationRequest.token)
  })

  test("deleteVerificationRequest", async () => {
    const verificationRequestId = ["VERIFICATION-REQUEST", ulid()].join("_")
    await pouchdb.put({
      _id: verificationRequestId,
      data: { ...mock.verificationRequest },
    })

    await adapter.deleteVerificationRequest(
      mock.verificationRequest.identifier,
      mock.TOKEN,
      mock.SECRET,
      emailProvider
    )
    const res: any = await pouchdb.find({
      use_index: "nextAuthVerificationRequestByToken",
      selector: {
        "data.identifier": { $eq: mock.verificationRequest.identifier },
        "data.token": { $eq: mock.verificationRequest.token },
      },
      limit: 1,
    })
    expect(res.docs).toHaveLength(0)
  })
})
