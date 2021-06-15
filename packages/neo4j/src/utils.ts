import neo4j from "neo4j-driver"

export const neo4jToSafeNumber = (x: typeof neo4j.Integer) => {
  if (!neo4j.isInt(x)) {
    return x
  }
  if (neo4j.integer.inSafeRange(x)) {
    return x.toNumber()
  } else {
    return x.toString()
  }
}

export const neo4jEpochToDate = (epoch: typeof neo4j.Integer) => {
  const epochParsed = neo4jToSafeNumber(epoch)

  if (typeof epochParsed !== "number") return null

  return new Date(epochParsed)
}

export const userReturn = `
  { 
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    emailVerified: u.emailVerified.epochMillis
  } AS user 
`
export const sessionReturn = `
  {
    userId: u.id,
    id: s.id,
    expires: s.expires.epochMillis, 
    accessToken: s.accessToken,
    sessionToken: s.sessionToken
  } AS session
`
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

export const verificationRequestReturn = `
  {
    identifier: v.identifier,
    token: v.token,
    expires: v.expires.epochMillis
  } AS verificationRequest 
`
