-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "cnpj" TEXT,
ADD COLUMN     "legalName" TEXT,
ADD COLUMN     "municipalRegistration" TEXT,
ADD COLUMN     "stateRegistration" TEXT;

-- CreateTable
CREATE TABLE "OrganizationAddress" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "zipCode" TEXT,
    "street" TEXT,
    "neighborhood" TEXT,
    "city" TEXT,
    "state" TEXT,
    "complement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationContact" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrganizationContact_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Organization_cnpj_key" ON "Organization"("cnpj");

-- AddForeignKey
ALTER TABLE "OrganizationAddress" ADD CONSTRAINT "OrganizationAddress_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationContact" ADD CONSTRAINT "OrganizationContact_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
