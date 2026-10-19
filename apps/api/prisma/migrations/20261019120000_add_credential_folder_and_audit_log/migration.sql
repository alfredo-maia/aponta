-- CreateEnum
CREATE TYPE "CredentialAction" AS ENUM ('CREATE_FOLDER', 'DELETE_FOLDER', 'CREATE_CREDENTIAL', 'UPDATE_CREDENTIAL', 'DELETE_CREDENTIAL', 'REVEAL_CREDENTIAL', 'COPY_USERNAME', 'COPY_PASSWORD');

-- AlterTable
ALTER TABLE "Credential" ADD COLUMN     "folderId" TEXT;

-- CreateTable
CREATE TABLE "CredentialFolder" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CredentialFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CredentialAuditLog" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "action" "CredentialAction" NOT NULL,
    "folderId" TEXT,
    "credentialId" TEXT,
    "targetName" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorName" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CredentialAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CredentialFolder_organizationId_idx" ON "CredentialFolder"("organizationId");

-- CreateIndex
CREATE INDEX "CredentialAuditLog_organizationId_createdAt_idx" ON "CredentialAuditLog"("organizationId", "createdAt");

-- CreateIndex
CREATE INDEX "Credential_organizationId_idx" ON "Credential"("organizationId");

-- CreateIndex
CREATE INDEX "Credential_folderId_idx" ON "Credential"("folderId");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "CredentialFolder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CredentialFolder" ADD CONSTRAINT "CredentialFolder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
