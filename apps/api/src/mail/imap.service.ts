import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';

export interface InboundEmailPayload {
  subject: string;
  textBody: string;
  fromAddress: string;
}

@Injectable()
export class ImapService {
  private readonly logger = new Logger(ImapService.name);
  private readonly enabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.enabled = this.configService.get<string>('IMAP_ENABLED') === 'true';
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    if (!this.enabled) return;
    await this.processUnreadEmails();
  }

  async processUnreadEmails() {
    const host = this.configService.get<string>('IMAP_HOST');
    const port = this.configService.get<number>('IMAP_PORT') || 993;
    const user = this.configService.get<string>('IMAP_USER');
    const pass = this.configService.get<string>('IMAP_PASS');

    if (!host || !user || !pass) {
      this.logger.warn('IMAP credentials incomplete. Skipping inbound email scan.');
      return;
    }

    const client = new ImapFlow({
      host,
      port,
      secure: port === 993,
      auth: { user, pass },
      logger: false, // Turn off verbose parsing logs
    });

    try {
      await client.connect();
      const lock = await client.getMailboxLock('INBOX');
      try {
        for await (const message of client.fetch({ seen: false }, { source: true })) {
          if (!message.source) continue;
          
          const parsed = await (simpleParser as any)(message.source) as ParsedMail;
          
          let fromAddress = '';
          if (parsed.from && parsed.from.value && parsed.from.value.length > 0) {
            fromAddress = parsed.from.value[0].address || '';
          }

          if (fromAddress && parsed.text) {
            this.eventEmitter.emit('mail.inbound.received', {
              subject: parsed.subject || '',
              textBody: parsed.text,
              fromAddress,
            });
            
            // Mark as read so we don't process it again
            await client.messageFlagsAdd(message.seq, ['\\Seen'], { uid: false });
          }
        }
      } finally {
        lock.release();
      }
    } catch (error) {
      this.logger.error('Failed to process inbound emails', error instanceof Error ? error.stack : String(error));
    } finally {
      await client.logout();
    }
  }
}
