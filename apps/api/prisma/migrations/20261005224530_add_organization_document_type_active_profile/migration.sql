-- CreateEnum
CREATE TYPE "DocumentType" AS ENUM ('CNPJ', 'CPF');
-- AlterTable
ALTER TABLE "Organization" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "cpf" TEXT,
ADD COLUMN     "documentType" "DocumentType" DEFAULT 'CNPJ',
ADD COLUMN     "healthStatus" TEXT,
ADD COLUMN     "serviceType" TEXT;
-- CreateIndex
CREATE UNIQUE INDEX "Organization_cpf_key" ON "Organization"("cpf");
