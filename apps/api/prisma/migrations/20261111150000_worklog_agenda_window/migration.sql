-- DMTE-462 T2: janela da agenda para apontamento.
ALTER TABLE "Appointment" ADD COLUMN "ignoresWorklogRule" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "PreAppointment" ADD COLUMN "appointmentId" TEXT, ADD COLUMN "limitMinutes" INTEGER;
ALTER TABLE "Worklog" ADD COLUMN "appointmentId" TEXT;
CREATE INDEX "Worklog_appointmentId_idx" ON "Worklog"("appointmentId");
ALTER TABLE "PreAppointment" ADD CONSTRAINT "PreAppointment_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Worklog" ADD CONSTRAINT "Worklog_appointmentId_fkey" FOREIGN KEY ("appointmentId") REFERENCES "Appointment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Marcar um compromisso como "ignora a regra" depende só de um grupo explícito, sem membros;
-- quem entra nele é decidido em Configurações > Grupos de permissões.
INSERT INTO "PermissionGroup" ("id", "name", "description", "permissions", "updatedAt")
SELECT gen_random_uuid()::text, 'Apontamento sem agenda',
       'Quem pertence a este grupo marca compromissos que liberam o apontamento sem agenda do ticket',
       ARRAY['RELEASE_WORKLOG_WITHOUT_SCHEDULE'], CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "PermissionGroup" WHERE "name" = 'Apontamento sem agenda');
