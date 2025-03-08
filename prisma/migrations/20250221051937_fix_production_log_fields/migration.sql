/*
  Warnings:

  - Changed the type of `startTime` on the `ProductionLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `endTime` on the `ProductionLog` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- DropIndex
DROP INDEX "ProductionLog_date_idx";

-- DropIndex
DROP INDEX "ProductionLog_userId_idx";

-- First create temporary columns
ALTER TABLE "ProductionLog" ADD COLUMN "startTime_new" TIMESTAMP(3);
ALTER TABLE "ProductionLog" ADD COLUMN "endTime_new" TIMESTAMP(3);

-- Copy data with conversion
UPDATE "ProductionLog" 
SET "startTime_new" = "startTime"::timestamp,
    "endTime_new" = "endTime"::timestamp;

-- Drop old columns
ALTER TABLE "ProductionLog" DROP COLUMN "startTime";
ALTER TABLE "ProductionLog" DROP COLUMN "endTime";

-- Rename new columns
ALTER TABLE "ProductionLog" RENAME COLUMN "startTime_new" TO "startTime";
ALTER TABLE "ProductionLog" RENAME COLUMN "endTime_new" TO "endTime";

-- Add NOT NULL constraints
ALTER TABLE "ProductionLog" ALTER COLUMN "startTime" SET NOT NULL;
ALTER TABLE "ProductionLog" ALTER COLUMN "endTime" SET NOT NULL;

-- Add Text columns for QR data
ALTER TABLE "ProductionLog" ALTER COLUMN "qrCodeData" TYPE TEXT;
ALTER TABLE "ProductionLog" ALTER COLUMN "qrCodeImage" TYPE TEXT;
