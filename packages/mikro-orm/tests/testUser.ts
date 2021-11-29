import {
  Cascade,
  Collection,
  Entity,
  OneToMany,
  PrimaryKey,
  Property,
  Unique,
} from "@mikro-orm/core"
import { Session, Account } from "next-auth"
import { randomUUID } from "../../../basic-tests"
import type { defaultEntities } from "../src"

@Entity()
export class User implements defaultEntities.User {
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
    hidden: true,
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  sessions = new Collection<Session>(this)

  @OneToMany({
    entity: () => Account,
    mappedBy: (account) => account.user,
    hidden: true,
    orphanRemoval: true,
    cascade: [Cascade.ALL],
  })
  accounts = new Collection<Account>(this)

  @Property()
  role = "ADMIN"

  constructor(
    parameters: Omit<User, "id" | "emailVerified" | "sessions" | "accounts">
  ) {
    // store emails lowerCase
    parameters.email = parameters.email?.toLowerCase()
    Object.assign(this, parameters)
  }
}
