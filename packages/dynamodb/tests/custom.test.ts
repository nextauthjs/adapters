import type { DynamoDBAdapterOptions } from "../src"
import { DynamoDBAdapter, format } from "../src"
import { runBasicTests } from "../../../basic-tests"
import { DynamoDBDocument } from "@aws-sdk/lib-dynamodb"
import { DynamoDB } from "@aws-sdk/client-dynamodb"

const config = {
  endpoint: "http://127.0.0.1:8000",
  region: "eu-central-1",
  tls: false,
  credentials: {
    accessKeyId: "foo",
    secretAccessKey: "bar",
  },
}

export const client = DynamoDBDocument.from(new DynamoDB(config), {
  marshallOptions: {
    convertEmptyValues: true,
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
})

const tableName = "next-auth-custom"
const indexName = "gsi1"
const partitionKey = "PK"
const sortKey = "SK"
const indexPartitionKey = "gsi1pk"
const indexSortKey = "gsi1sk"
const keys = [partitionKey, sortKey, indexPartitionKey, indexSortKey]

const options: DynamoDBAdapterOptions = {
  tableName,
  partitionKey,
  sortKey,
  indexName,
  indexPartitionKey,
  indexSortKey,
}

const adapter = DynamoDBAdapter(client, options)
const TableName = tableName
const IndexName = indexName

runBasicTests({
  adapter,
  db: {
    async user(id) {
      const user = await client.get({
        TableName,
        Key: {
          [partitionKey]: `USER#${id}`,
          [sortKey]: `USER#${id}`,
        },
      })

      return format.from(user.Item, keys)
    },
    async session(token) {
      const session = await client.query({
        TableName,
        IndexName,
        KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
        ExpressionAttributeNames: {
          "#gsi1pk": indexPartitionKey,
          "#gsi1sk": indexSortKey,
        },
        ExpressionAttributeValues: {
          ":gsi1pk": `SESSION#${token}`,
          ":gsi1sk": `SESSION#${token}`,
        },
      })

      return format.from(session.Items?.[0], keys)
    },
    async account({ provider, providerAccountId }) {
      const account = await client.query({
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

      return format.from(account.Items?.[0], keys)
    },
    async verificationToken({ token, identifier }) {
      const vt = await client.get({
        TableName,
        Key: {
          [partitionKey]: `VT#${identifier}`,
          [sortKey]: `VT#${token}`,
        },
      })
      return format.from(vt.Item, keys)
    },
  },
})
