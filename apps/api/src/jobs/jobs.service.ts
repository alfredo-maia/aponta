import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export const JOB_HANDLERS = 'JOB_HANDLERS';
export type JobHandlers = Record<string, () => Promise<void>>;

/** DMTE-462 T3: stub neutro (sem o comportamento), substituído na implementação. */
@Injectable()
export class JobsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(JOB_HANDLERS) private readonly handlers: JobHandlers,
  ) {}

  async list(): Promise<unknown[]> {
    return [];
  }

  async update(_type: string, _dto: { cron?: string; enabled?: boolean }): Promise<unknown> {
    return undefined;
  }

  async runDue(_now: Date): Promise<string[]> {
    return [];
  }
}
