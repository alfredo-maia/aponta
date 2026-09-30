import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TicketsController } from './tickets.controller';
import { CsatController } from './csat.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [TicketsController, CsatController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
