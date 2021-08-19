import neo4j from "neo4j-driver"
import type { Account } from "next-auth"
import { v4 as uuid } from "uuid"

export const accountReturn = `
  {
    userId: u.id,
    id: a.providerAccountId,
    provider: a.providerId,
    providerType: a.providerType,
    refreshToken: a.refreshToken,
    providerType: a.providerType
  } AS account 
`

export const linkAccount = async (
  neo4jSession: typeof neo4j.Session,
  data: Account
) => {
  const { userId, ...accountData } = data

  const result = await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
      MATCH (u:User { id: $userId })
      // Use merge here because composite of
      // providerId + providerAccountId is unique
      MERGE (a:Account { 
        providerAccountId: $accountData.providerAccountId, 
        provider: $accountData.provider 
      }) 
      ON CREATE SET 
        a.id = $id
      SET 
        a += $accountData

      MERGE (u)-[:HAS_ACCOUNT]->(a)

      RETURN a AS account, u AS user
      `,
      {
        id: uuid(),
        userId,
        accountData,
      }
    )
  )

  const account = result?.records[0]?.get("account")?.properties
  if (!account) return null

  const user = result?.records[0]?.get("user")?.properties
  if (!user) return null

  return {
    ...account,
    userId: user.id,
  }
}

export const unlinkAccount = async (
  neo4jSession: typeof neo4j.Session,
  provider_providerAccountId: Pick<Account, "provider" | "providerAccountId">
) => {
  await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
      MATCH (a:Account { 
        providerAccountId: $provider_providerAccountId 
      })
      DETACH DELETE a
      RETURN count(a)
      `,
      {
        provider_providerAccountId,
      }
    )
  )
}
