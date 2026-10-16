-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "excessHourlyRateCents" INTEGER,
ADD COLUMN     "includedMinutes" INTEGER,
ADD COLUMN     "name" TEXT,
ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Worklog" ADD COLUMN     "contractId" TEXT,
ADD COLUMN     "valuationSnapshot" JSONB,
ADD COLUMN     "valueCents" INTEGER,
ALTER COLUMN "startTime" DROP DEFAULT,
ALTER COLUMN "endTime" DROP DEFAULT;

-- CreateIndex
CREATE INDEX "Worklog_contractId_startTime_idx" ON "Worklog"("contractId", "startTime");

-- AddForeignKey
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
