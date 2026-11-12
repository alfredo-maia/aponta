import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { isValidCron, nextRun } from './cron';

export const JOB_HANDLERS = 'JOB_HANDLERS';
export type JobHandlers = Record<string, () => Promise<void>>;

const RECENT_RUNS = 10;
const KEEP_RUNS_MS = 30 * 86_400_000;
const STUCK_RUN_MS = 15 * 60_000;

interface ClaimedJob {
  type: string;
  failures: number;
  runId: string;
}

@Injectable()
export class JobsService {
  private readonly logger = new Logger(JobsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(JOB_HANDLERS) private readonly handlers: JobHandlers,
  ) {}

  list() {
    return this.prisma.scheduledJob.findMany({
      orderBy: { type: 'asc' },
      include: { runs: { orderBy: { startedAt: 'desc' }, take: RECENT_RUNS } },
    });
  }

  async update(type: string, dto: { cron?: string; enabled?: boolean }) {
    const job = await this.prisma.scheduledJob.findUnique({ where: { type } });
    if (!job) throw new NotFoundException('Tarefa agendada não encontrada');
    if (dto.cron !== undefined && !isValidCron(dto.cron)) {
      throw new BadRequestException('Expressão cron inválida (use 5 campos: minuto hora dia mês dia-da-semana)');
    }
    const cron = dto.cron ?? job.cron;
    const reschedule = dto.cron !== undefined || (dto.enabled === true && !job.enabled);
    return this.prisma.scheduledJob.update({
      where: { type },
      data: { cron, enabled: dto.enabled ?? job.enabled, ...(reschedule ? { nextRunAt: nextRun(cron, new Date()) } : {}) },
    });
  }

  /**
   * Pega as tarefas vencidas com FOR UPDATE SKIP LOCKED e já agenda a próxima ocorrência na mesma transação:
   * duas instâncias não repetem a tarefa, e uma tarefa atrasada por reinício roda uma vez, sem repor as perdidas.
   */
  async runDue(now: Date): Promise<string[]> {
    // Execução que ficou RUNNING além do prazo: a instância caiu no meio; registra a causa.
    await this.prisma.jobRun.updateMany({
      where: { status: 'RUNNING', startedAt: { lt: new Date(now.getTime() - STUCK_RUN_MS) } },
      data: { status: 'FAILED', error: 'Execução interrompida (a instância caiu ou reiniciou)', finishedAt: now },
    });
    const claimed = await this.prisma.$transaction(async (tx) => {
      const due = await tx.$queryRaw<{ type: string; cron: string; failures: number }[]>`
        SELECT "type", "cron", "failures" FROM "ScheduledJob"
        WHERE "enabled" = true AND "nextRunAt" <= ${now}
        ORDER BY "nextRunAt" FOR UPDATE SKIP LOCKED`;
      const jobs: ClaimedJob[] = [];
      for (const job of due) {
        let next: Date;
        try {
          next = nextRun(job.cron, now);
        } catch (cause) {
          // Cron ruim no banco não pode derrubar as outras tarefas: desativa esta e registra a falha.
          await tx.scheduledJob.update({ where: { type: job.type }, data: { enabled: false, lastRunAt: now, failures: job.failures + 1 } });
          await tx.jobRun.create({ data: { jobType: job.type, status: 'FAILED', attempt: job.failures + 1, startedAt: now, finishedAt: now,
            error: `Cron inválido, tarefa desativada: ${cause instanceof Error ? cause.message : String(cause)}` } });
          continue;
        }
        await tx.scheduledJob.update({ where: { type: job.type }, data: { nextRunAt: next, lastRunAt: now } });
        const run = await tx.jobRun.create({ data: { jobType: job.type, status: 'RUNNING', attempt: job.failures + 1, startedAt: now } });
        jobs.push({ type: job.type, failures: job.failures, runId: run.id });
      }
      return jobs;
    });
    for (const job of claimed) await this.execute(job, now);
    return claimed.map((job) => job.type);
  }

  private async execute(job: ClaimedJob, now: Date) {
    let error: string | null = null;
    try {
      const handler = this.handlers[job.type];
      if (!handler) throw new Error('Tipo sem código registrado (handler)');
      await handler();
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
    try {
      await this.prisma.jobRun.update({
        where: { id: job.runId },
        data: { status: error === null ? 'SUCCESS' : 'FAILED', error, finishedAt: new Date() },
      });
      await this.prisma.scheduledJob.update({ where: { type: job.type }, data: { failures: error === null ? 0 : job.failures + 1 } });
      await this.prisma.jobRun.deleteMany({ where: { jobType: job.type, startedAt: { lt: new Date(now.getTime() - KEEP_RUNS_MS) } } });
    } catch (cause) {
      // O registro desta tarefa falhou; as seguintes seguem, e a execução RUNNING é fechada pelo prazo acima.
      this.logger.error(`Falha ao gravar o resultado de ${job.type}: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
}
