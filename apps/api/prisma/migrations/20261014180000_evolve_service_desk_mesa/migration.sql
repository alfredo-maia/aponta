-- CreateEnum
CREATE TYPE "ServiceDeskReviewType" AS ENUM ('INTERNAL', 'CLIENT', 'BOTH');

-- CreateEnum
CREATE TYPE "ServiceDeskSectionKey" AS ENUM (
  'GENERAL_INFO',
  'CATEGORY',
  'SERVICE_TYPE',
  'WORKLOGS',
  'COMMUNICATION',
  'APPOINTMENTS',
  'VALUATION',
  'E_SIGNATURE',
  'GITHUB',
  'HISTORY',
  'TROUBLESHOOTING'
);

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "extension" TEXT;

-- AlterTable Ticket
ALTER TABLE "Ticket" ADD COLUMN "resourceGroup" TEXT;

-- AlterTable ServiceDesk
ALTER TABLE "ServiceDesk"
  ADD COLUMN "displayName" TEXT,
  ADD COLUMN "description" TEXT,
  ADD COLUMN "active" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "acceptingNewTickets" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "internalUse" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "worklogsWithValuation" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowCrossDeskInteraction" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowCancelTicket" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "catalogRequiredOnOpen" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "slaControlEnabled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowAddSlaHours" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "allowPauseResumeSla" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "reviewFlowEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "evaluationEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "openByAgentsOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireRequesterName" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireRequesterEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireRequesterPhone" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireRequesterExtension" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireResourceGroup" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "requireAttachments" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "listedGroupsOnly" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "unlistedCanCreateTicket" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "defaultOpenStatus" "TicketStatus" NOT NULL DEFAULT 'OPEN',
  ADD COLUMN "defaultClosedStatus" "TicketStatus" NOT NULL DEFAULT 'CLOSED',
  ADD COLUMN "allowReopenUnbilled" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "allowReopenBilled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reopenDefaultReplyUnbilled" TEXT,
  ADD COLUMN "reopenDefaultReplyBilled" TEXT,
  ADD COLUMN "reviewType" "ServiceDeskReviewType",
  ADD COLUMN "reviewDeadlineDays" INTEGER,
  ADD COLUMN "reviewNotifyEmail" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReminder" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "reviewReapplyReopen" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "ServiceDeskPriority" (
    "id" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "ticketPriority" "TicketPriority" NOT NULL,
    "label" TEXT NOT NULL,
    "icon" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "ServiceDeskPriority_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServiceDeskTicketSection" (
    "id" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "key" "ServiceDeskSectionKey" NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceDeskTicketSection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ServiceDeskPriority_serviceDeskId_ticketPriority_key" ON "ServiceDeskPriority"("serviceDeskId", "ticketPriority");
CREATE INDEX "ServiceDeskPriority_serviceDeskId_idx" ON "ServiceDeskPriority"("serviceDeskId");
CREATE UNIQUE INDEX "ServiceDeskTicketSection_serviceDeskId_key_key" ON "ServiceDeskTicketSection"("serviceDeskId", "key");
CREATE INDEX "ServiceDeskTicketSection_serviceDeskId_idx" ON "ServiceDeskTicketSection"("serviceDeskId");

-- AddForeignKey
ALTER TABLE "ServiceDeskPriority" ADD CONSTRAINT "ServiceDeskPriority_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ServiceDeskTicketSection" ADD CONSTRAINT "ServiceDeskTicketSection_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill default priorities for existing desks
INSERT INTO "ServiceDeskPriority" ("id", "serviceDeskId", "ticketPriority", "label", "icon", "sortOrder", "enabled")
SELECT d.id || '-prio-CRITICAL', d.id, 'CRITICAL'::"TicketPriority", 'Crítica', 'critical', 0, true FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-prio-HIGH', d.id, 'HIGH'::"TicketPriority", 'Alta', 'high', 1, true FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-prio-MEDIUM', d.id, 'MEDIUM'::"TicketPriority", 'Média', 'medium', 2, true FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-prio-LOW', d.id, 'LOW'::"TicketPriority", 'Baixa', 'low', 3, true FROM "ServiceDesk" d;

-- Backfill ticket sections: enabled for modules Aponta already renders
INSERT INTO "ServiceDeskTicketSection" ("id", "serviceDeskId", "key", "enabled", "sortOrder")
SELECT d.id || '-sec-GENERAL_INFO', d.id, 'GENERAL_INFO'::"ServiceDeskSectionKey", true, 0 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-CATEGORY', d.id, 'CATEGORY'::"ServiceDeskSectionKey", true, 1 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-SERVICE_TYPE', d.id, 'SERVICE_TYPE'::"ServiceDeskSectionKey", false, 2 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-WORKLOGS', d.id, 'WORKLOGS'::"ServiceDeskSectionKey", true, 3 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-COMMUNICATION', d.id, 'COMMUNICATION'::"ServiceDeskSectionKey", true, 4 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-APPOINTMENTS', d.id, 'APPOINTMENTS'::"ServiceDeskSectionKey", true, 5 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-VALUATION', d.id, 'VALUATION'::"ServiceDeskSectionKey", true, 6 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-E_SIGNATURE', d.id, 'E_SIGNATURE'::"ServiceDeskSectionKey", false, 7 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-GITHUB', d.id, 'GITHUB'::"ServiceDeskSectionKey", false, 8 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-HISTORY', d.id, 'HISTORY'::"ServiceDeskSectionKey", true, 9 FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-sec-TROUBLESHOOTING', d.id, 'TROUBLESHOOTING'::"ServiceDeskSectionKey", false, 10 FROM "ServiceDesk" d;
