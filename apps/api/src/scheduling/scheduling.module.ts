import { Module } from '@nestjs/common';
import { SlaEscalationCron } from './sla-escalation.cron';

@Module({
  providers: [SlaEscalationCron],
})
export class SchedulingModule {}
