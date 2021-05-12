import type { Adapter } from "next-auth/adapters"
import type { Session, Profile, User } from "next-auth"
import {
  getUserByIdQuery,
  getUserByProviderAccountIdQuery,
  getUserByEmailQuery,
} from "./queries"
import LRU from "lru-cache"
import { SanityClient } from "@sanity/client"

interface Options {
  client: SanityClient
}

const userCache = new LRU<string, User & { id: string }>({
  maxAge: 24 * 60 * 60 * 1000,
  max: 1000,
})

export const SanityAdapter: Adapter<
  Options,
  never,
  User & { id: string },
  Profile,
  Session
> = ({ client }) => {
  return {
    async getAdapter() {
      return {
        async createUser(profile) {
          const user = await client.create({
            _type: "user",
            email: profile.email,
            name: profile.name,
            image: profile.image,
          })

          userCache.set(user._id, {
            id: user._id,
            ...user,
          })

          return {
            id: user._id,
            ...user,
          }
        },
        async getUser(id) {
          const cachedUser = userCache.get(id)

          if (cachedUser) {
            ;(async () => {
              const user = await client.fetch(getUserByIdQuery, {
                id,
              })

              userCache.set(user._id, {
                id: user._id,
                ...user,
              })
            })().then(
              () => {},
              () => {}
            )

            return cachedUser
          }

          const user = await client.fetch(getUserByIdQuery, {
            id,
          })

          return {
            id: user._id,
            ...user,
          }
        },

        async linkAccount(
          userId,
          providerId,
          providerType,
          providerAccountId,
          refreshToken,
          accessToken,
          accessTokenExpires
        ) {
          await client.create({
            _type: "account",
            providerId,
            providerType,
            providerAccountId: `${providerAccountId}`,
            refreshToken,
            accessToken,
            accessTokenExpires,
            user: {
              _type: "reference",
              _ref: userId,
            },
          })
        },

        async getUserByProviderAccountId(providerId, providerAccountId) {
          const account = await client.fetch(getUserByProviderAccountIdQuery, {
            providerId,
            providerAccountId: String(providerAccountId),
          })

          return account?.user
        },

        async getUserByEmail(email) {
          const user = await client.fetch(getUserByEmailQuery, {
            email,
          })

          return user
        },

        async createSession() {
          console.log("[createSession] method not implemented")

          return {} as any
        },
        async getSession() {
          console.log("[getSession] method not implemented")
          return {} as any
        },
        async updateSession() {
          console.log("[updateSession] method not implemented")
          return {} as any
        },
        async deleteSession() {
          console.log("[deleteSession] method not implemented")
        },

        async updateUser(user) {
          const { id, name, email, image } = user

          userCache.set(id, user)

          const newUser = await client
            .patch(id)
            .set({
              name,
              email,
              image,
            })
            .commit()

          return {
            id: newUser._id,
            ...newUser,
          }
        },
      }
    },
  }
}
