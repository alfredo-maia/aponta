-- AlterTable
ALTER TABLE "User" ADD COLUMN     "technicalGroupId" TEXT;

-- CreateTable
CREATE TABLE "PermissionGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PermissionGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicalGroup" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "dailyWorklogEmailEnabled" BOOLEAN NOT NULL DEFAULT false,
    "scheduleEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicalGroup_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PermissionGroupUser" (
    "permissionGroupId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGroupUser_pkey" PRIMARY KEY ("permissionGroupId","userId")
);

-- CreateTable
CREATE TABLE "PermissionGroupTechnicalGroup" (
    "permissionGroupId" TEXT NOT NULL,
    "technicalGroupId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PermissionGroupTechnicalGroup_pkey" PRIMARY KEY ("permissionGroupId","technicalGroupId")
);

-- CreateTable
CREATE TABLE "TechnicalGroupOrganization" (
    "technicalGroupId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalGroupOrganization_pkey" PRIMARY KEY ("technicalGroupId","organizationId")
);

-- CreateTable
CREATE TABLE "TechnicalGroupServiceDesk" (
    "technicalGroupId" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TechnicalGroupServiceDesk_pkey" PRIMARY KEY ("technicalGroupId","serviceDeskId")
);

-- CreateIndex
CREATE INDEX "PermissionGroupUser_userId_idx" ON "PermissionGroupUser"("userId");

-- CreateIndex
CREATE INDEX "PermissionGroupTechnicalGroup_technicalGroupId_idx" ON "PermissionGroupTechnicalGroup"("technicalGroupId");

-- CreateIndex
CREATE INDEX "TechnicalGroupOrganization_organizationId_idx" ON "TechnicalGroupOrganization"("organizationId");

-- CreateIndex
CREATE INDEX "TechnicalGroupServiceDesk_serviceDeskId_idx" ON "TechnicalGroupServiceDesk"("serviceDeskId");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_technicalGroupId_fkey" FOREIGN KEY ("technicalGroupId") REFERENCES "TechnicalGroup"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroupUser" ADD CONSTRAINT "PermissionGroupUser_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroupUser" ADD CONSTRAINT "PermissionGroupUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroupTechnicalGroup" ADD CONSTRAINT "PermissionGroupTechnicalGroup_permissionGroupId_fkey" FOREIGN KEY ("permissionGroupId") REFERENCES "PermissionGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PermissionGroupTechnicalGroup" ADD CONSTRAINT "PermissionGroupTechnicalGroup_technicalGroupId_fkey" FOREIGN KEY ("technicalGroupId") REFERENCES "TechnicalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalGroupOrganization" ADD CONSTRAINT "TechnicalGroupOrganization_technicalGroupId_fkey" FOREIGN KEY ("technicalGroupId") REFERENCES "TechnicalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalGroupOrganization" ADD CONSTRAINT "TechnicalGroupOrganization_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalGroupServiceDesk" ADD CONSTRAINT "TechnicalGroupServiceDesk_technicalGroupId_fkey" FOREIGN KEY ("technicalGroupId") REFERENCES "TechnicalGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicalGroupServiceDesk" ADD CONSTRAINT "TechnicalGroupServiceDesk_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
