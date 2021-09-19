import { AWS } from "dynamodb"
import { DynamoDBAdapter } from "../src"
import { runBasicTests } from "../../../basic-tests"

const client = new AWS.DynamoDB.DocumentClient()
const adapter = DynamoDBAdapter(client)

runBasicTests({
  adapter,
  db: {
    async user(id) {},
    async session(token) {},
    async account(id) {},
    async verificationToken(id) {},
  },
})
