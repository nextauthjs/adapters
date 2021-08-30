import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  ValueTransformer,
} from "typeorm"

const dateTransformer: ValueTransformer = {
  from: (date: string) => new Date(date),
  to: (date?: Date) => date?.toISOString(),
}

const bigIntTransformer: ValueTransformer = {
  from: (bigInt: string) => parseInt(bigInt, 10),
  to: (bigInt?: number) => bigInt?.toString(),
}

@Entity()
export class User {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ nullable: true })
  name?: string

  @Column({ nullable: true, unique: true })
  email?: string

  @Column({ nullable: true, transformer: dateTransformer })
  emailVerified!: string

  @Column({ nullable: true })
  image?: string

  @OneToMany(() => Session, (session) => session.userId)
  sessions!: Session[]

  @OneToMany(() => Account, (account) => account.userId)
  accounts!: Account[]
}

@Entity()
export class Account {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "uuid" })
  userId!: string

  @Column()
  type!: string

  @Column()
  provider!: string

  @Column()
  providerAccountId!: string

  @Column({ nullable: true })
  refresh_token?: string

  @Column({ nullable: true })
  access_token?: string

  @Column({ nullable: true, type: "bigint", transformer: bigIntTransformer })
  expires_at?: number

  @Column({ nullable: true })
  token_type?: string

  @Column({ nullable: true })
  scope?: string

  @Column({ nullable: true })
  id_token?: string

  @Column({ nullable: true })
  session_state?: string

  @Column({ nullable: true })
  oauth_token_secret?: string

  @Column({ nullable: true })
  oauth_token?: string

  @ManyToOne(() => User, (user) => user.accounts, {
    createForeignKeyConstraints: true,
  })
  user!: User
}

@Entity()
export class Session {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ unique: true })
  sessionToken!: string

  @Column({ type: "uuid" })
  userId!: string

  @Column({ transformer: dateTransformer })
  expires!: string

  @ManyToOne(() => User, (user) => user.sessions)
  user!: User
}

@Entity()
export class VerificationToken {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column()
  token!: string

  @Column()
  identifier!: string

  @Column({ transformer: dateTransformer })
  expires!: string
}
