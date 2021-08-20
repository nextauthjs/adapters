import neo4j from "neo4j-driver"
import type { Account } from "next-auth"
import { v4 as uuid } from "uuid"

export const linkAccount = async (
  neo4jSession: typeof neo4j.Session,
  data: Account
) => {
  const { userId, providerAccountId, provider, ...accountData } = data

  // TODO: Question, account.expires is an int. here
  // Should it be changed to js Date ?

  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
      MATCH (u:User { id: $userId })
      // Use merge here because composite of
      // providerId + providerAccountId is unique
      MERGE (a:Account { 
        providerAccountId: $providerAccountId, 
        provider: $provider 
      }) 
      ON CREATE SET 
        a.id = $id
      SET 
        a += $accountData

      MERGE (u)-[:HAS_ACCOUNT]->(a)

      RETURN a, u.id AS userId
      `,
        {
          id: uuid(),
          userId,
          providerAccountId,
          provider,
          accountData,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbAccount = result?.records[0]?.get("a")?.properties
  const dbUserId = result?.records[0]?.get("userId")
  if (!dbAccount || !dbUserId) return null

  return {
    ...dbAccount,
    userId: dbUserId,
  }
}

export const unlinkAccount = async (
  neo4jSession: typeof neo4j.Session,
  provider_providerAccountId: Pick<Account, "provider" | "providerAccountId">
) => {
  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User)
        -[:HAS_ACCOUNT]->
        (a:Account { 
          providerAccountId: $providerAccountId, 
          provider: $provider 
        })
        WITH u, a, properties(a) AS props
        DETACH DELETE a 
        RETURN props, u.id AS userId
        `,
        {
          ...provider_providerAccountId,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return undefined
  }

  const dbAccount = result?.records[0]?.get("props")
  const dbUserId = result?.records[0]?.get("userId")
  if (!dbAccount || !dbUserId) return undefined

  return {
    ...dbAccount,
    userId: dbUserId,
  }
}
