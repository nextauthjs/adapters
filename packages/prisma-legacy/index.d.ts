import { Adapter } from "next-auth/adapters"

export type PrismaLegacyAdapter = Adapter<{
  prisma: any
  modelMapping?: {
    User: string
    Account: string
    Session: string
    VerificationRequest: string
  }
}>

export { PrismaLegacyAdapter as Adapter }
