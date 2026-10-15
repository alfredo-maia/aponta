CREATE TABLE "TicketStage" (
    "id" TEXT NOT NULL,
    "serviceDeskId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isInitial" BOOLEAN NOT NULL DEFAULT false,
    "isFinal" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TicketStage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "TicketStageTransition" (
    "id" TEXT NOT NULL,
    "fromStageId" TEXT NOT NULL,
    "toStageId" TEXT NOT NULL,

    CONSTRAINT "TicketStageTransition_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Ticket" ADD COLUMN "stageId" TEXT;

CREATE INDEX "TicketStage_serviceDeskId_position_idx" ON "TicketStage"("serviceDeskId", "position");
CREATE UNIQUE INDEX "TicketStageTransition_fromStageId_toStageId_key" ON "TicketStageTransition"("fromStageId", "toStageId");
CREATE INDEX "TicketStageTransition_fromStageId_idx" ON "TicketStageTransition"("fromStageId");
CREATE INDEX "TicketStageTransition_toStageId_idx" ON "TicketStageTransition"("toStageId");
CREATE INDEX "Ticket_stageId_idx" ON "Ticket"("stageId");

ALTER TABLE "TicketStage" ADD CONSTRAINT "TicketStage_serviceDeskId_fkey" FOREIGN KEY ("serviceDeskId") REFERENCES "ServiceDesk"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketStageTransition" ADD CONSTRAINT "TicketStageTransition_fromStageId_fkey" FOREIGN KEY ("fromStageId") REFERENCES "TicketStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketStageTransition" ADD CONSTRAINT "TicketStageTransition_toStageId_fkey" FOREIGN KEY ("toStageId") REFERENCES "TicketStage"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "TicketStage"("id") ON DELETE SET NULL ON UPDATE CASCADE;

INSERT INTO "TicketStage" ("id", "serviceDeskId", "name", "position", "isInitial", "isFinal")
SELECT d.id || '-stage-initial', d.id, 'Pendente', 0, true, false FROM "ServiceDesk" d
UNION ALL
SELECT d.id || '-stage-final', d.id, 'Fechado', 1, false, true FROM "ServiceDesk" d;

INSERT INTO "TicketStageTransition" ("id", "fromStageId", "toStageId")
SELECT d.id || '-stage-tr-initial-final', d.id || '-stage-initial', d.id || '-stage-final'
FROM "ServiceDesk" d;

UPDATE "Ticket" t
SET "stageId" = t."serviceDeskId" || '-stage-final'
WHERE t."status" IN ('CLOSED', 'RESOLVED');

UPDATE "Ticket" t
SET "stageId" = t."serviceDeskId" || '-stage-initial'
WHERE t."stageId" IS NULL;
