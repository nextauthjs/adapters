import { query as q } from 'faunadb'
import { createHash, randomBytes } from 'crypto'

const Adapter = (config, options = {}) => {
  const {
    faunaClient,
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

  async function getAdapter(appOptions) {
    function _debug(debugCode, ...args) {
      // console.info(`fauna_${debugCode}`, ...args)
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

    async function createUser(profile) {
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
        const newUser = await faunaClient.query(FQL)
        newUser.data.id = newUser.ref.id

        return newUser.data
      } catch (error) {
        console.error('CREATE_USER', error)
        return Promise.reject(new Error('CREATE_USER'))
      }
    }

    async function getUser(id) {
      _debug('getUser', id)

      const FQL = q.Get(q.Ref(q.Collection(collections.User), id))

      try {
        const user = await faunaClient.query(FQL)
        user.data.id = user.ref.id

        return user.data
      } catch (error) {
        console.error('GET_USER', error)
        return Promise.reject(new Error('GET_USER'))
      }
    }

    async function getUserByEmail(email) {
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
        const user = await faunaClient.query(FQL)

        if (user == null) {
          return null
        }

        user.data.id = user.ref.id
        return user.data
      } catch (error) {
        console.error('GET_USER_BY_EMAIL', error)
        return Promise.reject(new Error('GET_USER_BY_EMAIL'))
      }
    }

    async function getUserByProviderAccountId(providerId, providerAccountId) {
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
        const user = await faunaClient.query(FQL)

        if (user == null) {
          return null
        }

        user.data.id = user.ref.id

        return user.data
      } catch (error) {
        console.error('GET_USER_BY_PROVIDER_ACCOUNT_ID', error)
        return Promise.reject(new Error('GET_USER_BY_PROVIDER_ACCOUNT_ID'))
      }
    }

    async function updateUser(user) {
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
        const user = await faunaClient.query(FQL)
        user.data.id = user.ref.id

        return user.data
      } catch (error) {
        console.error('UPDATE_USER_ERROR', error)
        return Promise.reject(new Error('UPDATE_USER_ERROR'))
      }
    }

    async function deleteUser(userId) {
      _debug('deleteUser', userId)

      const FQL = q.Delete(q.Ref(q.Collection(collections.User), userId))

      try {
        await faunaClient.query(FQL)
      } catch (error) {
        console.error('DELETE_USER_ERROR', error)
        return Promise.reject(new Error('DELETE_USER_ERROR'))
      }
    }

    async function linkAccount(
      userId,
      providerId,
      providerType,
      providerAccountId,
      refreshToken,
      accessToken,
      accessTokenExpires
    ) {
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
        const account = await faunaClient.query(
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

        return account.data
      } catch (error) {
        console.error('LINK_ACCOUNT_ERROR', error)
        return Promise.reject(new Error('LINK_ACCOUNT_ERROR'))
      }
    }

    async function unlinkAccount(userId, providerId, providerAccountId) {
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
        console.error('UNLINK_ACCOUNT_ERROR', error)
        return Promise.reject(new Error('UNLINK_ACCOUNT_ERROR'))
      }
    }

    async function createSession(user) {
      _debug('createSession', user)

      let expires = null
      if (sessionMaxAge) {
        const dateExpires = new Date()
        dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
        expires = dateExpires.toISOString()
      }

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
        const session = await faunaClient.query(FQL)

        session.data.id = session.ref.id

        return session.data
      } catch (error) {
        console.error('CREATE_SESSION_ERROR', error)
        return Promise.reject(new Error('CREATE_SESSION_ERROR'))
      }
    }

    async function getSession(sessionToken) {
      _debug('getSession', sessionToken)

      try {
        var sessionFQL = q.Get(q.Match(q.Index(indexes.Session), sessionToken))

        const session = await faunaClient.query({
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
        console.error('GET_SESSION_ERROR', error)
        return Promise.reject(new Error('GET_SESSION_ERROR'))
      }
    }

    async function updateSession(session, force) {
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

        const updatedSession = await faunaClient.query(
          q.Update(q.Ref(q.Collection(collections.Session), session.id), {
            data: {
              expires: q.Time(newExpiryDate.toISOString()),
              updatedAt: q.Time(new Date().toISOString()),
            },
          })
        )

        updatedSession.data.id = updatedSession.ref.id

        return updatedSession.data
      } catch (error) {
        console.error('UPDATE_SESSION_ERROR', error)
        return Promise.reject(new Error('UPDATE_SESSION_ERROR'))
      }
    }

    async function _deleteSession(sessionToken) {
      const FQL = q.Delete(
        q.Select('ref', q.Get(q.Match(q.Index(indexes.Session), sessionToken)))
      )

      return faunaClient.query(FQL)
    }

    async function deleteSession(sessionToken) {
      _debug('deleteSession', sessionToken)

      try {
        return await _deleteSession(sessionToken)
      } catch (error) {
        console.error('DELETE_SESSION_ERROR', error)
        return Promise.reject(new Error('DELETE_SESSION_ERROR'))
      }
    }

    async function createVerificationRequest(
      identifier,
      url,
      token,
      secret,
      provider
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
        const verificationRequest = await faunaClient.query(FQL)

        // With the verificationCallback on a provider, you can send an email, or queue
        // an email to be sent, or perform some other action (e.g. send a text message)
        await sendVerificationRequest({
          identifier,
          url,
          token,
          baseUrl,
          provider,
        })

        return verificationRequest.data
      } catch (error) {
        console.error('CREATE_VERIFICATION_REQUEST_ERROR', error)
        return Promise.reject(new Error('CREATE_VERIFICATION_REQUEST_ERROR'))
      }
    }

    async function getVerificationRequest(identifier, token, secret, provider) {
      _debug('getVerificationRequest', identifier, token)

      const hashedToken = createHash('sha256')
        .update(`${token}${secret}`)
        .digest('hex')
      const FQL = q.Let(
        {
          ref: q.Match(q.Index(indexes.VerificationRequest), [
            hashedToken,
            identifier,
          ]),
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
        const { ref, request: verificationRequest } = await faunaClient.query(
          FQL
        )
        const nowDate = Date.now()

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
        console.error('GET_VERIFICATION_REQUEST_ERROR', error)
        return Promise.reject(new Error('GET_VERIFICATION_REQUEST_ERROR'))
      }
    }

    async function deleteVerificationRequest(
      identifier,
      token,
      secret,
      provider
    ) {
      _debug('deleteVerification', identifier, token)

      const hashedToken = createHash('sha256')
        .update(`${token}${secret}`)
        .digest('hex')
      const FQL = q.Delete(
        q.Select(
          'ref',
          q.Get(
            q.Match(q.Index(indexes.VerificationRequest), [
              hashedToken,
              identifier,
            ])
          )
        )
      )

      try {
        await faunaClient.query(FQL)
      } catch (error) {
        console.error('DELETE_VERIFICATION_REQUEST_ERROR', error)
        return Promise.reject(new Error('DELETE_VERIFICATION_REQUEST_ERROR'))
      }
    }

    return Promise.resolve({
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
    })
  }

  return {
    getAdapter,
  }
}

export default {
  Adapter,
}
