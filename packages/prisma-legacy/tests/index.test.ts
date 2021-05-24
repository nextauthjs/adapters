// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import * as Prisma from "@prisma/client"
// eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
// @ts-ignore
import { PrismaLegacyAdapter } from "../src"
import { runBasicTests } from "../../../basic-tests"

const prisma = new Prisma.PrismaClient()
const adapter = PrismaLegacyAdapter({ prisma })

runBasicTests({
  adapter,
  db: {
    async disconnect() {
      await prisma.$disconnect()
    },
    session(sessionToken) {
      return prisma.session.findUnique({ where: { sessionToken } })
    },
    expireSession(sessionToken, expires) {
      return prisma.session.update({
        where: { sessionToken },
        data: { expires },
      })
    },
    user(id) {
      return prisma.user.findUnique({ where: { id } })
    },
    account(id) {
      return prisma.account.findUnique({ where: { id } })
    },
    verificationRequest(identifier, hashedToken) {
      return prisma.verificationRequest.findUnique({
        where: { identifier_token: { identifier, token: hashedToken } },
      })
    },
  },
})
