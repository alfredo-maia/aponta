import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermission } from '../auth/decorators/require-permission.decorator';
import { UpdateScheduledJobDto } from './dto/update-scheduled-job.dto';
import { JobsService } from './jobs.service';

/** DMTE-462 T3: MANAGE_SCHEDULED_JOBS em toda rota; o ADMIN passa pelo guard, como nas demais configurações. */
@UseGuards(JwtAuthGuard, PermissionsGuard)
@Controller('scheduled-jobs')
export class JobsController {
  constructor(private readonly jobs: JobsService) {}

  @Get()
  @RequirePermission('MANAGE_SCHEDULED_JOBS')
  list() {
    return this.jobs.list();
  }

  @Patch(':type')
  @RequirePermission('MANAGE_SCHEDULED_JOBS')
  update(@Param('type') type: string, @Body() dto: UpdateScheduledJobDto) {
    return this.jobs.update(type, dto);
  }
}
