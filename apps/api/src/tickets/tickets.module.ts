import { Module } from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { TicketsController } from './tickets.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule, EventEmitterModule.forRoot()],
  controllers: [TicketsController],
  providers: [TicketsService],
  exports: [TicketsService],
})
export class TicketsModule {}
