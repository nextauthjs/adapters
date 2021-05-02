import { createHash, randomBytes } from "crypto"

/** @type {import("next-auth/adapters").Adapter} */
export function DynamoDBAdapter(config) {
  const TableName = config.tableName
  const DynamoClient = new config.AWS.DynamoDB.DocumentClient()

  return {
    async getAdapter({
      session: { updateAge, maxAge },
      secret,
      logger,
      ...appOptions
    }) {
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

      const sessionMaxAge = maxAge * 1000
      const sessionUpdateAge = updateAge * 1000

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      const deleteSession = async (sessionToken) => {
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
      }

      return {
        async createUser(profile) {
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

          await DynamoClient.put({ TableName, Item: item }).promise()
          return item
        },
        async getUser(id) {
          const data = await DynamoClient.get({
            TableName,
            Key: {
              pk: `USER#${id}`,
              sk: `USER#${id}`,
            },
          }).promise()

          return data.Item || null
        },
        async getUserByEmail(email) {
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
        },
        async getUserByProviderAccountId(providerId, providerAccountId) {
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

          if (!data?.Items.length) return null

          const user = await DynamoClient.get({
            TableName,
            Key: {
              pk: `USER#${data.Items[0].userId}`,
              sk: `USER#${data.Items[0].userId}`,
            },
          }).promise()

          return user.Item || null
        },
        async updateUser(user) {
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
        },
        deleteUser(userId) {
          return DynamoClient.delete({
            TableName,
            Key: {
              pk: `USER#${userId}`,
              sk: `USER#${userId}`,
            },
          }).promise()
        },
        async linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
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

          await DynamoClient.put({ TableName, Item: item }).promise()
          return item
        },
        unlinkAccount(userId, providerId, providerAccountId) {
          return DynamoClient.delete({
            TableName,
            Key: {
              pk: `USER#${userId}`,
              sk: `ACCOUNT#${providerId}#${providerAccountId}`,
            },
          }).promise()
        },
        async createSession(user) {
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

          await DynamoClient.put({ TableName, Item: item }).promise()
          return item
        },
        async getSession(sessionToken) {
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

          if (session?.expires && new Date() > session.expires) {
            await deleteSession(sessionToken)
            return null
          }

          return session
        },
        async updateSession(session, force) {
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
            UpdateExpression:
              "set #expires = :expires, #updatedAt = :updatedAt",
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
        },
        deleteSession,
        async createVerificationRequest(identifier, url, token, _, provider) {
          const { sendVerificationRequest, maxAge } = provider

          const hashedToken = hashToken(token)

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
            expires,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          }

          await DynamoClient.put({ TableName, Item: item }).promise()

          await sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })

          return item
        },
        async getVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)

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
        },
        deleteVerificationRequest(identifier, token) {
          return DynamoClient.delete({
            TableName,
            Key: {
              pk: `VR#${identifier}`,
              sk: `VR#${hashToken(token)}`,
            },
          }).promise()
        },
      }
    },
  }
}
