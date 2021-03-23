import { AppOptions } from 'next-auth'
import { query as q, Client as FaunaClient } from 'faunadb'
import { createHash, randomBytes } from 'crypto'
import { AdapterInstance, EmailSessionProvider } from 'next-auth/adapters'
import { SessionProvider } from 'next-auth/client'

export interface IFaunaAdapterConfig {
  faunaClient: FaunaClient
  errorLogger?: (...args: any[]) => void
  collections?: {
    User: string
    Account: string
    Session: string
    VerificationRequest: string
  }
  indexes?: {
    Account: string
    User: string
    Session: string
    VerificationRequest: string
  }
}

interface Profile {
  name: string
  email: string
  image: string
  emailVerified: Date
  username: string
}

interface UserData {
  name: string
  email: string
  image: string
  emailVerified: Date
  username: string
  createdAt: Date
  updatedAt: Date
}

interface User extends UserData {
  id: string
}

interface UserQueryResult {
  data: UserData
  ref: {
    id: string
  }
}

interface AccountData {
  userId: string
  providerId: string
  providerType: string
  providerAccountId: string
  refreshToken?: string
  accessToken: string
  accessTokenExpires: string
  createdAt: Date
  updatedAt: Date
}

interface SessionData {
  userId: string
  expires: Date
  sessionToken: string
  accessToken: string
  createdAt: string
  updatedAt: string
}

interface Session extends SessionData {
  id: string
}

interface VerificationRequestData {
  identifier: string
  token: string
  expires: Date | null
  createdAt: Date
  updatedAt: Date
}

