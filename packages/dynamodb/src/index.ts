import { randomBytes } from "crypto"
import type { Adapter } from "next-auth/adapters"

export function DynamoDBAdapter(
  client: any,
  options?: { tableName: string }
): Adapter {
  const TableName = options?.tableName ?? "next-auth"

  return {
    async createUser(profile: any) {
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
        item.GSI1PK = `USER#${profile.email as string}`
        item.GSI1SK = `USER#${profile.email as string}`
      }

      await client.put({ TableName, Item: item }).promise()
      return item
    },
    async getUser(userId) {
      const data = await client
        .get({
          TableName,
          Key: {
            pk: `USER#${userId}`,
            sk: `USER#${userId}`,
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
    async getUserByAccount({ provider, providerAccountId }) {
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
            ":gsi1pk": `ACCOUNT#${provider}`,
            ":gsi1sk": `ACCOUNT#${providerAccountId}`,
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
      let updateExpression = "set"
      const ExpressionAttributeNames: any = {}
      const ExpressionAttributeValues: any = {}
      for (const property in user) {
        updateExpression += ` #${property} = :${property},`
        ExpressionAttributeNames["#" + property] = property
        ExpressionAttributeValues[":" + property] = user[property]
      }

      updateExpression = updateExpression.slice(0, -1)

      const data = await client
        .update({
          TableName,
          Key: {
            pk: `USER#${user.id as string}`,
            sk: `USER#${user.id as string}`,
          },
          UpdateExpression: updateExpression,
          ExpressionAttributeNames: ExpressionAttributeNames,
          ExpressionAttributeValues: ExpressionAttributeValues,
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

      // TODO delete sessions and accounts

      return deleted
    },
    async linkAccount(data) {
      const now = new Date()

      const item = {
        pk: `USER#${data.userId}`,
        sk: `ACCOUNT#${data.provider}#${data.providerAccountId}`,
        GSI1PK: `ACCOUNT#${data.provider}`,
        GSI1SK: `ACCOUNT#${data.providerAccountId}`,
        userId: data.userId,
        provider: data.provider,
        providerAccountId: data.providerAccountId,
        type: data.type,
        accessToken: data.access_token,
        expiresAt: data.expires_at,
        idToken: data.id_token,
        oauthToken: data.oauth_token,
        oauthTokenSecret: data.oauth_token_secret,
        refreshToken: data.refresh_token,
        tokenType: data.token_type,
        scope: data.scope,
        sessionState: data.session_state,
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await client.put({ TableName, Item: item }).promise()
      return item as any
    },
    async unlinkAccount({ provider, providerAccountId }) {
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
            ":gsi1pk": `ACCOUNT#${provider}`,
            ":gsi1sk": `ACCOUNT#${providerAccountId}`,
          },
        })
        .promise()

      const deleted = await client
        .delete({
          TableName,
          Key: {
            pk: `USER#${data.Items[0].userId as string}`,
            sk: `ACCOUNT#${provider}#${providerAccountId}`,
          },
        })
        .promise()

      return deleted
    },
    async getSessionAndUser(sessionToken) {
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

      if (!session || (session?.expires && new Date() > session.expires)) {
        return null
      }

      let user = await client
        .get({
          TableName,
          Key: {
            pk: `USER#${session.userId as string}`,
            sk: `USER#${session.userId as string}`,
          },
        })
        .promise()

      user = user.Item || null

      if (!user) return null

      return { user, session }
    },
    async createSession({ sessionToken, userId, expires }) {
      const now = new Date()

      const item = {
        pk: `USER#${userId}`,
        sk: `SESSION#${sessionToken}`,
        GSI1SK: `SESSION#${sessionToken}`,
        GSI1PK: `SESSION#${sessionToken}`,
        sessionToken,
        type: "SESSION",
        userId,
        expires: expires.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await client.put({ TableName, Item: item }).promise()
      return item as any
    },
    async updateSession({ sessionToken, expires }) {
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

      const session = data.Items[0]

      return client
        .update({
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
            ":expires": (expires as Date).toISOString(),
            ":updatedAt": new Date().toISOString(),
          },
          ReturnValues: "UPDATED_NEW",
        })
        .promise()
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
    async createVerificationToken({ identifier, expires, token }) {
      const now = new Date()

      const item = {
        pk: `VR#${identifier}`,
        sk: `VR#${token}`,
        token,
        identifier,
        type: "VR",
        expires: expires.toISOString(),
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
      }

      await client.put({ TableName, Item: item }).promise()

      return { ...item, expires }
    },
    async useVerificationToken({ identifier, token }) {
      const data = await client
        .delete({
          TableName,
          Key: {
            pk: `VR#${identifier}`,
            sk: `VR#${token}`,
          },
          ReturnValues: "ALL_OLD",
        })
        .promise()

      return data
        ? { ...data.Attributes, expires: new Date(data.Attributes.expires) }
        : null
    },
  }
}
