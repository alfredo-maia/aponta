-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "ContractType" ADD VALUE 'FIXED_PROJECT';
ALTER TYPE "ContractType" ADD VALUE 'MONTHLY_HOURS';
ALTER TYPE "ContractType" ADD VALUE 'HOURLY';

-- AlterEnum
ALTER TYPE "ValuationType" ADD VALUE 'BONUS';

-- AlterTable
ALTER TABLE "Contract" ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "estimatedMinutes" INTEGER,
ADD COLUMN     "fixedPriceCents" INTEGER,
ADD COLUMN     "hourlyRateCents" INTEGER,
ADD COLUMN     "monthlyFeeCents" INTEGER,
ADD COLUMN     "scope" TEXT;

-- AlterTable
ALTER TABLE "PreAppointment" ADD COLUMN     "contractId" TEXT;

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "commercialOrganizationId" TEXT;

-- AlterTable
ALTER TABLE "Worklog" ADD COLUMN     "bonusReason" TEXT,
ADD COLUMN     "costCents" INTEGER;

-- CreateTable
CREATE TABLE "OrganizationDeskEvent" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "linked" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationDeskEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTerm" (
    "id" TEXT NOT NULL,
    "contractId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "type" "ContractType" NOT NULL,
    "includedMinutes" INTEGER,
    "hourlyRateCents" INTEGER,
    "excessHourlyRateCents" INTEGER,
    "monthlyFeeCents" INTEGER,
    "fixedPriceCents" INTEGER,
    "estimatedMinutes" INTEGER,
    "scope" TEXT,
    "serviceDeskIds" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ContractTerm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianCostRate" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "hourlyCostCents" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicianCostRate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ContractToServiceDesk" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ContractToServiceDesk_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "OrganizationDeskEvent_organizationId_createdAt_idx" ON "OrganizationDeskEvent"("organizationId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "ContractTerm_contractId_effectiveFrom_key" ON "ContractTerm"("contractId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianCostRate_userId_effectiveFrom_key" ON "TechnicianCostRate"("userId", "effectiveFrom");

-- CreateIndex
CREATE INDEX "_ContractToServiceDesk_B_index" ON "_ContractToServiceDesk"("B");

-- AddForeignKey
ALTER TABLE "OrganizationDeskEvent" ADD CONSTRAINT "OrganizationDeskEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_commercialOrganizationId_fkey" FOREIGN KEY ("commercialOrganizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTerm" ADD CONSTRAINT "ContractTerm_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianCostRate" ADD CONSTRAINT "TechnicianCostRate_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreAppointment" ADD CONSTRAINT "PreAppointment_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "Contract"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractToServiceDesk" ADD CONSTRAINT "_ContractToServiceDesk_A_fkey" FOREIGN KEY ("A") REFERENCES "Contract"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ContractToServiceDesk" ADD CONSTRAINT "_ContractToServiceDesk_B_fkey" FOREIGN KEY ("B") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
