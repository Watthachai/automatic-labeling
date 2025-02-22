/*
  Warnings:

  - You are about to drop the column `qrCode` on the `ProductionLog` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ProductionLog" DROP COLUMN "qrCode",
ADD COLUMN     "serialNumbers" TEXT[];
