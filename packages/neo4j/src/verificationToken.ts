import neo4j from "neo4j-driver"
import type { VerificationToken } from "next-auth/adapters"

import { neo4jDateToJs } from "./utils"

export const createVerificationToken = async (
  neo4jSession: typeof neo4j.Session,
  verificationToken: VerificationToken
) => {
  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
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

        RETURN v
        `,
        {
          ...verificationToken,
          expires: verificationToken.expires?.toISOString(),
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbVerificationToken = result?.records[0]?.get("v")?.properties
  if (!dbVerificationToken) return null

  return {
    ...dbVerificationToken,
    expires: neo4jDateToJs(dbVerificationToken?.expires),
  }
}

export const useVerificationToken = async (
  neo4jSession: typeof neo4j.Session,
  data: {
    identifier: string
    token: string
  }
) => {
  let result

  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (v:VerificationToken {
          identifier: $identifier,
          token: $token 
        })
        WITH v, properties(v) AS props
        DETACH DELETE v
        RETURN props
        `,
        {
          ...data,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbVerificationToken = result?.records[0]?.get("props")
  if (!dbVerificationToken) return null

  return {
    ...dbVerificationToken,
    expires: neo4jDateToJs(dbVerificationToken.expires),
  }
}
