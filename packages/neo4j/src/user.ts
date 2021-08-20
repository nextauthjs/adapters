import neo4j from "neo4j-driver"
import type { Account } from "next-auth"
import type { AdapterUser } from "next-auth/adapters"
import { v4 as uuid } from "uuid"

import { neo4jDateToJs } from "./utils"

export const createUser = async (
  neo4jSession: typeof neo4j.Session,
  user: Omit<AdapterUser, "id">
) => {
  const { emailVerified, ...userData } = user
  const emailVerifiedParsed =
    emailVerified instanceof Date ? emailVerified.toISOString() : emailVerified

  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        CREATE (u:User) 
        SET
          u.id = $id,
          u    += $userData
          ${
            undefined !== emailVerified
              ? `, u.emailVerified = datetime($emailVerified)`
              : ``
          }
        RETURN u
        `,
        {
          id: uuid(),
          userData,
          emailVerified: emailVerifiedParsed,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("u")?.properties
  if (!dbUser) return null

  return {
    ...dbUser,
    emailVerified: neo4jDateToJs(dbUser?.emailVerified),
  }
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
        RETURN u
        `,
        { id }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("u")?.properties
  if (!dbUser) return null

  return {
    ...dbUser,
    emailVerified: neo4jDateToJs(dbUser?.emailVerified),
  }
}

export const getUserByEmail = async (
  neo4jSession: typeof neo4j.Session,
  email: string
) => {
  let result
  try {
    result = await neo4jSession.readTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User { email: $email })
        RETURN u
        `,
        { email }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("u")?.properties
  if (!dbUser) return null

  return {
    ...dbUser,
    emailVerified: neo4jDateToJs(dbUser?.emailVerified),
  }
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
      RETURN u
      `,
      { ...provider_providerAccountId }
    )
  )

  const dbUser = result?.records[0]?.get("u")?.properties
  if (!dbUser) return null

  return {
    ...dbUser,
    emailVerified: neo4jDateToJs(dbUser?.emailVerified),
  }
}

export const updateUser = async (
  neo4jSession: typeof neo4j.Session,
  user: Partial<AdapterUser>
) => {
  const { id, emailVerified, ...userData } = user
  const emailVerifiedParsed =
    emailVerified instanceof Date ? emailVerified.toISOString() : emailVerified

  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
        MATCH (u:User { id: $id })
        SET
          u += $userData
          ${
            undefined !== emailVerified
              ? `, u.emailVerified = datetime($emailVerified)`
              : ``
          }
        RETURN u
        `,
        {
          id,
          userData,
          emailVerified: emailVerifiedParsed,
        }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("u")?.properties
  if (!dbUser) return null

  return {
    ...dbUser,
    emailVerified: neo4jDateToJs(dbUser?.emailVerified),
  }
}

export const deleteUser = async (
  neo4jSession: typeof neo4j.Session,
  id: string
) => {
  let result
  try {
    result = await neo4jSession.writeTransaction((tx) =>
      tx.run(
        `
      MATCH (u:User { id: $id })
      WITH u, properties(u) AS props
      DETACH DELETE u
      RETURN props
      `,
        { id }
      )
    )
  } catch (error) {
    console.error(error)
    return null
  }

  const dbUser = result?.records[0]?.get("props")
  if (!dbUser) return null

  return {
    ...dbUser,
    emailVerified: neo4jDateToJs(dbUser?.emailVerified),
  }
}
