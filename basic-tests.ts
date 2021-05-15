import { Adapter, AdapterInstance } from "next-auth/adapters"
import { AppOptions } from "next-auth/internals"

/**
 * A wrapper to run the most basic tests.
 * Run this at the top of your test file.
 * You can add additional tests below, if you wish.
 */
export default function basicTests(options: {
  adapter: ReturnType<Adapter>
  /** Utility functions to talk directly with the db */
  db: {
    /** Optional, after all tests have been run, this will make sure the database is disconnected */
    disconnect?: () => any
    /** Optional, establishes a db connection before all tests, if your db doesn't do this manually */
    connect?: () => any
    /** A simple query function that returns a session directly from the db. */
    session: (token: string) => any
    /** A simple query function that returns a user directly from the db. */
    user: (id: string) => any
    /** A simple query function that returns an account directly from the db. */
    account: (id: string) => any
    /** A simple query function that returns an verification token directly from the db. */
    verificationRequest: (id: string) => any
  }
  /** Optionally overrides the default mock data values */
  mock?: {
    /** The options that `getAdapter()` receives from `next-auth` */
    appOptions?: AppOptions
    /** The user object passed to the adapter from `next-auth` */
    user: any
  }
}) {
  // Mock data

  const appOptions: AppOptions = options.mock?.appOptions ?? {
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
    adapter: (null as unknown) as ReturnType<Adapter>, // TODO: Make it optional on AppOptions
  }

  const defaultUser = options.mock?.user ?? {
    email: "fill@murray.com",
    image: "https://www.fillmurray.com/460/300",
    name: "Fill Murray",
  }

  // Init

  let adapter: AdapterInstance<any, any, any>

  beforeAll(async () => {
    await options.db.connect?.()
    adapter = await options.adapter.getAdapter(appOptions)
  })

  afterAll(async () => {
    await options.db.disconnect?.()
  })

  // Tests
  describe("Meta", () => {
    test("Has displayName for debug purposes", async () => {
      expect(adapter.displayName).not.toBe(undefined)
    })
  })

  describe("User", () => {
    let user: any

    test("createUser", async () => {
      user = await adapter.createUser(defaultUser)
      expect(user).toEqual(expect.objectContaining(defaultUser))
    })

    test("getUser", async () => {
      const userById = await adapter.getUser(user.id)
      expect(userById).toMatchObject(user)
    })

    test("getUserByEmail", async () => {
      const userByEmail = await adapter.getUserByEmail(user.email)
      expect(userByEmail).toMatchObject(user)
    })

    test.todo("getUserByProviderAccountId")

    test("updatedUser", async () => {
      user.email = "jane@example.com"
      const updatedUser = await adapter.updateUser(user)
      expect(updatedUser.email).toBe(user.email)
    })

    // (Currently unimplemented in core)
    test.skip("deleteUser", async () => {
      if (adapter.deleteUser) {
        await adapter.deleteUser(user.id)
        const expectedUser = await adapter.getUser(user.id)
        expect(expectedUser).toBeNull()
      }
    })
  })

  describe("Session", () => {
    const now = Date.now()
    let userFromDB: any, session: any, sessionByToken: any
    beforeAll(async () => {
      userFromDB = await adapter.createUser(defaultUser)
    })

    test("createSession", async () => {
      session = await adapter.createSession(userFromDB)
      expect(session.accessToken).toHaveLength(64)
      expect(session.sessionToken).toHaveLength(64)
      expect(session.userId).toBe(userFromDB.id)
      expect(session.expires.valueOf()).toBeGreaterThanOrEqual(
        now + appOptions.session.maxAge
      )
    })

    test("getSession", async () => {
      sessionByToken = await adapter.getSession(session.sessionToken)
      expect(sessionByToken).toMatchObject(session)
    })

    test("updateSession", async () => {
      // Don't update session if not forced
      expect(await adapter.updateSession(sessionByToken)).toBeNull()
      expect(await adapter.updateSession(sessionByToken, false)).toBeNull()

      // Update session if forced
      const updated = await adapter.updateSession(sessionByToken, true)
      expect(updated.accessToken).toBe(session.accessToken)
      expect(updated.sessionToken).toBe(session.sessionToken)
      expect(updated.userId).toBe(session.userId)
      // TODO: expect(updated.expires.valueOf()).toBe(????)

      // Update session if expired
      const expired = await adapter.updateSession(sessionByToken, true)
      expect(expired.accessToken).toBe(session.accessToken)
      expect(expired.sessionToken).toBe(session.sessionToken)
      expect(expired.userId).toBe(session.userId)
      // TODO: expect(expired.expires.valueOf()).toBe(????)
    })

    test("deleteSession", async () => {
      await adapter.deleteSession(session.sessionToken)

      expect(await options.db.session(session.sessionToken)).toBeNull()
    })
  })

  describe("Account", () => {
    test.todo("linkAccount")

    // (Currently unimplemented in core)
    test.skip("unlinkAccount", async () => {
      await adapter.unlinkAccount?.("", "", "")
    })
  })

  describe("Verification Request", () => {
    test.todo("createVerificationRequest")
    test.todo("getVerificationRequest")
    test.todo("deleteVerificationRequest")
  })
}
