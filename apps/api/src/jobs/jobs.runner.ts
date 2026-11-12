import { Injectable, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { JobsService } from './jobs.service';

/** Resolução de 30 s: o cron de cada tarefa tem granularidade de 1 minuto. */
@Injectable()
export class JobsRunner {
  private readonly logger = new Logger(JobsRunner.name);

  constructor(private readonly jobs: JobsService) {}

  @Interval(30_000)
  async tick() {
    try {
      await this.jobs.runDue(new Date());
    } catch (error) {
      this.logger.error(`Falha ao rodar as tarefas agendadas: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
