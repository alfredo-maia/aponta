import { Module } from '@nestjs/common';
import { TechnicalGroupsService } from './technical-groups.service';
import { TechnicalGroupsController } from './technical-groups.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TechnicalGroupsController],
  providers: [TechnicalGroupsService],
})
export class TechnicalGroupsModule {}
