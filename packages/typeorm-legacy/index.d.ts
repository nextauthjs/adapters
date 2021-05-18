import { Profile, Session, User } from "next-auth"
import { ConnectionOptions, EntitySchema } from "typeorm"
import { Adapter } from "next-auth/adapters"

/**
 * TODO: fix auto-type schema
 */
type Schema<T = any> = EntitySchema<T>["options"]

export class TypeORMUserModel implements User {
  name?: string
  email?: string
  image?: string
  emailVerified?: Date

  constructor(
    name?: string,
    email?: string,
    image?: string,
    emailVerified?: Date
  )
  [x: string]: unknown
}

export class TypeORMSessionModel {
  userId: number
  expires: Date | string
  sessionToken: string
  accessToken: string

  constructor(
    userId: number,
    expires: Date,
    sessionToken?: string,
    accessToken?: string
  )
}

export class TypeORMVerificationRequestModel {
  identifier: string
  token: string
  expires: Date
  constructor(identifier: string, token: string, expires: Date)
}

export class TypeORMAccountModel {
  compoundId: string
  userId: number
  providerType: string
  providerId: string
  providerAccountId: string
  refreshToken?: string
  accessToken?: string
  accessTokenExpires?: Date

  constructor(
    userId: number,
    providerId: string,
    providerType: string,
    providerAccountId: string,
    refreshToken?: string,
    accessToken?: string,
    accessTokenExpires?: Date
  )
}

export interface TypeORMAdapterModels {
  Account: {
    model: TypeORMAccountModel
    schema: Schema<TypeORMAccountModel>
  }
  User: {
    model: TypeORMUserModel
    schema: Schema<TypeORMUserModel>
  }
  Session: {
    model: TypeORMSessionModel
    schema: Schema<TypeORMSessionModel>
  }
  VerificationRequest: {
    model: TypeORMVerificationRequestModel
    schema: Schema<TypeORMVerificationRequestModel>
  }
}

export type TypeORMAdapter<
  C = ConnectionOptions | string,
  O = { models?: TypeORMAdapterModels },
  U = User,
  P = Profile,
  S = Omit<Session, "expires"> & { expires: Date }
> = Adapter<C, O, U, P, S>

export { TypeORMAdapter as Adapter, TypeORMAdapterModels as Models }
