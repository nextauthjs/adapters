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
    email: "test@next-auth.com",
    name: "test",
    image: "https://",
  },
  updatedUser: {
    email: "test2@next-auth.com",
    name: "test2",
    image: "https://2",
  },
  SECRET: "secret",
  TOKEN: "secret",
}

describe("adapter functions", () => {
  beforeEach(async () => {
    try {
      // setup a test specific database
      pouchdb = new PouchDB(ulid(), { adapter: "memory" })
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      ;(async () => {
        await pouchdb.createIndex({
          index: {
            fields: ["data.email"],
            ddoc: "byEmail",
          },
        })
      })()
      pouchdbAdapter = Adapter({ pouchdb })
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

  // User
  test("createUser", async () => {
    const adapter = await pouchdbAdapter.getAdapter({ ...appOptions })
    const res = await adapter.createUser(mock.user)

    expect(res.id).not.toBeUndefined()
    expect(res).toEqual(expect.objectContaining(mock.user))
  })
  test("getUser", async () => {
    const adapter = await pouchdbAdapter.getAdapter({ ...appOptions })
    const user = await adapter.createUser(mock.user)
    const res = await adapter.getUser(user.id)
    expect(res).toEqual(user)
  })
  test("getUserByEmail", async () => {
    const adapter = await pouchdbAdapter.getAdapter({ ...appOptions })
    const user = await adapter.createUser(mock.user)
    const res = await adapter.getUserByEmail(user.email)
    expect(res).toEqual(user)
  })
  test("updateUser", async () => {
    try {
      const adapter = await pouchdbAdapter.getAdapter({ ...appOptions })
      const user = await adapter.createUser(mock.user)
      const update = await adapter.updateUser({
        ...user,
        ...mock.updatedUser,
      })
      const res = await adapter.getUser(update.id)
      expect(update).toEqual(res)
    } catch (error) {
      console.log(error)
    }
  })
  test("deleteUser", async () => {
    try {
      const adapter = await pouchdbAdapter.getAdapter({ ...appOptions })
      const user = await adapter.createUser(mock.user)
      await adapter.deleteUser(user.id)
      const res = await adapter.getUser(user.id).catch(() => undefined)
      expect(res).toBeUndefined()
    } catch (error) {
      console.log(error)
    }
  })
})
