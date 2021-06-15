import neo4j from "neo4j-driver"

import { neo4jEpochToDate } from "./utils"

export interface Neo4jAccount {
  id: string
  userId: string
  providerType: string
  providerId: string
  providerAccountId: string
  refreshToken: string | null | undefined
  accessToken: string | null | undefined
  accessTokenExpires: Date | null | undefined
}

export const accountReturn = `
  {
    userId: u.id,
    providerId: a.providerId,
    providerAccountId: a.providerAccountId,
    providerType: a.providerType,
    refreshToken: a.refreshToken,
    accessToken: a.accessToken,
    accessTokenExpires: a.accessTokenExpires
  } AS account
`

export const linkAccount = async (
  neo4jSession: typeof neo4j.Session,
  userId: Neo4jAccount["userId"],
  providerId: Neo4jAccount["providerId"],
  providerType: Neo4jAccount["providerType"],
  providerAccountId: Neo4jAccount["providerAccountId"],
  refreshToken: Neo4jAccount["refreshToken"],
  accessToken: Neo4jAccount["accessToken"],
  accessTokenExpires: Neo4jAccount["accessTokenExpires"]
) => {
  const result = await neo4jSession.run(
    `
    MATCH (u:User { id: $userId })
    // Use merge here because composite of
    // providerId + providerAccountId is unique
    MERGE (a:Account { 
      providerId: $providerId, 
      providerAccountId: $providerAccountId 
    })
    SET 
      a.providerType       = $providerType,
      a.refreshToken       = $refreshToken,
      a.accessToken        = $accessToken,
      a.accessTokenExpires = datetime($accessTokenExpires)
    
    MERGE (u)-[:HAS_ACCOUNT]->(a)

    RETURN ${accountReturn}
    `,
    {
      userId,
      providerId,
      providerType,
      providerAccountId,
      refreshToken,
      accessToken,
      accessTokenExpires: accessTokenExpires?.toISOString() ?? null,
    }
  )

  const account = result?.records[0]?.get("account")

  return account
    ? {
        ...account,
        accessTokenExpires: neo4jEpochToDate(account.accessTokenExpires),
      }
    : null
}

export const unlinkAccount = async (
  neo4jSession: typeof neo4j.Session,
  _: string,
  providerId: string,
  providerAccountId: string
) => {
  await neo4jSession.run(
    `
    MATCH (a:Account { 
      providerId: $providerId, 
      providerAccountId: $providerAccountId 
    })
    DETACH DELETE a
    RETURN count(a)
    `,
    {
      providerId,
      providerAccountId,
    }
  )
}
