import { randomBytes } from "crypto"
import type {
  BatchWriteCommandInput,
  DynamoDBDocument,
} from "@aws-sdk/lib-dynamodb"
import type { Account } from "next-auth"
import type {
  Adapter,
  AdapterSession,
  AdapterUser,
  VerificationToken,
} from "next-auth/adapters"

export type Dynamo<Model> = Model & {
  pk: string
  sk: string
  GSI1PK?: string
  GSI1SK?: string
  type: "USER" | "SESSION" | "VR"
}

export function DynamoDBAdapter(
  client: DynamoDBDocument,
  options?: { tableName: string }
): Adapter {
  const TableName = options?.tableName ?? "next-auth"

  return {
    async createUser(user) {
      const userId = randomBytes(16).toString("hex")
      const item = format.to({
        ...user,
        pk: `USER#${userId}`,
        sk: `USER#${userId}`,
        id: userId,
        type: "USER",
      })

      if (user.email && typeof user.email === "string") {
        item.GSI1PK = `USER#${user.email}`
        item.GSI1SK = `USER#${user.email}`
      }

      await client.put({ TableName, Item: format.to(item) })
      return format.from<AdapterUser>(item)
    },
    async getUser(userId) {
      const data = await client.get({
        TableName,
        Key: {
          pk: `USER#${userId}`,
          sk: `USER#${userId}`,
        },
      })
      const adapterUserDynamo = data.Item
      return adapterUserDynamo
        ? format.from<AdapterUser>(adapterUserDynamo)
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
      const adapterUserDynamo = data.Items[0]
      return adapterUserDynamo
        ? format.from<AdapterUser>(adapterUserDynamo)
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
      const user = res.Item
      return user ? format.from<AdapterUser>(user) : null
    },
    async updateUser(user) {
      const {
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = generateUpdateExpression(user)
      const data = await client.update({
        TableName,
        Key: {
          // next-auth type is incorrect it should be Partial<AdapterUser> & {id: string} instead of just Partial<AdapterUser>
          pk: `USER#${user.id as string}`,
          sk: `USER#${user.id as string}`,
        },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
      const attributesDynamo = data.Attributes as Dynamo<AdapterUser>
      return format.from<AdapterUser>(attributesDynamo)
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
      const items = resQuery.Items
      // find the user we want to delete to return at the end of the function call
      const user = items.find((item) => item.type === "USER")
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
      return user ? format.from<AdapterUser>(user) : null
    },
    async linkAccount(data) {
      const item = {
        ...data,
        id: randomBytes(16).toString("hex"),
        pk: `USER#${data.userId}`,
        sk: `ACCOUNT#${data.provider}#${data.providerAccountId}`,
        GSI1PK: `ACCOUNT#${data.provider}`,
        GSI1SK: `ACCOUNT#${data.providerAccountId}`,
      }
      await client.put({ TableName, Item: format.to(item) })
      return data
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
      const deletedAccount = format.from<Account>(
        deleted.Attributes as Dynamo<Account>
      )
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
      const dynamoSession = data.Items[0] || null
      const session = dynamoSession
        ? format.from<AdapterSession>(dynamoSession)
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
      const userDynamo = res.Item ?? null
      if (!userDynamo) return null
      const user = format.from<AdapterUser>(userDynamo)
      return { user, session }
    },
    async createSession({ sessionToken, userId, expires }) {
      const item: Dynamo<AdapterSession> = {
        id: `SESSION#${sessionToken}`,
        pk: `USER#${userId}`,
        sk: `SESSION#${sessionToken}`,
        GSI1SK: `SESSION#${sessionToken}`,
        GSI1PK: `SESSION#${sessionToken}`,
        sessionToken,
        type: "SESSION",
        userId,
        expires,
      }
      await client.put({ TableName, Item: format.to(item) })
      return format.from<AdapterSession>(item)
    },
    async updateSession(session) {
      const sessionToken = session.sessionToken
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
      const { pk, sk } = data.Items[0] as Dynamo<AdapterSession>
      const {
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = generateUpdateExpression(session)
      const res = await client.update({
        TableName,
        Key: {
          // next-auth type is incorrect it should be Partial<AdapterUser> & {id: string} instead of just Partial<AdapterUser>
          pk,
          sk,
        },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
      const updatedSession = res.Attributes
      return updatedSession ? format.from<AdapterSession>(updatedSession) : null
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
      const session = res.Attributes
      return session ? format.from<AdapterSession>(session) : null
    },
    async createVerificationToken(verificationToken) {
      const { identifier, expires, token } = verificationToken
      const item: Dynamo<VerificationToken> = {
        pk: `VR#${identifier}`,
        sk: `VR#${token}`,
        token,
        identifier,
        type: "VR",
        expires,
      }
      await client.put({ TableName, Item: format.to(item) })
      return format.from<VerificationToken>(item)
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
      const attributes = data.Attributes
      return attributes ? format.from<VerificationToken>(attributes) : null
    },
  }
}

// https://github.com/honeinc/is-iso-date/blob/master/index.js
const isoDateRE =
  /(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d\.\d+([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))|(\d{4}-[01]\d-[0-3]\dT[0-2]\d:[0-5]\d([+-][0-2]\d:[0-5]\d|Z))/
function isDate(value: any) {
  return value && isoDateRE.test(value) && !isNaN(Date.parse(value))
}

// dyanmo TTL requires the date object to be a timestamp in Unix epoch time format in seconds.
// https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-before-you-start.html#time-to-live-ttl-before-you-start-formatting
export const format = {
  /** Takes a plain old JavaScript object and turns it into a Dynamodb object */
  to(object: Record<string, any>) {
    const newObject: Record<string, unknown> = {}
    for (const key in object) {
      const value = object[key]
      if (value instanceof Date) {
        if (key === "expires") {
          newObject[key] = value.getTime() / 1000
        } else {
          newObject[key] = value.toISOString()
        }
      } else {
        newObject[key] = value
      }
    }
    return newObject
  },
  /** Takes a Dynamo object and returns a plain old JavaScript object */
  from<T = Record<string, unknown>>(dynamodbObject: Record<string, any>): T {
    const { pk, sk, GSI1PK, GSI1SK, type, ...object } = dynamodbObject
    // hack to keep type property in accounts
    if (type !== "SESSION" && type !== "VR" && type !== "USER") {
      object.type = type
    }
    const newObject: Record<string, unknown> = {}
    for (const key in object) {
      const value = object[key]
      if (isDate(value)) {
        newObject[key] = new Date(value)
      } else {
        newObject[key] = value
      }
      if (key === "expires") {
        newObject[key] = new Date(value * 1000)
      }
    }
    return newObject as T
  },
}

const generateUpdateExpression = (
  object: Record<string, any>
): {
  UpdateExpression: string
  ExpressionAttributeNames: Record<string, string>
  ExpressionAttributeValues: Record<string, unknown>
} => {
  const formatedSession = format.to(object)
  let UpdateExpression = "set"
  const ExpressionAttributeNames: Record<string, string> = {}
  const ExpressionAttributeValues: Record<string, unknown> = {}
  for (const property in formatedSession) {
    UpdateExpression += ` #${property} = :${property},`
    ExpressionAttributeNames["#" + property] = property
    ExpressionAttributeValues[":" + property] = formatedSession[property]
  }
  UpdateExpression = UpdateExpression.slice(0, -1)
  return {
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  }
}
