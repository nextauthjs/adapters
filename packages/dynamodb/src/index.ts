import { BatchWriteCommandInput, DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import { randomBytes } from "crypto"
import { Account, User } from "next-auth"
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"

// internal interfaces for data as is it saved in dynamodb
// adds some dynamodb specific types such as index keys (pk, sk, GSI1PK, GSI1SK)
// and changes date types to number for expires property (epoch time saved in seconds) or string (IsoString for emailVerfied prop)
interface AdapterSessionDynamo {
  pk: string
  sk: string
  id: string
  /** A randomly generated value that is used to get hold of the session. */
  sessionToken: string
  /** Used to connect the session to a particular user */
  userId: string
  /** This property can be used to set up dynamodb TTL function see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html for more information */
  expires: number
  GSI1PK?: string
  GSI1SK?: string
  type: "SESSION"
}
interface VerificationTokenDynamo {
  pk: string
  sk: string
  identifier: string
  /** This property can be used to set up dynamodb TTL function see https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html for more information */
  expires: number
  token: string
  type: "VR"
}

interface AdapterUserDynamo extends User {
  pk: string
  sk: string
  id: string
  emailVerified: string | null
  GSI1PK?: string
  GSI1SK?: string
  type: "USER"
  email: string
}

export function DynamoDBAdapter(
  client: DynamoDBDocument,
  options?: { tableName: string }
): Adapter {
  const TableName = options?.tableName ?? "next-auth"

  return {
    async createUser(user) {
      const userId = randomBytes(16).toString("hex")
      let emailVerified: string | null = null
      if (user.emailVerified instanceof Date) {
        emailVerified = user.emailVerified.toISOString()
      }
      const item: AdapterUserDynamo = {
        ...user,
        pk: `USER#${userId}`,
        sk: `USER#${userId}`,
        id: userId,
        type: "USER",
        email: user.email as string,
        emailVerified,
      }

      if (item.email) {
        item.GSI1PK = `USER#${item.email}`
        item.GSI1SK = `USER#${item.email}`
      }

      await client.put({ TableName, Item: item })
      return unMarshallAdapterUserDynamo(item)
    },
    async getUser(userId) {
      const data = await client.get({
        TableName,
        Key: {
          pk: `USER#${userId}`,
          sk: `USER#${userId}`,
        },
      })
      const adapterUserDynamo = data.Item as AdapterUserDynamo
      return adapterUserDynamo
        ? unMarshallAdapterUserDynamo(adapterUserDynamo)
        : null
    },
    async getUserByEmail(email) {
      const data = await client.query({
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
      if (!data.Items) {
        return null
      }
      const adapterUserDynamo = data.Items[0] as AdapterUserDynamo
      return adapterUserDynamo
        ? unMarshallAdapterUserDynamo(adapterUserDynamo)
        : null
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const data = await client.query({
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
      if (!data || !data.Items || !data.Items.length) return null
      const accounts = data.Items[0] as Account
      const res = await client.get({
        TableName,
        Key: {
          pk: `USER#${accounts.userId}`,
          sk: `USER#${accounts.userId}`,
        },
      })
      const user = res.Item as AdapterUserDynamo
      return user ? unMarshallAdapterUserDynamo(user) : null
    },
    async updateUser(user) {
      let updateExpression = "set"
      const ExpressionAttributeNames: Record<string, string> = {}
      const ExpressionAttributeValues: Record<string, unknown> = {}
      for (const property in user) {
        updateExpression += ` #${property} = :${property},`
        ExpressionAttributeNames["#" + property] = property
        ExpressionAttributeValues[":" + property] = user[property]
      }
      updateExpression = updateExpression.slice(0, -1)

      const data = await client.update({
        TableName,
        Key: {
          // next-auth type is incorrect it should be Partial<AdapterUser> & {id: string} instead of just Partial<AdapterUser>
          pk: `USER#${user.id as string}`,
          sk: `USER#${user.id as string}`,
        },
        UpdateExpression: updateExpression,
        ExpressionAttributeNames: ExpressionAttributeNames,
        ExpressionAttributeValues: ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
      const attributesDynamo = data.Attributes as AdapterUserDynamo
      const attributes = unMarshallAdapterUserDynamo(attributesDynamo)
      return attributes
    },
    async deleteUser(userId) {
      // query all the items related to the user to delete
      const resQuery = await client.query({
        TableName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": "pk" },
        ExpressionAttributeValues: { ":pk": `USER#${userId}` },
      })
      if (!resQuery.Items) {
        return null
      }
      const items = resQuery.Items as Array<
        AdapterUserDynamo | AdapterSessionDynamo
      >
      // find the user we want to delete to return at the end of the function call
      const user = items.find((item) => item.type === "USER") as
        | AdapterUserDynamo
        | undefined
      const itemsToDelete = items.map((item) => {
        return {
          DeleteRequest: {
            Key: {
              sk: item.sk,
              pk: item.pk,
            },
          },
        }
      })
      // batch write commands cannot handle more than 25 requests at once
      const itemsToDeleteMax = itemsToDelete.slice(0, 25)
      const param: BatchWriteCommandInput = {
        RequestItems: { [TableName]: itemsToDeleteMax },
      }
      await client.batchWrite(param)
      return user ? unMarshallAdapterUserDynamo(user) : null
    },
    async linkAccount(data) {
      const item: Account = {
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
      }

      await client.put({ TableName, Item: item })
      return item
    },
    async unlinkAccount({
      provider,
      providerAccountId,
    }): Promise<Account | undefined> {
      const data = await client.query({
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
      if (!data.Items) {
        return undefined
      }
      const account = data.Items[0] as Account
      const deleted = await client.delete({
        TableName,
        Key: {
          pk: `USER#${account.userId}`,
          sk: `ACCOUNT#${provider}#${providerAccountId}`,
        },
        ReturnValues: "ALL_OLD",
      })
      const deletedAccount = deleted.Attributes as Account
      return deletedAccount
    },
    async getSessionAndUser(sessionToken) {
      const data = await client.query({
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
      if (!data.Items) {
        return null
      }
      const dynamoSession = (data.Items[0] as AdapterSessionDynamo) || null
      const session = dynamoSession
        ? unMarshallAdapterSession(dynamoSession)
        : null
      if (!session || (session?.expires && new Date() > session.expires)) {
        return null
      }
      const res = await client.get({
        TableName,
        Key: {
          pk: `USER#${session.userId}`,
          sk: `USER#${session.userId}`,
        },
      })
      const userDynamo = (res.Item as AdapterUserDynamo) || null
      if (!userDynamo) return null
      const user = unMarshallAdapterUserDynamo(userDynamo)
      return { user, session }
    },
    async createSession({ sessionToken, userId, expires }) {
      const item: AdapterSessionDynamo = {
        id: `SESSION#${sessionToken}`,
        pk: `USER#${userId}`,
        sk: `SESSION#${sessionToken}`,
        GSI1SK: `SESSION#${sessionToken}`,
        GSI1PK: `SESSION#${sessionToken}`,
        sessionToken,
        type: "SESSION",
        userId,
        expires: expires.getTime() / 1000,
      }

      await client.put({ TableName, Item: item })
      return unMarshallAdapterSession(item)
    },
    async updateSession({ sessionToken, expires }) {
      const data = await client.query({
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
      if (!data.Items) {
        return null
      }
      const session = data.Items[0]

      const res = await client.update({
        TableName,
        Key: {
          pk: session.pk,
          sk: session.sk,
        },
        UpdateExpression: "set #expires = :expires",
        ExpressionAttributeNames: {
          "#expires": "expires",
        },
        ExpressionAttributeValues: {
          ":expires": expires ? expires.getTime() / 1000 : undefined,
        },
        ReturnValues: "ALL_NEW",
      })
      const updatedSession = res.Attributes as AdapterSessionDynamo
      return updatedSession ? unMarshallAdapterSession(updatedSession) : null
    },
    async deleteSession(sessionToken) {
      const data = await client.query({
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
      if (!data.Items || data?.Items?.length <= 0) return null

      const infoToDelete = data.Items[0]

      const res = await client.delete({
        TableName,
        Key: {
          pk: infoToDelete.pk,
          sk: infoToDelete.sk,
        },
        ReturnValues: "ALL_OLD",
      })
      const session = res.Attributes as AdapterSessionDynamo
      return session ? unMarshallAdapterSession(session) : null
    },
    async createVerificationToken(verificationToken) {
      const { identifier, expires, token } = verificationToken
      const item: VerificationTokenDynamo = {
        pk: `VR#${identifier}`,
        sk: `VR#${token}`,
        token,
        identifier,
        type: "VR",
        expires: expires.getTime() / 1000,
      }
      await client.put({ TableName, Item: item })
      return unMarshallVerificationToken(item)
    },
    async useVerificationToken({ identifier, token }) {
      const data = await client.delete({
        TableName,
        Key: {
          pk: `VR#${identifier}`,
          sk: `VR#${token}`,
        },
        ReturnValues: "ALL_OLD",
      })
      const attributes = data.Attributes as VerificationTokenDynamo
      return attributes ? unMarshallVerificationToken(attributes) : null
    },
  }
}
// these functions are used to remove dynamodb specific properties
// and to transform back date strings into Date javascript objects
// the unused vars are only there so that the ...rest object does not contain those dynamodb internal properties
const unMarshallAdapterSession = (
  session: AdapterSessionDynamo
): AdapterSession => {
  const { pk, sk, GSI1PK, GSI1SK, type, ...rest } = session
  return {
    ...rest,
    expires: new Date(session.expires * 1000),
  }
}

const unMarshallVerificationToken = (
  verificationToken: VerificationTokenDynamo
): VerificationToken => {
  const { pk, sk, type, ...rest } = verificationToken
  return {
    ...rest,
    expires: new Date(verificationToken.expires * 1000),
  }
}

const unMarshallAdapterUserDynamo = (
  adapterUser: AdapterUserDynamo
): AdapterUser => {
  const { pk, sk, GSI1PK, GSI1SK, type, ...rest } = adapterUser
  return {
    ...rest,
    emailVerified: adapterUser.emailVerified
      ? new Date(adapterUser.emailVerified)
      : null,
  }
}
