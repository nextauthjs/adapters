import PouchDBAdapter, { defaultConfig } from "../src"
import { AppOptions } from "next-auth/internals"
import { ulid } from "ulid"

describe("adapter functions", () => {
  let dbname: string
  let pouchdbAdapter: any
  let appOptions: AppOptions
  const CustomPouchDB = defaultConfig.pouchdb.setup()

  beforeEach(async () => {
    dbname = ulid()
    pouchdbAdapter = await PouchDBAdapter({
      ...defaultConfig,
      pouchdb: {
        ...defaultConfig.pouchdb,
        name: dbname,
      },
    })
    // let session: Session | null = null
    // let user: User | null = null
    // let verificationRequest: VerificationRequest | null = null
    // const SECRET = "secret"
    // const TOKEN = "secret"
    appOptions = {
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
      adapter: pouchdbAdapter,
    }
  })

  afterEach(async () => {
    // destroy test database
    const pouchdb = new CustomPouchDB(dbname, defaultConfig.pouchdb.options)
    await pouchdb.destroy()
  })

  // User
  test("createUser", async () => {
    const data = {
      email: "test@next-auth.com",
      name: "test",
      image: "https://",
    }
    const adapter = await pouchdbAdapter.getAdapter(appOptions)
    const user = await adapter.createUser(data)

    expect(user.id).not.toBeUndefined()
    expect(user).toEqual(expect.objectContaining(data))
  })
  test("getUser", async () => {
    const adapter = await pouchdbAdapter.getAdapter(appOptions)
    const user = await adapter.createUser({
      email: "test@next-auth.com",
      name: "test",
      image: "https://",
    })
    const result = await adapter.getUser(user.id)
    expect(result).toEqual(user)
  })
})
