import { Module } from '@nestjs/common';
import { ServiceDesksService } from './service-desks.service';
import { ServiceDesksController } from './service-desks.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { HolidaysImportService } from './holidays-import.service';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceDesksController],
  providers: [ServiceDesksService, HolidaysImportService],
  exports: [ServiceDesksService],
})
export class ServiceDesksModule {}
