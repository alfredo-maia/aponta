-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "TicketStatus" ADD VALUE 'ESCALATED';
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_CUSTOMER';
ALTER TYPE "TicketStatus" ADD VALUE 'ON_HOLD';
ALTER TYPE "TicketStatus" ADD VALUE 'PENDING_APPROVAL';

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "slaAccumulatedPauseTime" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "slaPausedAt" TIMESTAMP(3);
