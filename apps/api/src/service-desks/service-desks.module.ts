import { Module } from '@nestjs/common';
import { ServiceDesksService } from './service-desks.service';
import { ServiceDesksController } from './service-desks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HolidaysImportService } from './holidays-import.service';
import { TicketStagesService } from './ticket-stages.service';
import { ServiceDeskCatalogService } from './service-desk-catalog.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ServiceDesksController],
  providers: [
    ServiceDesksService,
    HolidaysImportService,
    TicketStagesService,
    ServiceDeskCatalogService,
  ],
  exports: [ServiceDesksService, TicketStagesService, ServiceDeskCatalogService],
})
export class ServiceDesksModule {}
