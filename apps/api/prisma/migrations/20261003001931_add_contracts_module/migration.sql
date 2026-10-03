-- CreateEnum
CREATE TYPE "ContractType" AS ENUM ('FIXED_COVERAGE', 'HOURS_LIMIT');

-- CreateTable
CREATE TABLE "Contract" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "type" "ContractType" NOT NULL DEFAULT 'FIXED_COVERAGE',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "monthlyValue" DOUBLE PRECISION,
    "lastAmendmentValue" DOUBLE PRECISION,
    "hoursLimit" INTEGER,
    "adjustmentDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contract_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Contract" ADD CONSTRAINT "Contract_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
