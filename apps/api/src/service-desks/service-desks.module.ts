import { Module } from '@nestjs/common';
import { ServiceDesksService } from './service-desks.service';
import { ServiceDesksController } from './service-desks.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ServiceDesksController],
  providers: [ServiceDesksService],
  exports: [ServiceDesksService],
})
export class ServiceDesksModule {}
