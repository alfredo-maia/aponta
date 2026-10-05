-- AlterTable
ALTER TABLE "ServiceDesk" ADD COLUMN     "organizationId" TEXT,
ADD COLUMN     "slaCriticalResolveHours" INTEGER,
ADD COLUMN     "slaCriticalResponseHours" INTEGER,
ADD COLUMN     "slaHighResolveHours" INTEGER,
ADD COLUMN     "slaHighResponseHours" INTEGER,
ADD COLUMN     "slaLowResolveHours" INTEGER,
ADD COLUMN     "slaLowResponseHours" INTEGER,
ADD COLUMN     "slaMediumResolveHours" INTEGER,
ADD COLUMN     "slaMediumResponseHours" INTEGER;

-- CreateIndex
CREATE INDEX "ServiceDesk_organizationId_idx" ON "ServiceDesk"("organizationId");

-- AddForeignKey
ALTER TABLE "ServiceDesk" ADD CONSTRAINT "ServiceDesk_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
