import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { PermissionsModule } from '../permissions/permissions.module';
import { WorklogsModule } from '../worklogs/worklogs.module';
import { WorklogAutoCloseService } from '../worklogs/worklog-autoclose.service';
import { JobsController } from './jobs.controller';
import { JOB_HANDLERS, JobsService } from './jobs.service';
import { JobsRunner } from './jobs.runner';
import { buildJobHandlers } from './job-handlers';

@Module({
  imports: [PrismaModule, PermissionsModule, WorklogsModule],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsRunner,
    { provide: JOB_HANDLERS, useFactory: buildJobHandlers, inject: [WorklogAutoCloseService] },
  ],
  exports: [JobsService],
})
export class JobsModule {}
