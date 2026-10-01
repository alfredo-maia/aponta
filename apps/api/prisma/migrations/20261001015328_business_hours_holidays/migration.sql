/*
  Warnings:

  - You are about to drop the column `businessHours` on the `ServiceDesk` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "ServiceDesk" DROP COLUMN "businessHours";

-- CreateTable
CREATE TABLE "BusinessHour" (
    "id" TEXT NOT NULL,
    "weekday" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,

    CONSTRAINT "BusinessHour_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Holiday" (
    "id" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "name" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,

    CONSTRAINT "Holiday_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BusinessHour_serviceDeskId_idx" ON "BusinessHour"("serviceDeskId");

-- CreateIndex
CREATE INDEX "Holiday_serviceDeskId_idx" ON "Holiday"("serviceDeskId");

-- AddForeignKey
ALTER TABLE "BusinessHour" ADD CONSTRAINT "BusinessHour_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Holiday" ADD CONSTRAINT "Holiday_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
