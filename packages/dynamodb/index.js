import { createHash, randomBytes } from "crypto"

import {
  CreateSessionError,
  CreateUserError,
  CreateVerificationRequestError,
  DeleteSessionError,
  DeleteUserError,
  DeleteVerificationRequestError,
  GetSessionError,
  GetUserByEmailError,
  GetUserByIdError,
  GetUserByProviderAccountIdError,
  GetVerificationRequestError,
  LinkAccountError,
  UnlinkAccountError,
  UpdateSessionError,
  UpdateUserError,
} from "next-auth/errors"

export default function DynamoDBAdapter(config) {
  const TableName = config.tableName
  const DynamoClient = new config.AWS.DynamoDB.DocumentClient()

  /** @param {import("next-auth/internals").AppOptions} appOptions */
  async function getAdapter(appOptions) {
    const logger = appOptions.logger
    if (!config.AWS) {
      logger.error("CONFIG_ADAPTER", "AWS is not defined in adapter config")
      throw new Error("CONFIG_ADAPTER")
    }

    if (!config.tableName) {
      logger.error(
        "CONFIG_ADAPTER",
        "tableName is not defined in adapter config"
      )
      throw new Error("CONFIG_ADAPTER")
    }
    function debug(debugCode, ...args) {
      logger.debug(`DYNAMODB_${debugCode}`, ...args)
    }

    const defaultSessionMaxAge = 30 * 24 * 60 * 60 * 1000
    const sessionMaxAge = appOptions?.session?.maxAge
      ? appOptions.session.maxAge * 1000
      : defaultSessionMaxAge
    const sessionUpdateAge = appOptions?.session?.updateAge
      ? appOptions.session.updateAge * 1000
      : 0

    async function createUser(profile) {
      debug("createUser", profile)

      const userId = randomBytes(16).toString("hex")
      const now = new Date()
      const item = {
        pk: `USER#${userId}`,
        sk: `USER#${userId}`,
        id: userId,
        type: "USER",
        name: profile.name,
        email: profile.email,
        image: profile.image,
        username: profile.username,
        emailVerified: profile.emailVerified
          ? profile.emailVerified.toISOString()
          : null,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      if (profile.email) {
        item.GSI1SK = `USER#${profile.email}`
        item.GSI1PK = `USER#${profile.email}`
      }

      try {
        await DynamoClient.put({ TableName, Item: item }).promise()
        return item
      } catch (error) {
        logger.error("CREATE_USER", error)
        throw new CreateUserError(error)
      }
    }

    async function getUser(id) {
      debug("getUser", id)

      try {
        const data = await DynamoClient.get({
          TableName,
          Key: {
            pk: `USER#${id}`,
            sk: `USER#${id}`,
          },
        }).promise()

        return data.Item || null
      } catch (error) {
        logger.error("GET_USER", error)
        throw new GetUserByIdError(error)
      }
    }

    async function getUserByEmail(email) {
      debug("getUserByEmail", email)

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `USER#${email}`,
            ":gsi1sk": `USER#${email}`,
          },
        }).promise()

        return data.Items[0] || null
      } catch (error) {
        logger.error("GET_USER_BY_EMAIL", error)
        throw new GetUserByEmailError(error)
      }
    }

    async function getUserByProviderAccountId(providerId, providerAccountId) {
      debug("getUserByProviderAccountId", providerId, providerAccountId)

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `ACCOUNT#${providerAccountId}`,
            ":gsi1sk": `ACCOUNT#${providerId}`,
          },
        }).promise()

        if (!data) return null
        if (!data.Items.length > 0) return null

        const user = await DynamoClient.get({
          TableName,
          Key: {
            pk: `USER#${data.Items[0].userId}`,
            sk: `USER#${data.Items[0].userId}`,
          },
        }).promise()

        return user.Item || null
      } catch (error) {
        logger.error("GET_USER_BY_PROVIDER_ACCOUNT_ID", error)
        throw new GetUserByProviderAccountIdError(error)
      }
    }

    async function updateUser(user) {
      debug("updateUser", user)

      try {
        const now = new Date()
        const data = await DynamoClient.update({
          TableName,
          Key: {
            pk: user.pk,
            sk: user.sk,
          },
          UpdateExpression:
            "set #name = :name, #email = :email, #gsi1pk = :gsi1pk, #gsi1sk = :gsi1sk, #image = :image, #emailVerified = :emailVerified, #username = :username, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#name": "name",
            "#email": "email",
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
            "#image": "image",
            "#emailVerified": "emailVerified",
            "#username": "username",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":name": user.name || null,
            ":email": user.email,
            ":gsi1pk": `USER#${user.email}`,
            ":gsi1sk": `USER#${user.email}`,
            ":image": user.image || null,
            ":emailVerified": user.emailVerified?.toISOString() ?? null,
            ":username": user.username || null,
            ":updatedAt": now.toISOString(),
          },
          ReturnValues: "UPDATED_NEW",
        }).promise()

        return { ...user, ...data.Attributes }
      } catch (error) {
        logger.error("UPDATE_USER_ERROR", error)
        throw new UpdateUserError(error)
      }
    }

    async function deleteUser(userId) {
      debug("deleteUser", userId)

      try {
        const deleted = await DynamoClient.delete({
          TableName,
          Key: {
            pk: `USER#${userId}`,
            sk: `USER#${userId}`,
          },
        }).promise()

        return deleted
      } catch (error) {
        logger.error("DELETE_USER_ERROR", error)
        throw new DeleteUserError(error)
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
      debug(
        "linkAccount",
        userId,
        providerId,
        providerType,
        providerAccountId,
        refreshToken,
        accessToken,
        accessTokenExpires
      )

      const now = new Date()

      const item = {
        pk: `USER#${userId}`,
        sk: `ACCOUNT#${providerId}#${providerAccountId}`,
        GSI1SK: `ACCOUNT#${providerId}`,
        GSI1PK: `ACCOUNT#${providerAccountId}`,
        providerId,
        providerAccountId,
        providerType,
        refreshToken,
        accessToken,
        accessTokenExpires,
        type: "ACCOUNT",
        userId,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      try {
        await DynamoClient.put({ TableName, Item: item }).promise()
        return item
      } catch (error) {
        logger.error("LINK_ACCOUNT_ERROR", error)
        throw new LinkAccountError(error)
      }
    }

    async function unlinkAccount(userId, providerId, providerAccountId) {
      debug("unlinkAccount", userId, providerId, providerAccountId)

      try {
        const deleted = await DynamoClient.delete({
          TableName,
          Key: {
            pk: `USER#${userId}`,
            sk: `ACCOUNT#${providerId}#${providerAccountId}`,
          },
        }).promise()

        return deleted
      } catch (error) {
        logger.error("UNLINK_ACCOUNT_ERROR", error)
        throw new UnlinkAccountError(error)
      }
    }

    async function createSession(user) {
      debug("createSession", user)

      let expires = null
      if (sessionMaxAge) {
        const dateExpires = new Date()
        dateExpires.setTime(dateExpires.getTime() + sessionMaxAge)
        expires = dateExpires.toISOString()
      }

      const sessionToken = randomBytes(32).toString("hex")
      const accessToken = randomBytes(32).toString("hex")

      const now = new Date()

      const item = {
        pk: `USER#${user.id}`,
        sk: `SESSION#${sessionToken}`,
        GSI1SK: `SESSION#${sessionToken}`,
        GSI1PK: `SESSION#${sessionToken}`,
        sessionToken,
        accessToken,
        type: "SESSION",
        userId: user.id,
        expires,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      try {
        await DynamoClient.put({ TableName, Item: item }).promise()
        return item
      } catch (error) {
        logger.error("CREATE_SESSION_ERROR", error)
        throw new CreateSessionError(error)
      }
    }

    async function getSession(sessionToken) {
      debug("getSession", sessionToken)

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `SESSION#${sessionToken}`,
            ":gsi1sk": `SESSION#${sessionToken}`,
          },
        }).promise()

        const session = data.Items[0] || null

        if (session && session.expires && new Date() > session.expires) {
          await deleteSession(sessionToken)
          return null
        }

        return session
      } catch (error) {
        logger.error("GET_SESSION_ERROR", error)
        throw new GetSessionError(error)
      }
    }

    async function updateSession(session, force) {
      debug("updateSession", session)

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

        const data = await DynamoClient.update({
          TableName,
          Key: {
            pk: session.pk,
            sk: session.sk,
          },
          UpdateExpression: "set #expires = :expires, #updatedAt = :updatedAt",
          ExpressionAttributeNames: {
            "#expires": "expires",
            "#updatedAt": "updatedAt",
          },
          ExpressionAttributeValues: {
            ":expires": newExpiryDate.toISOString(),
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "UPDATED_NEW",
        }).promise()

        return {
          ...session,
          expires: data.Attributes.expires,
          updatedAt: data.Attributes.updatedAt,
        }
      } catch (error) {
        logger.error("UPDATE_SESSION_ERROR", error)
        throw new UpdateSessionError(error)
      }
    }

    async function deleteSession(sessionToken) {
      debug("deleteSession", sessionToken)

      try {
        const data = await DynamoClient.query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `SESSION#${sessionToken}`,
            ":gsi1sk": `SESSION#${sessionToken}`,
          },
        }).promise()

        if (data?.Items?.length <= 0) return null

        const infoToDelete = data.Items[0]

        const deleted = await DynamoClient.delete({
          TableName,
          Key: {
            pk: infoToDelete.pk,
            sk: infoToDelete.sk,
          },
        }).promise()

        return deleted
      } catch (error) {
        logger.error("DELETE_SESSION_ERROR", error)
        throw new DeleteSessionError(error)
      }
    }

    async function createVerificationRequest(
      identifier,
      url,
      token,
      secret,
      provider
    ) {
      debug(
        "createVerificationRequest",
        identifier,
        url,
        token,
        secret,
        provider
      )

      const { baseUrl } = appOptions
      const { sendVerificationRequest, maxAge } = provider

      const hashedToken = createHash("sha256")
        .update(`${token}${secret}`)
        .digest("hex")

      let expires = null
      if (maxAge) {
        const dateExpires = new Date()
        dateExpires.setTime(dateExpires.getTime() + maxAge * 1000)

        expires = dateExpires.toISOString()
      }

      const now = new Date()

      const item = {
        pk: `VR#${identifier}`,
        sk: `VR#${hashedToken}`,
        token: hashedToken,
        identifier,
        type: "VR",
        expires: expires === null ? null : expires,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      try {
        await DynamoClient.put({ TableName, Item: item }).promise()

        await sendVerificationRequest({
          identifier,
          url,
          token,
          baseUrl,
          provider,
        })

        return item
      } catch (error) {
        logger.error("CREATE_VERIFICATION_REQUEST_ERROR", error)
        throw new CreateVerificationRequestError(error)
      }
    }

    async function getVerificationRequest(identifier, token, secret, provider) {
      debug("getVerificationRequest", identifier, token, secret)

      const hashedToken = createHash("sha256")
        .update(`${token}${secret}`)
        .digest("hex")

      try {
        const data = await DynamoClient.get({
          TableName,
          Key: {
            pk: `VR#${identifier}`,
            sk: `VR#${hashedToken}`,
          },
        }).promise()

        const nowDate = Date.now()
        if (data.Item && data.Item.expires && data.Item.expires < nowDate) {
          // Delete the expired request so it cannot be used
          await DynamoClient.delete({
            TableName,
            Key: {
              pk: `VR#${identifier}`,
              sk: `VR#${hashedToken}`,
            },
          }).promise()

          return null
        }

        return data.Item || null
      } catch (error) {
        logger.error("GET_VERIFICATION_REQUEST_ERROR", error)
        throw new GetVerificationRequestError(error)
      }
    }

    async function deleteVerificationRequest(
      identifier,
      token,
      secret,
      provider
    ) {
      debug("deleteVerification", identifier, token, secret)

      const hashedToken = createHash("sha256")
        .update(`${token}${secret}`)
        .digest("hex")

      try {
        const data = await DynamoClient.delete({
          TableName,
          Key: {
            pk: `VR#${identifier}`,
            sk: `VR#${hashedToken}`,
          },
        }).promise()

        return data
      } catch (error) {
        logger.error("DELETE_VERIFICATION_REQUEST_ERROR", error)
        throw new DeleteVerificationRequestError(error)
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
    }
  }

  return {
    getAdapter,
  }
}
