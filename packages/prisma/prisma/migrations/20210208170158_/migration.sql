/*
  Warnings:

  - The migration will add a unique constraint covering the columns `[token]` on the table `VerificationRequest`. If there are existing duplicate values, the migration will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "VerificationRequest.token_unique" ON "VerificationRequest"("token");
