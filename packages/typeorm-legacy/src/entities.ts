import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from "typeorm"
import { bigIntTransformer, dateTransformer } from "./utils"

@Entity({ name: "users" })
export class UserEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ type: "varchar", nullable: true })
  name!: string | null

  @Column({ type: "varchar", nullable: true, unique: true })
  email!: string | null

  @Column({ type: "varchar", nullable: true, transformer: dateTransformer })
  emailVerified!: string | null

  @Column({ type: "varchar", nullable: true })
  image!: string | null

  @OneToMany(() => SessionEntity, (session) => session.userId)
  sessions!: SessionEntity[]

  @OneToMany(() => AccountEntity, (account) => account.userId)
  accounts!: AccountEntity[]
}

@Entity({ name: "accounts" })
export class AccountEntity {
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

  @Column({ type: "varchar", nullable: true })
  refresh_token!: string

  @Column({ type: "varchar", nullable: true })
  access_token!: string | null

  @Column({
    nullable: true,
    type: "bigint",
    transformer: bigIntTransformer,
  })
  expires_at!: number | null

  @Column({ type: "varchar", nullable: true })
  token_type!: string | null

  @Column({ type: "varchar", nullable: true })
  scope!: string | null

  @Column({ type: "varchar", nullable: true })
  id_token!: string | null

  @Column({ type: "varchar", nullable: true })
  session_state!: string | null

  @Column({ type: "varchar", nullable: true })
  oauth_token_secret!: string | null

  @Column({ type: "varchar", nullable: true })
  oauth_token!: string | null

  @ManyToOne(() => UserEntity, (user) => user.accounts, {
    createForeignKeyConstraints: true,
  })
  user!: UserEntity
}

@Entity({ name: "sessions" })
export class SessionEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column({ unique: true })
  sessionToken!: string

  @Column({ type: "uuid" })
  userId!: string

  @Column({ transformer: dateTransformer })
  expires!: string

  @ManyToOne(() => UserEntity, (user) => user.sessions)
  user!: UserEntity
}

@Entity({ name: "verification_tokens" })
export class VerificationTokenEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string

  @Column()
  token!: string

  @Column()
  identifier!: string

  @Column({ transformer: dateTransformer })
  expires!: string
}
