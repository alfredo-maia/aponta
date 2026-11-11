-- DMTE-462 T3: tarefas agendadas com cron editável e registro das execuções.
CREATE TYPE "JobRunStatus" AS ENUM ('RUNNING', 'SUCCESS', 'FAILED');

CREATE TABLE "ScheduledJob" (
    "type" TEXT NOT NULL,
    "cron" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "nextRunAt" TIMESTAMP(3) NOT NULL,
    "lastRunAt" TIMESTAMP(3),
    "failures" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ScheduledJob_pkey" PRIMARY KEY ("type")
);

CREATE TABLE "JobRun" (
    "id" TEXT NOT NULL,
    "jobType" TEXT NOT NULL,
    "status" "JobRunStatus" NOT NULL DEFAULT 'RUNNING',
    "attempt" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3),
    "error" TEXT,
    CONSTRAINT "JobRun_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "JobRun_jobType_startedAt_idx" ON "JobRun"("jobType", "startedAt");
ALTER TABLE "JobRun" ADD CONSTRAINT "JobRun_jobType_fkey" FOREIGN KEY ("jobType") REFERENCES "ScheduledJob"("type") ON DELETE CASCADE ON UPDATE CASCADE;

-- Tarefa de verificação do agendador, com o valor inicial de 1 minuto.
INSERT INTO "ScheduledJob" ("type", "cron", "enabled", "nextRunAt", "updatedAt")
VALUES ('HEARTBEAT', '* * * * *', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
