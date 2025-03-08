/*
  Warnings:

  - You are about to drop the `Production` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AuditLog" DROP CONSTRAINT "AuditLog_productionId_fkey";

-- DropForeignKey
ALTER TABLE "Production" DROP CONSTRAINT "Production_userId_fkey";

-- DropTable
DROP TABLE "Production";

-- CreateTable
CREATE TABLE "ActiveProduction" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "material" TEXT NOT NULL,
    "batch" TEXT NOT NULL,
    "vendorBatch" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3),
    "startCount" INTEGER NOT NULL,
    "endCount" INTEGER,
    "status" "Status" NOT NULL DEFAULT 'IN_PROGRESS',
    "verifiedBy" TEXT,
    "verifiedAt" TIMESTAMP(3),

    CONSTRAINT "ActiveProduction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductionLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "startCount" INTEGER NOT NULL,
    "endCount" INTEGER NOT NULL,
    "totalProduced" INTEGER NOT NULL,
    "material" TEXT,
    "batch" TEXT,
    "vendorBatch" TEXT,
    "materialDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActiveProduction_status_idx" ON "ActiveProduction"("status");

-- CreateIndex
CREATE INDEX "ActiveProduction_batch_idx" ON "ActiveProduction"("batch");

-- CreateIndex
CREATE INDEX "ProductionLog_date_idx" ON "ProductionLog"("date");

-- CreateIndex
CREATE INDEX "ProductionLog_batch_idx" ON "ProductionLog"("batch");

-- AddForeignKey
ALTER TABLE "ActiveProduction" ADD CONSTRAINT "ActiveProduction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductionLog" ADD CONSTRAINT "ProductionLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_productionId_fkey" FOREIGN KEY ("productionId") REFERENCES "ActiveProduction"("id") ON DELETE SET NULL ON UPDATE CASCADE;
