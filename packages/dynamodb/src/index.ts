import { createHash, randomBytes } from "crypto"
import { Profile, Session, User } from "next-auth"
import { Adapter } from "next-auth/adapters"

export const DynamoDBAdapter: Adapter<
  any,
  {
    tableName: string
  },
  User & { emailVerified?: Date },
  Profile & { emailVerified?: Date },
  Session
> = (client, options) => {
  const TableName = options?.tableName ?? "next-auth"
  
  function secondsFromNow(milliseconds: number): number {
    return Math.round((Date.now() + milliseconds) / 1000);
  }

  return {
    async getAdapter({ logger, session, secret, ...appOptions }) {
      const sessionMaxAge = session.maxAge * 1000 // default is 30 days
      const sessionUpdateAge = session.updateAge * 1000 // default is 1 day

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token: string) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "DYNAMODB",
        async createUser(profile) {
          const userId = randomBytes(16).toString("hex")
          const now = new Date()
          const item: any = {
            pk: `USER#${userId}`,
            sk: `USER#${userId}`,
            id: userId,
            type: "USER",
            name: profile.name,
            email: profile.email,
            image: profile.image,
            username: profile.username,
            emailVerified: profile.emailVerified?.toISOString() ?? null,
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          }

          if (profile.email) {
            item.GSI1SK = `USER#${profile.email}`
            item.GSI1PK = `USER#${profile.email}`
          }

          await client.put({ TableName, Item: item }).promise()
          return item
        },
        async getUser(id) {
          const data = await client
            .get({
              TableName,
              Key: {
                pk: `USER#${id}`,
                sk: `USER#${id}`,
              },
            })
            .promise()

          return data.Item || null
        },
        async getUserByEmail(email) {
          const data = await client
            .query({
              TableName,
              IndexName: "GSI1",
              KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
              ExpressionAttributeNames: {
                "#gsi1pk": "GSI1PK",
                "#gsi1sk": "GSI1SK",
              },
              ExpressionAttributeValues: {
                ":gsi1pk": `USER#${email ?? ""}`,
                ":gsi1sk": `USER#${email ?? ""}`,
              },
            })
            .promise()

          return data.Items[0] || null
        },
        async getUserByProviderAccountId(providerId, providerAccountId) {
          const data = await client
            .query({
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
            })
            .promise()

          if (!data || !data.Items.length) return null

          const user = await client
            .get({
              TableName,
              Key: {
                pk: `USER#${data.Items[0].userId as string}`,
                sk: `USER#${data.Items[0].userId as string}`,
              },
            })
            .promise()

          return user.Item || null
        },
        async updateUser(user) {
          const now = new Date()
          const data = await client
            .update({
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
                ":name": user.name,
                ":email": user.email,
                ":gsi1pk": `USER#${user.email as string}`,
                ":gsi1sk": `USER#${user.email as string}`,
                ":image": user.image,
                ":emailVerified": user.emailVerified?.toISOString() ?? null,
                ":username": user.username,
                ":updatedAt": now.toISOString(),
              },
              ReturnValues: "UPDATED_NEW",
            })
            .promise()

          return { ...user, ...data.Attributes }
        },
        async deleteUser(userId) {
          const deleted = await client
            .delete({
              TableName,
              Key: {
                pk: `USER#${userId}`,
                sk: `USER#${userId}`,
              },
            })
            .promise()

          return deleted
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

          await client.put({ TableName, Item: item }).promise()
          return item as any
        },
        async unlinkAccount(userId, providerId, providerAccountId) {
          const deleted = await client
            .delete({
              TableName,
              Key: {
                pk: `USER#${userId}`,
                sk: `ACCOUNT#${providerId}#${providerAccountId}`,
              },
            })
            .promise()

          return deleted
        },
        async createSession(user) {
          let expires = null
          if (sessionMaxAge) {
            expires = secondsFromNow(sessionMaxAge);
          }

          const sessionToken = randomBytes(32).toString("hex")
          const accessToken = randomBytes(32).toString("hex")

          const now = new Date()

          const item = {
            pk: `USER#${user.id as string}`,
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

          await client.put({ TableName, Item: item }).promise()
          return item as any
        },
        async getSession(sessionToken) {
          const data = await client
            .query({
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
            })
            .promise()

          const session = data.Items[0] || null

          if (session?.expires && secondsFromNow(0) > session.expires) {
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

          // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
          // @ts-ignore
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

          const newExpiryDate = secondsFromNow(sessionMaxAge);

          const data = await client
            .update({
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
                ":expires": newExpiryDate,
                ":updatedAt": new Date().toISOString(),
              },
              ReturnValues: "UPDATED_NEW",
            })
            .promise()

          return {
            ...session,
            expires: data.Attributes.expires,
            updatedAt: data.Attributes.updatedAt,
          }
        },
        async deleteSession(sessionToken) {
          const data = await client
            .query({
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
            })
            .promise()

          if (data?.Items?.length <= 0) return null

          const infoToDelete = data.Items[0]

          const deleted = await client
            .delete({
              TableName,
              Key: {
                pk: infoToDelete.pk,
                sk: infoToDelete.sk,
              },
            })
            .promise()

          return deleted
        },
        async createVerificationRequest(identifier, url, token, _, provider) {
          const { baseUrl } = appOptions
          const { sendVerificationRequest, maxAge } = provider

          const hashedToken = hashToken(token)

          let expires = null
          if (maxAge) {
            expires = secondsFromNow(maxAge * 1000);
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

          await client.put({ TableName, Item: item }).promise()

          await sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl,
            provider,
          })

          return item as any
        },
        async getVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)

          const data = await client
            .get({
              TableName,
              Key: {
                pk: `VR#${identifier}`,
                sk: `VR#${hashedToken}`,
              },
            })
            .promise()

          if (data.Item?.expires && data.Item.expires < secondsFromNow(0)) {
            // Delete the expired request so it cannot be used
            await client
              .delete({
                TableName,
                Key: {
                  pk: `VR#${identifier}`,
                  sk: `VR#${hashedToken}`,
                },
              })
              .promise()

            return null
          }

          return data.Item || null
        },
        async deleteVerificationRequest(identifier, token) {
          // eslint-disable-next-line @typescript-eslint/return-await
          return await client
            .delete({
              TableName,
              Key: {
                pk: `VR#${identifier}`,
                sk: `VR#${hashToken(token)}`,
              },
            })
            .promise()
        },
      }
    },
  }
}
