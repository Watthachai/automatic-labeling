/*
  Warnings:

  - You are about to drop the column `used` on the `TwoFactorCode` table. All the data in the column will be lost.
  - Added the required column `updatedAt` to the `ProductionLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `username` to the `ProductionLog` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "ProductionLog_batch_idx";

-- AlterTable
ALTER TABLE "ProductionLog" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "username" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "TwoFactorCode" DROP COLUMN "used",
ADD COLUMN     "isUsed" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "AuditLog"("action");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE INDEX "ProductionLog_userId_idx" ON "ProductionLog"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorCode_userId_idx" ON "TwoFactorCode"("userId");

-- CreateIndex
CREATE INDEX "TwoFactorCode_code_idx" ON "TwoFactorCode"("code");
