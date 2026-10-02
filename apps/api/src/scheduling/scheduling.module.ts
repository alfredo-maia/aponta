import { Module } from '@nestjs/common';
import { SlaEscalationCron } from './sla-escalation.cron';


import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [SlaEscalationCron],
})
export class SchedulingModule {}
