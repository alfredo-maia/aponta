import { Controller } from '@nestjs/common';
import { JobsService } from './jobs.service';

/** DMTE-462 T3: stub neutro (sem rotas nem permissão), substituído na implementação. */
@Controller('scheduled-jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  list() {
    return this.jobs.list();
  }

  update(type: string, dto: { cron?: string; enabled?: boolean }) {
    return this.jobs.update(type, dto);
  }
}
