-- AlterTable
ALTER TABLE "ContractTerm" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "approved" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "createdBy" TEXT,
ADD COLUMN     "endsAt" TIMESTAMP(3),
ADD COLUMN     "startsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "OrganizationDeskEvent" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "TechnicianCostRate" ADD COLUMN     "createdBy" TEXT;

-- AlterTable
ALTER TABLE "Worklog" ADD COLUMN     "voidedAt" TIMESTAMP(3),
ADD COLUMN     "voidedBy" TEXT;
