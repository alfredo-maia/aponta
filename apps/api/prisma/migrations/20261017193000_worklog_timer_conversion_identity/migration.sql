-- AlterTable
ALTER TABLE "Worklog" ADD COLUMN     "sourcePreAppointmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Worklog_sourcePreAppointmentId_key" ON "Worklog"("sourcePreAppointmentId");
