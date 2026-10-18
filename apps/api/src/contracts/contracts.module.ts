import { Module } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { ContractsController } from './contracts.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { CostRatesController } from './cost-rates.controller';
import { CostRatesService } from './cost-rates.service';

@Module({
  imports: [PrismaModule],
  controllers: [CostRatesController, ContractsController],
  providers: [ContractsService, CostRatesService],
})
export class ContractsModule {}
