-- DMTE-462 T5: liberações de apontamento (tipos Lançamento e Cronômetro encerrado).
CREATE TYPE "WorklogApprovalType" AS ENUM ('LANCAMENTO', 'CRONOMETRO_ENCERRADO');
CREATE TYPE "WorklogApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

ALTER TABLE "Worklog"
  ADD COLUMN "approvalType" "WorklogApprovalType",
  ADD COLUMN "approvalStatus" "WorklogApprovalStatus",
  ADD COLUMN "approvalReason" TEXT,
  ADD COLUMN "approvalDecidedBy" TEXT,
  ADD COLUMN "approvalDecidedAt" TIMESTAMP(3),
  ADD COLUMN "approvalDecisionNote" TEXT,
  ADD COLUMN "approvalRequestedBy" TEXT;

CREATE INDEX "Worklog_approvalStatus_approvalType_idx" ON "Worklog"("approvalStatus", "approvalType");

-- Quem libera cada tipo é decidido só por grupos explícitos, sem membros; quem entra neles é decisão do Alfredo.
INSERT INTO "PermissionGroup" ("id", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'Liberação: lançamento',
       'Quem pertence a este grupo libera ou nega lançamentos que quebraram uma regra de apontamento',
       ARRAY['APPROVE_WORKLOG_ENTRY'], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PermissionGroup" WHERE "name" = 'Liberação: lançamento');

INSERT INTO "PermissionGroup" ("id", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'Liberação: cronômetro encerrado',
       'Quem pertence a este grupo libera ou nega a conversão de cronômetros encerrados pelo sistema',
       ARRAY['APPROVE_WORKLOG_SYSTEM_CLOSED'], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PermissionGroup" WHERE "name" = 'Liberação: cronômetro encerrado');
