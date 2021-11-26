import { randomUUID } from "crypto"

import {
  Property,
  Unique,
  PrimaryKey,
  Entity,
  Enum,
  OneToMany,
  Collection,
  ManyToOne,
  Cascade,
} from "@mikro-orm/core"
import type { DefaultAccount } from "next-auth"
import type {
  AdapterSession,
  AdapterUser,
  VerificationToken as AdapterVerificationToken,
} from "next-auth/adapters"
import type { ProviderType } from "next-auth/providers"

export type RemoveIndex<T> = {
  // eslint-disable-next-line @typescript-eslint/ban-types
  [K in keyof T as {} extends Record<K, 1> ? never : K]: T[K]
}

@Entity()
export class User implements RemoveIndex<AdapterUser> {
  @PrimaryKey()
  id: string = randomUUID()

  @Property({ nullable: true })
  name?: string

  @Property({ nullable: true })
  @Unique()
  email?: string

  @Property({ type: "Date", nullable: true })
  emailVerified: Date | null = null

  @Property({ nullable: true })
  image?: string

  @OneToMany({
    entity: () => Session,
    mappedBy: (session) => session.user,
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  sessions = new Collection<Session>(this)

  @OneToMany({
    entity: () => Account,
    mappedBy: (account) => account.user,
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  accounts = new Collection<Account>(this)

  constructor(
    parameters: Omit<User, "id" | "emailVerified" | "sessions" | "accounts">
  ) {
    // store emails lowerCase
    parameters.email = parameters.email?.toLowerCase()
    Object.assign(this, parameters)
  }
}

@Entity()
export class Session implements AdapterSession {
  @PrimaryKey({ default: randomUUID() })
  id: string = randomUUID()

  @ManyToOne({
    entity: () => User,
    hidden: true,
    onDelete: "cascade",
  })
  user!: User

  @Property({ persist: false })
  userId!: string

  @Property()
  expires!: Date

  @Property()
  @Unique()
  sessionToken!: string

  constructor(parameters: Omit<Session, "id" | "user">) {
    Object.assign(this, parameters)
  }
}

@Entity()
export class Account implements RemoveIndex<DefaultAccount> {
  @PrimaryKey()
  id: string = randomUUID()

  @ManyToOne({
    entity: () => User,
    hidden: true,
    onDelete: "cascade",
  })
  user!: User

  @Property({ persist: false })
  userId!: string

  @Enum()
  type!: ProviderType

  @Property()
  provider!: string

  @Property()
  providerAccountId!: string

  @Property({ nullable: true })
  refresh_token?: string

  @Property({ nullable: true })
  access_token?: string

  @Property({ nullable: true })
  expires_at?: number

  @Property({ nullable: true })
  token_type?: string

  @Property({ nullable: true })
  scope?: string

  @Property({ nullable: true })
  id_token?: string

  @Property({ nullable: true })
  session_state?: string

  constructor(parameters: Omit<Account, "id" | "user">) {
    Object.assign(this, parameters)
  }
}

@Entity()
export class VerificationToken implements AdapterVerificationToken {
  @PrimaryKey()
  @Property()
  token!: string

  @Property()
  expires!: Date

  @Property()
  identifier!: string

  constructor(parameters: Omit<VerificationToken, "id">) {
    Object.assign(this, parameters)
  }
}