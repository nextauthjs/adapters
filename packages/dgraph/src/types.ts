import { ProviderType } from "next-auth/providers"
export type userId = string
export type sessionId = string
export type userEmail = string
export type providerId = string
export type providerAccountId = string

export interface CreateUserInput {
  name?: string
  email?: userEmail
  image?: string
  emailVerified?: string | null
  createdAt: Date
  updatedAt: Date
}
export interface UpdateUserInput {
  [x: string]: unknown
  name?: string | null
  email?: userEmail | null
  image?: string | null
  emailVerified?: Date | null
  updatedAt: Date
}

export interface LinkAccountInput {
  providerAccountId: string
  provider: string
  type: ProviderType
}
export interface GetAccountInput {
  provider: string
  providerAccountId: string
}
export interface CreateSessionInput {
  sessionToken: string
  expires: Date
  createdAt: Date
  updatedAt: Date
  user: {
    id: userId | unknown
  }
}
export interface UpdateSessionInput {
  expires?: Date
  updatedAt?: Date
}
export interface CreateVerificationRequestInput {
  identifier: string
  token: string
  createdAt: Date
  updatedAt: Date
  expires: Date
}

export interface DGraphConstructor {
  endpoint: string
  apiKey: string
  jwtSecret?: string
  adminSecret?: string
  authHeader?: string
}

export interface GetUserByAccountInput {
  provider: string
  providerAccountId: string
}

export interface DeleteVerificationInput {
  identifier: string
  token: string
}
