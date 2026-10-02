-- CreateEnum
CREATE TYPE "TicketSource" AS ENUM ('WEB', 'EMAIL', 'WHATSAPP');

-- AlterTable
ALTER TABLE "Ticket" ADD COLUMN     "source" "TicketSource" NOT NULL DEFAULT 'WEB';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "phone" TEXT;
