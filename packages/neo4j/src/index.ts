import neo4j from "neo4j-driver"

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
function neo4jToSafeNumber(x: typeof neo4j.Integer) {
  if (!neo4j.isInt(x)) {
    return x
  }
  if (neo4j.integer.inSafeRange(x)) {
    return x.toNumber()
  } else {
    return x.toString()
  }
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
            CREATE (u:User  {
              id: apoc.create.uuid(),
              name: $name,
              email: $email,
              image: $image,
              emailVerified: datetime($emailVerified)
            })
            RETURN { 
              name: u.name,
              email: u.email,
              image: u.image,
              emailVerified: u.emailVerified.epochMillis
            } AS user 
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
          const emailVerified = neo4jToSafeNumber(user.emailVerified)

          if (typeof emailVerified !== "number") return null

          return { ...user, emailVerified: new Date(emailVerified) }
        },

        async getUser(id) {
          console.log({ id })

          // TODO: handle emailVerified date
          const result = await neo4jSession.run(
            `
            MATCH (u:User { id: $id })
            RETURN u AS user
            `,
            { id }
          )
          return result?.records[0]?.get("user").properties ?? null
        },

        async getUserByEmail(email) {
          // TODO: handle emailVerified date
          const result = await neo4jSession.run(
            `
            MATCH (u:User { email: $email })
            RETURN u AS user
            `,
            { email }
          )
          return result?.records[0]?.get("user").properties ?? null
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const result = await neo4jSession.run(
            `
            MATCH (a:Account { providerId: $providerId, providerAccountId, $providerAccountId })
            MATCH (u:User)-[:HAS_ACCOUNT]->(a)
            RETURN u
            `,
            { providerId, providerAccountId }
          )
          return result?.records[0]?.get("user") ?? null
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
            RETURN u AS user
            `,
            {
              id: user.id,
              name: user.name,
              email: user.email,
              image: user.image,
              emailVerified: user.emailVerified?.toISOString() ?? null,
            }
          )
          return result?.records[0]?.get("user")
        },

        async deleteUser(id) {
          await neo4jSession.run(
            `
            MATCH (u:User { id: $id })
            DETACH DELETE u
            RETURN u
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
          await neo4jSession.run(
            `
            MATCH (u:User { id: $userId })
            MERGE (a:Account { 
              providerId: $providerId, 
              providerAccountId: $providerAccountId 
            })
            SET 
              a.providerType       = $providerType,
              a.refreshToken       = $refreshToken,
              a.accessToken        = $accessToken,
              a.accessTokenExpires = datetime(providerType)
            
            // TODO: with
            MERGE (u)-[:HAS_ACCOUNT]->(a)

            RETURN a
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

        async createSession(user: Neo4jUser & { id: string }) {
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
            RETURN s AS session
            `,
            {
              userId: user.id,
              expires: new Date(Date.now() + sessionMaxAge),
              sessionToken: randomBytes(32).toString("hex"),
              accessToken: randomBytes(32).toString("hex"),
            }
          )
          return result?.records[0]?.get("session")
        },

        async getSession(sessionToken) {
          const result = await neo4jSession.run(
            `
            MATCH (s:Session { sessionToken: $sessionToken })
            RETURN s AS session
            `,
            { sessionToken }
          )
          return result?.records[0]?.get("session") ?? null
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
            MATCH (s:Session { id: $id })
            SET
              s.expires = datetime($expires)
            RETURN s AS session
            `,
            {
              expires: new Date(Date.now() + sessionMaxAge),
            }
          )
          return result?.records[0]?.get("session") ?? null
        },

        async deleteSession(sessionToken) {
          await neo4jSession.run(
            `
            MATCH (s:Session { sessionToken: $sessionToken })
            DETACH DELETE s
            RETURN s 
            `,
            { sessionToken }
          )
        },

        async createVerificationRequest(identifier, url, token, _, provider) {
          const hashedToken = hashToken(token)
          await neo4jSession.run(
            `
            CREATE (v:VerificationRequest {
              id: apoc.create.uuid(),
              token: $token
              expires: datetime($expires)
              accessToken: $accessToken
            })
            RETURN v AS verificationRequest
            `,
            {
              identifier,
              token: hashedToken,
              expires: new Date(Date.now() + provider.maxAge * 1000),
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
            MATCH (v:VerificationRequest { identifier: $identifier, token, $token })
            RETURN v AS verificationRequest
            `,
            { identifier, token: hashedToken }
          )
          // TODO: delete if expired?
          return result?.records[0]?.get("verificationRequest") ?? null
        },

        async deleteVerificationRequest(identifier, token) {
          const hashedToken = hashToken(token)
          await neo4jSession.run(
            `
            MATCH (v:VerificationRequest { identifier: $identifier, token, $token })
            DETACH DELETE v
            RETURN v AS verificationRequest
            `,
            { identifier, token: hashedToken }
          )
        },
      }
    },
  }
}
