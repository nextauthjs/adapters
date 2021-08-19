import neo4j from "neo4j-driver"
import type { Profile, Account, User } from "next-auth"
import type { AdapterUser } from "next-auth/adapters"
import { v4 as uuid } from "uuid"

import { neo4jEpochToDate } from "./utils"

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
  user: Omit<AdapterUser, "id">
) => {
  const { emailVerified, ...userData } = user

  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        CREATE (u:User) 
        SET
          u               += $userData,
          u.id            = $id,
          u.emailVerified = datetime($emailVerified)
        RETURN u AS user, u.emailVerified.epochMillis AS emailVerified
        `,
        {
          id: uuid(),
          userData,
          emailVerified:
            emailVerified instanceof Date ? emailVerified.toISOString() : null,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("user")?.properties
  const dbEmailVerified = result?.records[0]?.get("emailVerified")

  return dbUser
    ? {
        ...dbUser,
        emailVerified: neo4jEpochToDate(dbEmailVerified),
      }
    : null
}

export const getUser = async (
  neo4jSession: typeof neo4j.Session,
  id: String
) => {
  let result
  try {
    result = await neo4jSession.readTransaction((tx) =>
      tx.run(
        `
    MATCH (u:User { id: $id })
    RETURN u AS user, u.emailVerified.epochMillis AS emailVerified
    `,
        { id }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("user")?.properties
  const dbEmailVerified = result?.records[0]?.get("emailVerified")

  return dbUser
    ? {
        ...dbUser,
        emailVerified: neo4jEpochToDate(dbEmailVerified),
      }
    : null
}

export const getUserByEmail = async (
  neo4jSession: typeof neo4j.Session,
  email: String | null
) => {
  if (!email) return null

  let result
  try {
    result = await neo4jSession.readTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User { email: $email })
        RETURN u AS user, u.emailVerified.epochMillis AS emailVerified
        `,
        { email }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("user")?.properties
  const dbEmailVerified = result?.records[0]?.get("emailVerified")

  return dbUser
    ? {
        ...dbUser,
        emailVerified: neo4jEpochToDate(dbEmailVerified),
      }
    : null
}

export const getUserByAccount = async (
  neo4jSession: typeof neo4j.Session,
  provider_providerAccountId: Pick<Account, "provider" | "providerAccountId">
) => {
  const result = await neo4jSession.readTransaction((tx) =>
    tx.run(
      `
      MATCH (u:User)-[:HAS_ACCOUNT]->(a:Account {
        provider: $provider,
        providerAccountId: $providerAccountId
      })
      RETURN 
        u AS user, 
        u.emailVerified.epochMillis AS emailVerified
      `,
      { ...provider_providerAccountId }
    )
  )
  const dbUser = result?.records[0]?.get("user")?.properties
  const dbEmailVerified = result?.records[0]?.get("emailVerified")

  // console.log({ dbUser })
  // console.log({ dbEmailVerified })

  return dbUser
    ? {
        ...dbUser,
        emailVerified: neo4jEpochToDate(dbEmailVerified),
      }
    : null
}

export const updateUser = async (
  neo4jSession: typeof neo4j.Session,
  user: Partial<AdapterUser>
) => {
  const { id, emailVerified, ...userData } = user

  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User { id: $id })
        SET
          u               += $userData
          ${
            emailVerified
              ? `,
                u.emailVerified = datetime($emailVerified)
                `
              : ``
          }
        RETURN u AS user, u.emailVerified.epochMillis AS emailVerified
        `,
        {
          id,
          userData,
          emailVerified: emailVerified?.toISOString() ?? null,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("user")?.properties
  const dbEmailVerified = result?.records[0]?.get("emailVerified")

  return dbUser
    ? {
        ...dbUser,
        emailVerified: neo4jEpochToDate(dbEmailVerified),
      }
    : null
}

export const deleteUser = async (
  neo4jSession: typeof neo4j.Session,
  id: string
) => {
  await neo4jSession.writeTransaction((tx) =>
    tx.run(
      `
      MATCH (u:User { id: $id })
      DETACH DELETE u
      RETURN count(u)
    `,
      { id }
    )
  )
}
