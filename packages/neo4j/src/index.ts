import neo4j from "neo4j-driver"
import {
  neo4jEpochToDate,
  userReturn,
  sessionReturn,
  accountReturn,
  verificationRequestReturn,
} from "./utils"

import { createHash, randomBytes } from "crypto"
import type { Profile } from "next-auth"
import type { Adapter } from "next-auth/adapters"

interface Neo4jUser {
  id: string
  name?: string
  email?: string
  emailVerified?: Date | null
  image?: string
}

interface Neo4jSession {
  id: string
  userId: string
  expires: Date | string
  sessionToken: string
  accessToken: string
}

interface Neo4jAccount {
  id: string
  userId: string
  providerType: string
  providerId: string
  providerAccountId: string
  refreshToken: string | null | undefined
  accessToken: string | null | undefined
  accessTokenExpires: Date | null | undefined
}

export const Neo4jAdapter: Adapter<
  typeof neo4j.Session,
  never,
  Neo4jUser,
  Profile & { emailVerified?: Date },
  Neo4jSession
> = (neo4jSession) => {
  return {
    async getAdapter({ session, secret, ...appOptions }) {
      const sessionMaxAge = session.maxAge * 1000 // default is 30 days
      const sessionUpdateAge = session.updateAge * 1000 // default is 1 day

      /**
       * @todo Move this to core package
       * @todo Use bcrypt or a more secure method
       */
      const hashToken = (token: string) =>
        createHash("sha256").update(`${token}${secret}`).digest("hex")

      return {
        displayName: "NEO4J",

        async createUser(profile) {
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

          if (!result?.records[0]) return null

          const user = result.records[0].get("user")

          return {
            ...user,
            emailVerified: neo4jEpochToDate(user.emailVerified),
          }
        },

        async getUser(id) {
          const result = await neo4jSession.run(
            `
            MATCH (u:User { id: $id })
            RETURN ${userReturn} 
            `,
            { id }
          )
          if (!result?.records[0]) return null

          const user = result.records[0].get("user")

          return {
            ...user,
            emailVerified: neo4jEpochToDate(user.emailVerified),
          }
        },

        async getUserByEmail(email) {
          const result = await neo4jSession.run(
            `
            MATCH (u:User { email: $email })
            RETURN ${userReturn} 
            `,
            { email }
          )
          if (!result?.records[0]) return null

          const user = result.records[0].get("user")

          return {
            ...user,
            emailVerified: neo4jEpochToDate(user.emailVerified),
          }
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
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
          if (!result?.records[0]) return null

          const user = result.records[0].get("user")

          return {
            ...user,
            emailVerified: neo4jEpochToDate(user.emailVerified),
          }
        },

        async updateUser(user: Neo4jUser & { id: string }) {
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
          if (!result?.records[0]) return null

          const updatedUser = result.records[0].get("user")

          return {
            ...updatedUser,
            emailVerified: neo4jEpochToDate(updatedUser.emailVerified),
          }
        },

        async deleteUser(id) {
          await neo4jSession.run(
            `
            MATCH (u:User { id: $id })
            DETACH DELETE u
            RETURN count(u)
            `,
            { id }
          )
        },

        async linkAccount(
          userId: Neo4jAccount["userId"],
          providerId: Neo4jAccount["providerId"],
          providerType: Neo4jAccount["providerType"],
          providerAccountId: Neo4jAccount["providerAccountId"],
          refreshToken: Neo4jAccount["refreshToken"],
          accessToken: Neo4jAccount["accessToken"],
          accessTokenExpires: Neo4jAccount["accessTokenExpires"]
        ) {
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
          if (!result?.records[0]) return null

          const account = result.records[0].get("account")

          return {
            ...account,
            accessTokenExpires: neo4jEpochToDate(account.accessTokenExpires),
          }
        },

        async unlinkAccount(_, providerId, providerAccountId) {
          await neo4jSession.run(
            `
            MATCH (a:Account { 
              providerId: $providerId, 
              providerAccountId: $providerAccountId 
            })
            DETACH DELETE a
            RETURN a
            `,
            {
              providerId,
              providerAccountId,
            }
          )
        },

        async createSession(user: Neo4jUser) {
          const result = await neo4jSession.run(
            `
            MATCH (u:User { id: $userId })
            CREATE (s:Session  {
              id : apoc.create.uuid(),
              expires : datetime($expires),
              sessionToken : $sessionToken,
              accessToken : $accessToken
            })
            CREATE (u)-[:HAS_SESSION]->(s)
            RETURN ${sessionReturn}
            `,
            {
              userId: user.id,
              expires: new Date(Date.now() + sessionMaxAge)?.toISOString(),
              sessionToken: randomBytes(32).toString("hex"),
              accessToken: randomBytes(32).toString("hex"),
            }
          )

          const session = result?.records[0]?.get("session")

          return {
            ...session,
            expires: neo4jEpochToDate(session.expires),
          }
        },

        async getSession(sessionToken) {
          const result = await neo4jSession.run(
            `
            MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
            RETURN ${sessionReturn}
            `,
            { sessionToken }
          )

          if (!result?.records[0]) return null

          let session = result?.records[0]?.get("session")

          session = {
            ...session,
            expires: neo4jEpochToDate(session.expires),
          }

          if (session.expires < new Date()) {
            await neo4jSession.run(
              `
            MATCH (s:Session { id: $id })
            DETACH DELETE s
            RETURN s 
            `,
              { id: session.id }
            )
            return null
          }

          return session
        },

        async updateSession(session, force) {
          if (
            !force &&
            Number(session.expires) - sessionMaxAge + sessionUpdateAge >
              Date.now()
          ) {
            return null
          }

          const result = await neo4jSession.run(
            `
            MATCH (u:User)-[:HAS_SESSION]->(s:Session { sessionToken: $sessionToken })
            SET s.expires = datetime($expires)
            RETURN ${sessionReturn}
            `,
            {
              sessionToken: session.sessionToken,
              expires: new Date(Date.now() + sessionMaxAge).toISOString(),
            }
          )
          return result?.records[0]?.get("session") ?? null
        },

        async deleteSession(sessionToken) {
          await neo4jSession.run(
            `
            MATCH (s:Session { sessionToken: $sessionToken })
            DETACH DELETE s
            RETURN count(s)
            `,
            { sessionToken }
          )
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          const hashedToken = hashToken(token)
          await neo4jSession.run(
            `
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
              expires: new Date(
                Date.now() + provider.maxAge * 1000
              ).toISOString(),
            }
          )
          await provider.sendVerificationRequest({
            identifier,
            url,
            token,
            baseUrl: appOptions.baseUrl,
            provider,
          })
        },

        async getVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)
          const result = await neo4jSession.run(
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
          if (!result?.records[0]) return null

          const verificationRequest = result.records[0].get(
            "verificationRequest"
          )

          return {
            ...verificationRequest,
            expires: neo4jEpochToDate(verificationRequest.expires),
          }
        },

        async deleteVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)
          await neo4jSession.run(
            `
            MATCH (v:VerificationRequest { identifier: $identifier, token: $token })
            DETACH DELETE v
            RETURN count(v)
            `,
            { identifier, token: hashedToken }
          )
        },
      }
    },
  }
}
