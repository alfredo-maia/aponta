import { Module } from '@nestjs/common';
import { ServiceDesksService } from './service-desks.service';
import { ServiceDesksController } from './service-desks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HolidaysImportService } from './holidays-import.service';
import { TicketStagesService } from './ticket-stages.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceDesksController],
  providers: [ServiceDesksService, HolidaysImportService, TicketStagesService],
  exports: [ServiceDesksService, TicketStagesService],
})
export class ServiceDesksModule {}
