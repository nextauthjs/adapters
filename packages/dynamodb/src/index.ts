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

import { format, generateUpdateExpression } from "./utils"

export { format, generateUpdateExpression }

export interface DynamoDBAdapterOptions {
  /**
   * The name of the DynamoDB table.
   *
   * @default next-auth
   */
  tableName?: string

  /**
   * The name of the global secondary index (GSI).
   *
   * @default GSI1
   */
  indexName?: string

  /**
   * The partition key of the DynamoDB table.
   *
   * @default pk
   */
  partitionKey?: string

  /**
   * The sort key of the DynamoDB table.
   *
   * @default sk
   */
  sortKey?: string

  /**
   * The partition key of the global secondary index (GSI).
   *
   * @default GSI1PK
   */
  indexPartitionKey?: string

  /**
   * The sort key of the global secondary index (GSI).
   *
   * @default GSI1SK
   */
  indexSortKey?: string
}

export function DynamoDBAdapter(
  client: DynamoDBDocument,
  options?: DynamoDBAdapterOptions
): Adapter {
  const TableName = options?.tableName ?? "next-auth"
  const IndexName = options?.indexName ?? "GSI1"

  const partitionKey = options?.partitionKey ?? "pk"
  const sortKey = options?.sortKey ?? "sk"
  const indexPartitionKey = options?.indexPartitionKey ?? "GSI1PK"
  const indexSortKey = options?.indexSortKey ?? "GSI1SK"
  const keys = [partitionKey, sortKey, indexPartitionKey, indexSortKey]

  return {
    async createUser(data) {
      const user: AdapterUser = {
        ...(data as any),
        id: randomBytes(16).toString("hex"),
      }

      await client.put({
        TableName,
        Item: format.to({
          ...user,
          [partitionKey]: `USER#${user.id}`,
          [sortKey]: `USER#${user.id}`,
          type: "USER",
          [indexPartitionKey]: `USER#${user.email as string}`,
          [indexSortKey]: `USER#${user.email as string}`,
        }),
      })

      return user
    },
    async getUser(userId) {
      const data = await client.get({
        TableName,
        Key: {
          [partitionKey]: `USER#${userId}`,
          [sortKey]: `USER#${userId}`,
        },
      })
      return format.from<AdapterUser>(data.Item, keys)
    },
    async getUserByEmail(email) {
      const data = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `USER#${email}`,
          ":gsi1sk": `USER#${email}`,
        },
      })

      return format.from<AdapterUser>(data.Items?.[0], keys)
    },
    async getUserByAccount({ provider, providerAccountId }) {
      const data = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `ACCOUNT#${provider}`,
          ":gsi1sk": `ACCOUNT#${providerAccountId}`,
        },
      })
      if (!data.Items?.length) return null

      const accounts = data.Items[0] as Account
      const res = await client.get({
        TableName,
        Key: {
          [partitionKey]: `USER#${accounts.userId}`,
          [sortKey]: `USER#${accounts.userId}`,
        },
      })
      return format.from<AdapterUser>(res.Item, keys)
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
          [partitionKey]: `USER#${user.id as string}`,
          [sortKey]: `USER#${user.id as string}`,
        },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      return format.from<AdapterUser>(data.Attributes, keys)!
    },
    async deleteUser(userId) {
      // query all the items related to the user to delete
      const res = await client.query({
        TableName,
        KeyConditionExpression: "#pk = :pk",
        ExpressionAttributeNames: { "#pk": partitionKey },
        ExpressionAttributeValues: { ":pk": `USER#${userId}` },
      })
      if (!res.Items) return null
      const items = res.Items
      // find the user we want to delete to return at the end of the function call
      const user = items.find((item) => item.type === "USER")
      const itemsToDelete = items.map((item) => {
        return {
          DeleteRequest: {
            Key: {
              [sortKey]: item[sortKey],
              [partitionKey]: item[partitionKey],
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
      return format.from<AdapterUser>(user, keys)
    },
    async linkAccount(data) {
      const item = {
        ...data,
        id: randomBytes(16).toString("hex"),
        [partitionKey]: `USER#${data.userId}`,
        [sortKey]: `ACCOUNT#${data.provider}#${data.providerAccountId}`,
        [indexPartitionKey]: `ACCOUNT#${data.provider}`,
        [indexSortKey]: `ACCOUNT#${data.providerAccountId}`,
      }
      await client.put({ TableName, Item: format.to(item) })
      return data
    },
    async unlinkAccount({ provider, providerAccountId }) {
      const data = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `ACCOUNT#${provider}`,
          ":gsi1sk": `ACCOUNT#${providerAccountId}`,
        },
      })
      const account = format.from<Account>(data.Items?.[0], keys)
      if (!account) return
      await client.delete({
        TableName,
        Key: {
          [partitionKey]: `USER#${account.userId}`,
          [sortKey]: `ACCOUNT#${provider}#${providerAccountId}`,
        },
        ReturnValues: "ALL_OLD",
      })
      return account
    },
    async getSessionAndUser(sessionToken) {
      const data = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `SESSION#${sessionToken}`,
          ":gsi1sk": `SESSION#${sessionToken}`,
        },
      })
      const session = format.from<AdapterSession>(data.Items?.[0], keys)
      if (!session) return null
      const res = await client.get({
        TableName,
        Key: {
          [partitionKey]: `USER#${session.userId}`,
          [sortKey]: `USER#${session.userId}`,
        },
      })
      const user = format.from<AdapterUser>(res.Item, keys)
      if (!user) return null
      return { user, session }
    },
    async createSession(data) {
      const session = {
        id: randomBytes(16).toString("hex"),
        ...data,
      }
      await client.put({
        TableName,
        Item: format.to({
          [partitionKey]: `USER#${data.userId}`,
          [sortKey]: `SESSION#${data.sessionToken}`,
          [indexSortKey]: `SESSION#${data.sessionToken}`,
          [indexPartitionKey]: `SESSION#${data.sessionToken}`,
          type: "SESSION",
          ...data,
        }),
      })
      return session
    },
    async updateSession(session) {
      const { sessionToken } = session
      const data = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `SESSION#${sessionToken}`,
          ":gsi1sk": `SESSION#${sessionToken}`,
        },
      })
      if (!data.Items?.length) return null
      const item = data.Items[0] as any

      const {
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
      } = generateUpdateExpression(session)
      const res = await client.update({
        TableName,
        Key: { [partitionKey]: item[partitionKey], [sortKey]: item[sortKey] },
        UpdateExpression,
        ExpressionAttributeNames,
        ExpressionAttributeValues,
        ReturnValues: "ALL_NEW",
      })
      return format.from<AdapterSession>(res.Attributes, keys)
    },
    async deleteSession(sessionToken) {
      const data = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `SESSION#${sessionToken}`,
          ":gsi1sk": `SESSION#${sessionToken}`,
        },
      })
      if (!data?.Items?.length) return null

      const item = data.Items[0] as any

      const res = await client.delete({
        TableName,
        Key: { [partitionKey]: item[partitionKey], [sortKey]: item[sortKey] },
        ReturnValues: "ALL_OLD",
      })
      return format.from<AdapterSession>(res.Attributes, keys)
    },
    async createVerificationToken(data) {
      await client.put({
        TableName,
        Item: format.to({
          [partitionKey]: `VT#${data.identifier}`,
          [sortKey]: `VT#${data.token}`,
          type: "VT",
          ...data,
        }),
      })
      return data
    },
    async useVerificationToken({ identifier, token }) {
      const data = await client.delete({
        TableName,
        Key: {
          [partitionKey]: `VT#${identifier}`,
          [sortKey]: `VT#${token}`,
        },
        ReturnValues: "ALL_OLD",
      })
      return format.from<VerificationToken>(data.Attributes, keys)
    },
  }
}