function FaunaAdapter(
  config: IFaunaAdapterConfig,
  options = {}
): {
  getAdapter: (
    appOptions: Partial<AppOptions>
  ) => Promise<AdapterInstance<User, Profile, Session, VerificationRequestData>>
} {
  const {
    faunaClient,
    errorLogger = console.error,
    collections = {
      User: 'users',
      Account: 'accounts',
      Session: 'sessions',
      VerificationRequest: 'verification_requests',
    },
    indexes = {
      Account: 'account_by_provider_account_id',
      User: 'user_by_email',
      Session: 'session_by_token',
      VerificationRequest: 'verification_request_by_token',
    },
  } = config

  async function getAdapter(
    appOptions: Partial<AppOptions>
  ): Promise<AdapterInstance<User, Profile, Session, VerificationRequestData>> {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    function _debug(_debugCode: any, ..._args: any[]) {
      // console.info(`fauna_${_debugCode}`, ..._args)
    }

    const defaultSessionMaxAge = 30 * 24 * 60 * 60 * 1000
    const sessionMaxAge =
      appOptions && appOptions.session && appOptions.session.maxAge
        ? appOptions.session.maxAge * 1000
        : defaultSessionMaxAge
    const sessionUpdateAge =
      appOptions && appOptions.session && appOptions.session.updateAge
        ? appOptions.session.updateAge * 1000
        : 0

    async function createUser(profile: Profile): Promise<User> {
      _debug('createUser', profile)

      const FQL = q.Create(q.Collection(collections.User), {
        data: {
          name: profile.name,
          email: profile.email,
          image: profile.image,
          emailVerified: profile.emailVerified
            ? q.Time(profile.emailVerified.toISOString())
            : null,
          username: profile.username,
          createdAt: q.Now(),
          updatedAt: q.Now(),
        },
      })

      try {
        const newUser = await faunaClient.query<UserQueryResult>(FQL)
        const user = { ...newUser.data, id: newUser.ref.id }

        return user
      } catch (error) {
        errorLogger('CREATE_USER', error)
        return Promise.reject(new Error('CREATE_USER'))
      }
    }

    async function getUser(id: string): Promise<User> {
      _debug('getUser', id)

      const FQL = q.Get(q.Ref(q.Collection(collections.User), id))

      try {
        const {
          data: userData,
          ref,
        } = await faunaClient.query<UserQueryResult>(FQL)

        return { ...userData, id: ref.id }
      } catch (error) {
        errorLogger('GET_USER', error)
        return Promise.reject(new Error('GET_USER'))
      }
    }

    async function getUserByEmail(email: string): Promise<User | null> {
      _debug('getUserByEmail', email)

      if (!email) {
        return null
      }

      const FQL = q.Let(
        {
          ref: q.Match(q.Index(indexes.User), email),
        },
        q.If(q.Exists(q.Var('ref')), q.Get(q.Var('ref')), null)
      )

      try {
        const user = await faunaClient.query<UserQueryResult>(FQL)

        if (user == null) {
          return null
        }

        const { data: userData, ref } = user
        return { ...userData, id: ref.id }
      } catch (error) {
        errorLogger('GET_USER_BY_EMAIL', error)
        return Promise.reject(new Error('GET_USER_BY_EMAIL'))
      }
    }

    async function getUserByProviderAccountId(
      providerId: string,
      providerAccountId: string
    ): Promise<User | null> {
      _debug('getUserByProviderAccountId', providerId, providerAccountId)

      const FQL = q.Let(
        {
          ref: q.Match(q.Index(indexes.Account), [
            providerId,
            providerAccountId,
          ]),
        },
        q.If(
          q.Exists(q.Var('ref')),
          q.Get(
            q.Ref(
              q.Collection(collections.User),
              q.Select(['data', 'userId'], q.Get(q.Var('ref')))
            )
          ),
          null
        )
      )

      try {
        const user = await faunaClient.query<UserQueryResult>(FQL)

        if (user == null) {
          return null
        }

        const { data: userData, ref } = user
        return { ...userData, id: ref.id }
      } catch (error) {
        errorLogger('GET_USER_BY_PROVIDER_ACCOUNT_ID', error)
        return Promise.reject(new Error('GET_USER_BY_PROVIDER_ACCOUNT_ID'))
      }
    }

    async function updateUser(user: User): Promise<User> {
      _debug('updateUser', user)

      const FQL = q.Update(q.Ref(q.Collection(collections.User), user.id), {
        data: {
          name: user.name,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified
            ? q.Time(user.emailVerified.toISOString())
            : null,
          username: user.username,
          updatedAt: q.Now(),
        },
      })

      try {
        const user = await faunaClient.query<UserQueryResult>(FQL)
        const { data: userData, ref } = user
        return { ...userData, id: ref.id }
      } catch (error) {
        errorLogger('UPDATE_USER_ERROR', error)
        return Promise.reject(new Error('UPDATE_USER_ERROR'))
      }
    }

    async function deleteUser(userId: string) {
      _debug('deleteUser', userId)

      const FQL = q.Delete(q.Ref(q.Collection(collections.User), userId))

      try {
        await faunaClient.query(FQL)
      } catch (error) {
        errorLogger('DELETE_USER_ERROR', error)
        return Promise.reject(new Error('DELETE_USER_ERROR'))
      }
    }

    async function linkAccount(
      userId: string,
      providerId: string,
      providerType: string,
      providerAccountId: string,
      refreshToken: string,
      accessToken: string,
      accessTokenExpires: number
    ): Promise<void> {
      _debug(
        'linkAccount',
        userId,
        providerId,
        providerType,
        providerAccountId,
        refreshToken,
        accessToken,
        accessTokenExpires
      )

      try {
        await faunaClient.query<{
          data: AccountData
          ref: { id: string }
        }>(
          q.Create(q.Collection(collections.Account), {
            data: {
              userId: userId,
              providerId: providerId,
              providerType: providerType,
              providerAccountId: providerAccountId,
              refreshToken: refreshToken,
              accessToken: accessToken,
              accessTokenExpires: accessTokenExpires,
              createdAt: q.Now(),
              updatedAt: q.Now(),
            },
          })
        )

        return
      } catch (error) {
        errorLogger('LINK_ACCOUNT_ERROR', error)
        return Promise.reject(new Error('LINK_ACCOUNT_ERROR'))
      }
    }

    async function unlinkAccount(
      userId: string,
      providerId: string,
      providerAccountId: string
    ) {
      _debug('unlinkAccount', userId, providerId, providerAccountId)

      const FQL = q.Delete(
        q.Select(
          'ref',
          q.Get(
            q.Match(q.Index(indexes.Account), [providerId, providerAccountId])
          )
        )
      )

      try {
        await faunaClient.query(FQL)
      } catch (error) {
        errorLogger('UNLINK_ACCOUNT_ERROR', error)
        return Promise.reject(new Error('UNLINK_ACCOUNT_ERROR'))
      }
    }

    async function createSession(user: User): Promise<Session> {
      _debug('createSession', user)

      const dateExpires = new Date()
      dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
      const expires = dateExpires.toISOString()

      const FQL = q.Create(q.Collection(collections.Session), {
        data: {
          userId: user.id,
          expires: q.Time(expires),
          sessionToken: randomBytes(32).toString('hex'),
          accessToken: randomBytes(32).toString('hex'),
          createdAt: q.Now(),
          updatedAt: q.Now(),
        },
      })

      try {
        const session = await faunaClient.query<{
          data: SessionData
          ref: { id: string }
        }>(FQL)

        return { ...session.data, id: session.ref.id }
      } catch (error) {
        errorLogger('CREATE_SESSION_ERROR', error)
        return Promise.reject(new Error('CREATE_SESSION_ERROR'))
      }
    }

    async function getSession(sessionToken: string) {
      _debug('getSession', sessionToken)

      try {
        const sessionFQL = q.Get(
          q.Match(q.Index(indexes.Session), sessionToken)
        )

        const session = await faunaClient.query<Session>({
          id: q.Select(['ref', 'id'], sessionFQL),
          userId: q.Select(['data', 'userId'], sessionFQL),
          expires: q.ToMillis(q.Select(['data', 'expires'], sessionFQL)),
          sessionToken: q.Select(['data', 'sessionToken'], sessionFQL),
          accessToken: q.Select(['data', 'accessToken'], sessionFQL),
          createdAt: q.ToMillis(q.Select(['data', 'createdAt'], sessionFQL)),
          updatedAt: q.ToMillis(q.Select(['data', 'updatedAt'], sessionFQL)),
        })

        // Check session has not expired (do not return it if it has)
        if (session && session.expires && new Date() > session.expires) {
          await _deleteSession(sessionToken)
          return null
        }

        return session
      } catch (error) {
        errorLogger('GET_SESSION_ERROR', error)
        return Promise.reject(new Error('GET_SESSION_ERROR'))
      }
    }

    async function updateSession(
      session: Session,
      force: boolean
    ): Promise<Session | null> {
      _debug('updateSession', session)

      try {
        const shouldUpdate =
          sessionMaxAge &&
          (sessionUpdateAge || sessionUpdateAge === 0) &&
          session.expires
        if (!shouldUpdate && !force) {
          return null
        }

        // Calculate last updated date, to throttle write updates to database
        // Formula: ({expiry date} - sessionMaxAge) + sessionUpdateAge
        //     e.g. ({expiry date} - 30 days) + 1 hour
        //
        // Default for sessionMaxAge is 30 days.
        // Default for sessionUpdateAge is 1 hour.
        const dateSessionIsDueToBeUpdated = new Date(session.expires)
        dateSessionIsDueToBeUpdated.setTime(
          dateSessionIsDueToBeUpdated.getTime() - sessionMaxAge
        )
        dateSessionIsDueToBeUpdated.setTime(
          dateSessionIsDueToBeUpdated.getTime() + sessionUpdateAge
        )

        // Trigger update of session expiry date and write to database, only
        // if the session was last updated more than {sessionUpdateAge} ago
        const currentDate = new Date()
        if (currentDate < dateSessionIsDueToBeUpdated && !force) {
          return null
        }

        const newExpiryDate = new Date()
        newExpiryDate.setTime(newExpiryDate.getTime() + sessionMaxAge)

        const updatedSession = await faunaClient.query<{
          data: SessionData
          ref: { id: string }
        }>(
          q.Update(q.Ref(q.Collection(collections.Session), session.id), {
            data: {
              expires: q.Time(newExpiryDate.toISOString()),
              updatedAt: q.Time(new Date().toISOString()),
            },
          })
        )

        return { ...updatedSession.data, id: updatedSession.ref.id }
      } catch (error) {
        errorLogger('UPDATE_SESSION_ERROR', error)
        return Promise.reject(new Error('UPDATE_SESSION_ERROR'))
      }
    }

    async function _deleteSession(sessionToken: string) {
      const FQL = q.Delete(
        q.Select('ref', q.Get(q.Match(q.Index(indexes.Session), sessionToken)))
      )

      await faunaClient.query<{ data: SessionData; ref: { id: string } }>(FQL)
    }

    async function deleteSession(sessionToken: string): Promise<void> {
      _debug('deleteSession', sessionToken)

      try {
        return await _deleteSession(sessionToken)
      } catch (error) {
        errorLogger('DELETE_SESSION_ERROR', error)
        return Promise.reject(new Error('DELETE_SESSION_ERROR'))
      }
    }

    async function createVerificationRequest(
      identifier: string,
      url: string,
      token: string,
      secret: string,
      provider: EmailSessionProvider
    ) {
      _debug('createVerificationRequest', identifier)

      const { baseUrl } = appOptions
      const { sendVerificationRequest, maxAge } = provider

      // Store hashed token (using secret as salt) so that tokens cannot be exploited
      // even if the contents of the database is compromised
      // @TODO Use bcrypt function here instead of simple salted hash
      const hashedToken = createHash('sha256')
        .update(`${token}${secret}`)
        .digest('hex')

      let expires = null
      if (maxAge) {
        const dateExpires = new Date()
        dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)

        expires = dateExpires.toISOString()
      }

      const FQL = q.Create(q.Collection(collections.VerificationRequest), {
        data: {
          identifier: identifier,
          token: hashedToken,
          expires: expires === null ? null : q.Time(expires),
          createdAt: q.Now(),
          updatedAt: q.Now(),
        },
      })

      try {
        const verificationRequest = await faunaClient.query<{
          data: VerificationRequestData
          ref: { id: string }
        }>(FQL)

        // With the verificationCallback on a provider, you can send an email, or queue
        // an email to be sent, or perform some other action (e.g. send a text message)
        await sendVerificationRequest({
          identifier,
          url,
          token,
          baseUrl: baseUrl || '',
          provider,
        })

        return verificationRequest.data
      } catch (error) {
        errorLogger('CREATE_VERIFICATION_REQUEST_ERROR', error)
        return Promise.reject(new Error('CREATE_VERIFICATION_REQUEST_ERROR'))
      }
    }

    async function getVerificationRequest(
      identifier: string,
      token: string,
      secret: string,
      provider: SessionProvider
    ) {
      _debug('getVerificationRequest', identifier, token)

      const hashedToken = createHash('sha256')
        .update(`${token}${secret}`)
        .digest('hex')
      const FQL = q.Let(
        {
          ref: q.Match(q.Index(indexes.VerificationRequest), hashedToken),
        },
        q.If(
          q.Exists(q.Var('ref')),
          {
            ref: q.Var('ref'),
            request: q.Select('data', q.Get(q.Var('ref'))),
          },
          null
        )
      )

      try {
        const { ref, request: verificationRequest } = await faunaClient.query<{
          ref: { id: string }
          request: VerificationRequestData
        }>(FQL)
        const nowDate = new Date()

        if (
          verificationRequest &&
          verificationRequest.expires &&
          verificationRequest.expires < nowDate
        ) {
          // Delete the expired request so it cannot be used
          await faunaClient.query(q.Delete(ref))

          return null
        }

        return verificationRequest
      } catch (error) {
        errorLogger('GET_VERIFICATION_REQUEST_ERROR', error)
        return Promise.reject(new Error('GET_VERIFICATION_REQUEST_ERROR'))
      }
    }

    async function deleteVerificationRequest(
      identifier: string,
      token: string,
      secret: string,
      provider: unknown
    ) {
      _debug('deleteVerification', identifier, token)

      const hashedToken = createHash('sha256')
        .update(`${token}${secret}`)
        .digest('hex')
      const FQL = q.Delete(
        q.Select(
          'ref',
          q.Get(q.Match(q.Index(indexes.VerificationRequest), hashedToken))
        )
      )

      try {
        await faunaClient.query(FQL)
      } catch (error) {
        errorLogger('DELETE_VERIFICATION_REQUEST_ERROR', error)
        return Promise.reject(new Error('DELETE_VERIFICATION_REQUEST_ERROR'))
      }
    }

    return {
      createUser,
      getUser,
      getUserByEmail,
      getUserByProviderAccountId,
      updateUser,
      deleteUser,
      linkAccount,
      unlinkAccount,
      createSession,
      getSession,
      updateSession,
      deleteSession,
      createVerificationRequest,
      getVerificationRequest,
      deleteVerificationRequest,
    } as AdapterInstance<User, Profile, Session, VerificationRequestData>
  }

  return {
    getAdapter,
  }
}

export default FaunaAdapter
