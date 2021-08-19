import neo4j from "neo4j-driver"
import type { VerificationToken } from "next-auth/adapters"

import { neo4jEpochToDate } from "./utils"

export const verificationTokenReturn = `
  {
    identifier: v.identifier,
    token: v.token,
    expires: v.expires.epochMillis 
  } AS verificationToken 
`

export const createVerificationToken = async (
  neo4jSession: typeof neo4j.Session,
  verificationToken: VerificationToken
) => {
  const result = await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    // Use merge here because composite of
    // identifier + token is unique
    MERGE (v:VerificationToken {
      identifier: $identifier,
      token: $token 
    })
    SET 
      v.expires = datetime($expires),
      v.token   = $token

    RETURN ${verificationTokenReturn}
    `,
      {
        identifier: verificationToken.identifier,
        expires: verificationToken.expires?.toISOString(),
        token: verificationToken.token,
      }
    )
  )

  const dbVerificationToken = result?.records[0]?.get("verificationToken")

  return dbVerificationToken
    ? {
        ...dbVerificationToken,
        expires: neo4jEpochToDate(dbVerificationToken.expires),
      }
    : null
}

export const useVerificationToken = async (
  neo4jSession: typeof neo4j.Session,
  data: {
    identifier: string
    token: string
  }
) => {
  const result = await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    MATCH (v:VerificationRequest {
      identifier: $identifier,
      token: $token 
    })
    DETACH DELETE v
    RETURN ${verificationTokenReturn}
    `,
      {
        ...data,
      }
    )
  )

  const dbVerificationToken = result?.records[0]?.get("verificationToken")

  if (!dbVerificationToken) return null

  return dbVerificationToken
    ? {
        ...dbVerificationToken,
        expires: neo4jEpochToDate(dbVerificationToken.expires),
      }
    : null
}
