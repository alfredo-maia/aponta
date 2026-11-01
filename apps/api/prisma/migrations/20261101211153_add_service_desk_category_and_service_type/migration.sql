-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "categoryId" TEXT,
ADD COLUMN     "serviceTypeId" TEXT;

-- CreateTable
CREATE TABLE "ServiceDeskCategory" (
    "id" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceDeskCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDeskServiceType" (
    "id" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServiceDeskServiceType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ServiceDeskCategory_serviceDeskId_idx" ON "ServiceDeskCategory"("serviceDeskId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDeskCategory_serviceDeskId_name_key" ON "ServiceDeskCategory"("serviceDeskId", "name");

-- CreateIndex
CREATE INDEX "ServiceDeskServiceType_serviceDeskId_idx" ON "ServiceDeskServiceType"("serviceDeskId");

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDeskServiceType_serviceDeskId_name_key" ON "ServiceDeskServiceType"("serviceDeskId", "name");

-- CreateIndex
CREATE INDEX "Ticket_categoryId_idx" ON "Ticket"("categoryId");

-- CreateIndex
CREATE INDEX "Ticket_serviceTypeId_idx" ON "Ticket"("serviceTypeId");

-- AddForeignKey
ALTER TABLE "ServiceDeskCategory" ADD CONSTRAINT "ServiceDeskCategory_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceDeskServiceType" ADD CONSTRAINT "ServiceDeskServiceType_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "ServiceDeskCategory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_serviceTypeId_fkey" FOREIGN KEY ("serviceTypeId") REFERENCES "ServiceDeskServiceType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
