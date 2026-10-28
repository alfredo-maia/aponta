import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CostRatesController } from './cost-rates.controller';
import { CostRatesService } from './cost-rates.service';
import { PermissionsModule } from '../permissions/permissions.module';

@Module({
  imports: [PrismaModule, PermissionsModule],
  controllers: [CostRatesController, ContractsController],
  providers: [ContractsService, CostRatesService],
})
export class ContractsModule {}
