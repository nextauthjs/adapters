import { AWS } from "dynamodb"
import { DynamoDBAdapter } from "../src"
import { runBasicTests } from "../../../basic-tests"

const client = new AWS.DynamoDB.DocumentClient({
  region: "localhost",
  endpoint: "http://localhost:8000",
})
const adapter = DynamoDBAdapter(client)

const TableName = "next-auth"

runBasicTests({
  adapter,
  db: {
    async user(id) {
      const user = await client
        .get({
          TableName,
          Key: {
            pk: `USER#${id}`,
            sk: `USER#${id}`,
          },
        })
        .promise()

      if (!user.Item) return null

      return {
        email: user.Item.email,
        id: user.Item.id,
        image: user.Item.image,
        name: user.Item.name,
        emailVerified: new Date(user.Item.emailVerified),
      }
    },
    async session(token) {
      const session = await client
        .query({
          TableName,
          IndexName: "GSI1",
          KeyConditionExpression: "#gsi1pk = :gsi1pk AND #gsi1sk = :gsi1sk",
          ExpressionAttributeNames: {
            "#gsi1pk": "GSI1PK",
            "#gsi1sk": "GSI1SK",
          },
          ExpressionAttributeValues: {
            ":gsi1pk": `SESSION#${token}`,
            ":gsi1sk": `SESSION#${token}`,
          },
        })
        .promise()

      if (!session.Items[0]) return null

      return {
        expires: new Date(session.Items[0].expires),
        id: undefined, // DynamoDB does not set ID
        sessionToken: session.Items[0].sessionToken,
        userId: session.Items[0].userId,
      }
    },
    async account({ provider, providerAccountId }) {
      const account = await client
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

      if (!account.Items[0]) return null

      return {
        access_token: account.Items[0].accessToken,
        expires_at: account.Items[0].expiresAt,
        id_token: account.Items[0].idToken,
        oauth_token: account.Items[0].oauthToken,
        oauth_token_secret: account.Items[0].oauthTokenSecret,
        refresh_token: account.Items[0].refreshToken,
        scope: account.Items[0].scope,
        session_state: account.Items[0].sessionState,
        token_type: account.Items[0].tokenType,
        type: account.Items[0].type,
        provider: account.Items[0].provider,
        providerAccountId: account.Items[0].providerAccountId,
        userId: account.Items[0].userId,
        id: undefined,
      }
    },
    async verificationToken({ token, identifier }) {
      const vt = await client
        .get({
          TableName,
          Key: {
            pk: `VR#${identifier}`,
            sk: `VR#${token}`,
          },
        })
        .promise()

      return {
        expires: new Date(vt.Item.expires),
        token: vt.Item.token,
        identifier: vt.Item.identifier,
      }
    },
  },
})
