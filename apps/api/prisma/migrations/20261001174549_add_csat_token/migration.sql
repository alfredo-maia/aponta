-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "csatToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Ticket_csatToken_key" ON "Ticket"("csatToken");
