import neo4j from "neo4j-driver"
import type { Profile } from "next-auth"

import { neo4jEpochToDate } from "./utils"

export interface Neo4jUser {
  id: string
  name?: string
  email?: string
  emailVerified?: Date | null
  image?: string
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

export const createUser = async (
  neo4jSession: typeof neo4j.Session,
  profile: Profile & { emailVerified?: Date }
) => {
  const result = await neo4jSession.run(
    `
    MERGE (u:User { email: $email })
    ON CREATE SET u.id = apoc.create.uuid()  
    SET
      u.name= $name,
      u.image= $image,
      u.emailVerified= datetime($emailVerified)
    RETURN ${userReturn} 
    `,
    {
      name: profile.name,
      email: profile.email,
      image: profile.image,
      emailVerified: profile.emailVerified?.toISOString() ?? null,
    }
  )

  const user = result?.records[0]?.get("user")

  return user
    ? {
        ...user,
        emailVerified: neo4jEpochToDate(user.emailVerified),
      }
    : null
}

export const getUser = async (
  neo4jSession: typeof neo4j.Session,
  id: String
) => {
  const result = await neo4jSession.run(
    `
    MATCH (u:User { id: $id })
    RETURN ${userReturn} 
    `,
    { id }
  )
  const user = result?.records[0]?.get("user")

  return user
    ? {
        ...user,
        emailVerified: neo4jEpochToDate(user.emailVerified),
      }
    : null
}

export const getUserByEmail = async (
  neo4jSession: typeof neo4j.Session,
  email: String | null
) => {
  if (!email) return null

  const result = await neo4jSession.run(
    `
    MATCH (u:User { email: $email })
    RETURN ${userReturn} 
    `,
    { email }
  )

  const user = result?.records[0]?.get("user")

  return user
    ? {
        ...user,
        emailVerified: neo4jEpochToDate(user.emailVerified),
      }
    : null
}

export const getUserByProviderAccountId = async (
  neo4jSession: typeof neo4j.Session,
  providerId: string,
  providerAccountId: string
) => {
  const result = await neo4jSession.run(
    `
  MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
    providerId: $providerId, 
    providerAccountId: $providerAccountId
  })
  RETURN ${userReturn} 
  `,
    { providerId, providerAccountId }
  )
  const user = result?.records[0]?.get("user")

  return user
    ? {
        ...user,
        emailVerified: neo4jEpochToDate(user.emailVerified),
      }
    : null
}

export const updateUser = async (
  neo4jSession: typeof neo4j.Session,
  user: Neo4jUser & { id: string }
) => {
  const result = await neo4jSession.run(
    `
    MATCH (u:User { id: $id })
    SET 
      u.name          = $name,
      u.email         = $email,
      u.image         = $image,
      u.emailVerified = datetime($emailVerified)
    RETURN ${userReturn}
    `,
    {
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified?.toISOString() ?? null,
    }
  )

  const updatedUser = result?.records[0]?.get("user")

  return updatedUser
    ? {
        ...updatedUser,
        emailVerified: neo4jEpochToDate(updatedUser.emailVerified),
      }
    : null
}

export const deleteUser = async (
  neo4jSession: typeof neo4j.Session,
  id: string
) => {
  await neo4jSession.run(
    `
    MATCH (u:User { id: $id })
    DETACH DELETE u
    RETURN count(u)
    `,
    { id }
  )
}
