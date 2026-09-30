import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { TicketEventsListener } from './listeners/ticket-events.listener';

@Module({
  providers: [MailService, TicketEventsListener],
  exports: [MailService],
})
export class MailModule {}
