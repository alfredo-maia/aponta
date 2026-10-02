import { Module } from '@nestjs/common';
import { CommentsService } from './comments.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CommentsController } from './comments.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { MailInboundListener } from './listeners/mail-inbound.listener';

@Module({
  imports: [PrismaModule, UsersModule, EventEmitterModule.forRoot()],
  controllers: [CommentsController],
  providers: [CommentsService, MailInboundListener],
  exports: [CommentsService],
})
export class CommentsModule {}
