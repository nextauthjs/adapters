import PouchDB from "pouchdb"
import memoryAdapter from "pouchdb-adapter-memory"
import find from "pouchdb-find"
import Adapter from "../src"
import { ulid } from "ulid"
import type { AppOptions } from "next-auth/internals"

// Prevent "ReferenceError: You are trying to import a file
// after the Jest environment has been torn down"
// https://stackoverflow.com/questions/50793885/referenceerror-you-are-trying-to-import-a-file-after-the-jest-environment-has#50793993
jest.useFakeTimers()

// nextauth-pouchdb app options
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

// pouchdb setup
PouchDB.plugin(memoryAdapter).plugin(find)
let pouchdb: PouchDB.Database

// test mock data
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
  SECRET: "SECRET",
  TOKEN: "TOKEN",
}

describe("adapter functions", () => {
  beforeEach(async () => {
    try {
      pouchdb = new PouchDB(ulid(), { adapter: "memory" })
      pouchdbAdapter = Adapter({ pouchdb })
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
    const id = ["User", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    const res = await adapter.getUser(id)

    expect(res).toEqual({ id, ...mock.user })
  })

  test("getUserByEmail", async () => {
    const id = ["User", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    const res = await adapter.getUserByEmail(mock.user.email)

    expect(res).toEqual({ id, ...mock.user })
  })

  test("getUserByProviderAccountId", async () => {
    const userId = ["User", ulid()].join("_")
    const accountId = [
      "Account",
      mock.account.providerId,
      mock.account.providerAccountId,
    ].join("_")
    await pouchdb.put({ _id: userId, data: { id: userId, ...mock.user } })
    await pouchdb.put({
      _id: accountId,
      data: {
        ...mock.account,
        userId,
        accessTokenExpires: new Date(
          mock.account.accessTokenExpires
        ).toISOString(),
      },
    })

    const user = await adapter.getUserByProviderAccountId(
      mock.account.providerId,
      mock.account.providerAccountId
    )

    expect(user).toEqual({ id: userId, ...mock.user })
  })

  test("updateUser", async () => {
    const id = ["User", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    const updated = await adapter.updateUser({ id, ...mock.updatedUser })

    const res: any = await pouchdb.get(id)
    expect(updated).toEqual(res.data)
  })

  test("deleteUser", async () => {
    const id = ["User", ulid()].join("_")
    await pouchdb.put({ _id: id, data: { id, ...mock.user } })

    await adapter.deleteUser(id)

    const res = await pouchdb.get(id).catch((e) => e.status)
    expect(res).toBe(404)
  })

  test("linkAccount", async () => {
    const id = ["User", ulid()].join("_")
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
    const userId = ["User", ulid()].join("_")
    const accountId = ["Account", ulid()].join("_")
    await pouchdb.put({ _id: userId, data: { id: userId, ...mock.user } })
    await pouchdb.put({
      _id: accountId,
      data: {
        ...mock.account,
        userId,
        accessTokenExpires: new Date(
          mock.account.accessTokenExpires
        ).toISOString(),
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
})
