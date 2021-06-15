import neo4j from "neo4j-driver"
import { EmailConfig } from "next-auth/providers"

import { neo4jEpochToDate } from "./utils"

export const verificationRequestReturn = `
  {
    identifier: v.identifier,
    token: v.token,
    expires: v.expires.epochMillis 
  } AS verificationRequest 
`

export const createVerificationRequest = async (
  neo4jSession: typeof neo4j.Session,
  identifier: string,
  url: string,
  token: string,
  _: string,
  provider: EmailConfig & {
    maxAge: number
    from: string
  },
  hashToken: any, // TODO: correct type
  baseUrl: string // TODO: should I import just this or all of appOptions for future proofing?
) => {
  const hashedToken = hashToken(token)
  await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    // Use merge here because composite of
    // identifier + token is unique
    MERGE (v:VerificationRequest {
      identifier: $identifier,
      token: $token 
    })
    SET 
      v.expires = datetime($expires),
      v.token   = $token

    RETURN ${verificationRequestReturn}
    `,
      {
        identifier,
        token: hashedToken,
        expires: new Date(Date.now() + provider.maxAge * 1000).toISOString(),
      }
    )
  )

  // TODO: should we check it created ok?
  // if (!result?.records[0]?.get("verificationRequest")) throw "createVerificationRequest: "

  await provider.sendVerificationRequest({
    identifier,
    url,
    token,
    baseUrl,
    provider,
  })
}

export const getVerificationRequest = async (
  neo4jSession: typeof neo4j.Session,
  identifier: string,
  token: string,
  hashToken: any // TODO: correct type
) => {
  const hashedToken = hashToken(token)
  const result = await neo4jSession.readTransaction((tx) =>
    tx.run(
      `
    MATCH (v:VerificationRequest {
      identifier: $identifier,
      token: $token 
    })
    RETURN ${verificationRequestReturn}
    `,
      {
        identifier,
        token: hashedToken,
      }
    )
  )

  const verificationRequest = result?.records[0]?.get("verificationRequest")

  return verificationRequest
    ? {
        ...verificationRequest,
        expires: neo4jEpochToDate(verificationRequest.expires),
      }
    : null
}

export const deleteVerificationRequest = async (
  neo4jSession: typeof neo4j.Session,
  identifier: string,
  token: string,
  hashToken: any // TODO: correct type
) => {
  const hashedToken = hashToken(token)
  await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
    MATCH (v:VerificationRequest { identifier: $identifier, token: $token })
    DETACH DELETE v
    RETURN count(v)
    `,
      { identifier, token: hashedToken }
    )
  )
}
