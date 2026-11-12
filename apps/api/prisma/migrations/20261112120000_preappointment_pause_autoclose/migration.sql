-- DMTE-462 T4: pausa gravada no servidor e fechamento automático do cronômetro.
CREATE TYPE "PreLockReason" AS ENUM ('LIMIT', 'PAUSE_EXPIRED', 'WINDOW_CLOSED');

ALTER TABLE "PreAppointment"
  ADD COLUMN "windowEndsAt" TIMESTAMP(3),
  ADD COLUMN "pausedAt" TIMESTAMP(3),
  ADD COLUMN "pausedMs" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lockedReason" "PreLockReason";

-- Tarefa agendada do fechamento automático (cron inicial de 1 minuto, editável na tela do T3).
INSERT INTO "ScheduledJob" ("type", "cron", "enabled", "nextRunAt", "updatedAt")
VALUES ('WORKLOG_AUTOCLOSE', '* * * * *', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("type") DO NOTHING;

-- Quem recebe o aviso de cronômetro encerrado é decidido só por um grupo explícito, sem membros;
-- quem entra nele é decisão do Alfredo em Configurações > Grupos de permissões.
INSERT INTO "PermissionGroup" ("id", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'Aviso de apontamento encerrado',
       'Quem pertence a este grupo recebe e-mail quando um cronômetro é encerrado automaticamente',
       ARRAY['RECEIVE_WORKLOG_AUTOCLOSE_ALERT'], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PermissionGroup" WHERE "name" = 'Aviso de apontamento encerrado');
