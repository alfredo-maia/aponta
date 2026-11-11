import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { JobsController } from './jobs.controller';
import { JOB_HANDLERS, JobHandlers, JobsService } from './jobs.service';
import { JobsRunner } from './jobs.runner';

/** Tipos de tarefa com código: cada fatia nova (T4...) registra o dela aqui. */
const handlers: JobHandlers = {
  HEARTBEAT: async () => undefined,
};

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [JobsController],
  providers: [JobsService, JobsRunner, { provide: JOB_HANDLERS, useValue: handlers }],
  exports: [JobsService],
})
export class JobsModule {}
