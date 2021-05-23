import { Adapter, AdapterInstance } from "next-auth/adapters"
import { AppOptions } from "next-auth/internals"
import Providers, { EmailConfig } from "next-auth/providers"
import { createHash } from "crypto"

/**
 * A wrapper to run the most basic tests.
 * Run this at the top of your test file.
 * You can add additional tests below, if you wish.
 */
export function runBasicTests(options: {
  adapter: ReturnType<Adapter>
  /** Utility functions to talk directly with the db */
  db: {
    /** Optional, after all tests have been run, this will make sure the database is disconnected */
    disconnect?: () => any
    /** Optional, establishes a db connection before all tests, if your db doesn't do this manually */
    connect?: () => any
    /** A simple query function that returns a session directly from the db. */
    session: (token: string) => any
    /**
     * Forcefully sets the expiry date to a value
     * in the past on the given session. This helps to
     * test if an invalidated session is properly cleaned up.
     */
    expireSession: (sessionToken: string, expires: Date) => any
    /** A simple query function that returns a user directly from the db. */
    user: (id: string) => any
    /** A simple query function that returns an account directly from the db. */
    account: (id: string) => any
    /**
     * A simple query function that returns an verification token directly from the db,
     * based on the user identifier and the verification token (hashed).
     */
    verificationRequest: (identifier: string, hashedToken: string) => any
  }
  /** Optionally overrides the default mock data values */
  mock?: {
    /** The options that `getAdapter()` receives from `next-auth` */
    appOptions?: AppOptions
    /** The user object passed to the adapter from `next-auth` */
    user?: any
    /** The params */
    verificationParams?: string[]
  }
}) {
  // Mock data

  const appOptions: AppOptions = {
    action: "signin",
    basePath: "",
    baseUrl: "http://example.com",
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
    secret: "VERY SECRET",
    session: {
      jwt: false,
      maxAge: 60 * 60 * 24 * 30,
      updateAge: 60 * 60 * 24,
    },
    adapter: null as unknown as ReturnType<Adapter>, // TODO: Make it optional on AppOptions
    ...options.mock?.appOptions,
  }

  const defaultUser = {
    email: "fill@murray.com",
    image: "https://www.fillmurray.com/460/300",
    name: "Fill Murray",
    ...options.mock?.user,
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
      expect(await adapter.getUserByEmail(null)).toBeNull()
      const userByEmail = await adapter.getUserByEmail(user.email)
      expect(userByEmail).toMatchObject(user)
    })

    test.todo("getUserByProviderAccountId")

    test("updatedUser", async () => {
      user.email = "jane@example.com"
      const updatedUser = await adapter.updateUser(user)
      expect(updatedUser.email).toBe(user.email)
    })

    // (Currently unimplemented in core, so we don't require it yet)
    test.skip("deleteUser", async () => {
      if (adapter.deleteUser) {
        await adapter.deleteUser(user.id)
        const expectedUser = await options.db.user(user.id)
        expect(expectedUser).toBeNull()
      }
    })
  })

  describe("Session", () => {
    const now = Date.now()
    let user: any

    beforeAll(async () => {
      user = await adapter.createUser(defaultUser)
    })

    test("createSession", async () => {
      const session = await adapter.createSession(user)
      expect(session.accessToken).toHaveLength(64)
      expect(session.sessionToken).toHaveLength(64)
      expect(session.userId).toBe(user.id)
      expect(session.expires.valueOf()).toBeGreaterThanOrEqual(
        now + appOptions.session.maxAge
      )
    })

    test("getSession", async () => {
      const session = await adapter.createSession(user)
      const sessionByToken = await adapter.getSession(session.sessionToken)
      expect(sessionByToken).toMatchObject(session)

      // Invalidate expired session
      await options.db.expireSession(session.sessionToken, new Date(1970, 1, 1))
      // Expired session should return null
      expect(await adapter.getSession(session.sessionToken)).toBeNull()
      // Expired session should be removed from the database
      expect(await options.db.session(session.sessionToken)).toBeNull()
    })

    test("updateSession", async () => {
      const session = await adapter.createSession(user)
      // Don't update session if not forced
      expect(await adapter.updateSession(session)).toBeNull()
      expect(await adapter.updateSession(session, false)).toBeNull()

      // Update session if forced
      const updated = await adapter.updateSession(session, true)
      expect(updated.accessToken).toBe(session.accessToken)
      expect(updated.sessionToken).toBe(session.sessionToken)
      expect(updated.userId).toBe(session.userId)
      // TODO: expect(updated.expires.valueOf()).toBe(????)

      // Update session if expired
      const expired = await adapter.updateSession(session, true)
      expect(expired.accessToken).toBe(session.accessToken)
      expect(expired.sessionToken).toBe(session.sessionToken)
      expect(expired.userId).toBe(session.userId)
      // TODO: expect(expired.expires.valueOf()).toBe(????)
    })

    test("deleteSession", async () => {
      const session = await adapter.createSession(user)

      await adapter.deleteSession(session.sessionToken)
      expect(await options.db.session(session.sessionToken)).toBeNull()
    })
  })

  describe("Account", () => {
    test.todo("linkAccount")

    // (Currently unimplemented in core, so we don't require it yet)
    test.skip("unlinkAccount", async () => {
      await adapter.unlinkAccount?.("", "", "")
    })
  })

  describe("Verification Request", () => {
    const email = "jane@example.com"
    const url = appOptions.baseUrl
    const token = "000000000000"
    const hashToken = (token: string) =>
      createHash("sha256").update(`${token}${appOptions.secret}`).digest("hex")
    // @ts-expect-error
    const provider: EmailConfig & {
      maxAge: number
      from: string
    } = Providers.Email({
      sendVerificationRequest: jest.fn(),
      server: "",
      maxAge: 60,
      from: "noreply@example.com",
    })

    test("createVerificationRequest", async () => {
      if (!adapter.createVerificationRequest) {
        return console.warn("This adapter does not support Email providers")
      }
      await adapter.createVerificationRequest(
        email,
        appOptions.baseUrl,
        token,
        appOptions.secret,
        provider
      )

      expect(provider.sendVerificationRequest).toBeCalledTimes(1)
      expect(provider.sendVerificationRequest).toBeCalledWith({
        baseUrl: appOptions.baseUrl,
        identifier: email,
        provider,
        token,
        url,
      })
      const dbVerificationRequest = await options.db.verificationRequest(
        email,
        hashToken(token)
      )
      expect(dbVerificationRequest.identifier).toBe(email)
      expect(dbVerificationRequest.expires.valueOf()).toBeLessThanOrEqual(
        Date.now() + provider.maxAge * 1000
      )
      expect(dbVerificationRequest.token).toBe(hashToken(token))
    })
    test("getVerificationRequest", async () => {
      if (!adapter.getVerificationRequest) {
        return console.warn("This adapter does not support Email providers")
      }
      expect(
        await adapter.getVerificationRequest(
          email,
          token,
          appOptions.secret,
          provider
        )
      ).toEqual(
        expect.objectContaining({
          identifier: email,
          expires: expect.any(Date),
          token: hashToken(token),
        })
      )

      // TODO: getVerificationRequest should delete the token from the database immediatelly
      // expect(
      //   await options.db.verificationRequest(email, hashToken(token))
      // ).toBeNull()
    })
    test("deleteVerificationRequest", async () => {
      // TODO: Deprecate in favour of getVerificationRequest doing this.
      if (
        !adapter.deleteVerificationRequest ||
        !adapter.createVerificationRequest
      ) {
        return console.warn("This adapter does not support Email providers")
      }
      const token = "1111111111111111"
      await adapter.createVerificationRequest(
        email,
        appOptions.baseUrl,
        token,
        appOptions.secret,
        provider
      )

      await adapter.deleteVerificationRequest(
        email,
        token,
        appOptions.secret,
        provider
      )
      expect(
        await options.db.verificationRequest(email, hashToken(token))
      ).toBeNull()
    })
  })

  return {
    appOptions,
  }
}
