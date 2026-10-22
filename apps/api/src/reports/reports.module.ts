import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CommercialReportsController } from './commercial-reports.controller';
import { CommercialReportsService } from './commercial-reports.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [ReportsController, CommercialReportsController],
  providers: [ReportsService, CommercialReportsService],
})
export class ReportsModule {}
