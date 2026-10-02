import { Module } from '@nestjs/common';
import { MailService } from './mail.service';
import { ImapService } from './imap.service';
import { TicketEventsListener } from './listeners/ticket-events.listener';

@Module({
  providers: [MailService, ImapService, TicketEventsListener],
  exports: [MailService],
})
export class MailModule {}
