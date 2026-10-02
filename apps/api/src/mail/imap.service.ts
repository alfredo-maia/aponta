import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ImapService implements OnModuleInit {
  private readonly logger = new Logger(ImapService.name);
  private client: ImapFlow | null = null;
  private isProcessing = false;
  private readonly isEnabled: boolean;

  constructor(
    private readonly configService: ConfigService,
    private readonly eventEmitter: EventEmitter2,
  ) {
    this.isEnabled = this.configService.get<string>('IMAP_ENABLED') === 'true';

    if (this.isEnabled) {
      const host = this.configService.get<string>('IMAP_HOST');
      const port = this.configService.get<number>('IMAP_PORT') || 993;
      const user = this.configService.get<string>('IMAP_USER');
      const pass = this.configService.get<string>('IMAP_PASS');
      const secure = this.configService.get<boolean>('IMAP_SECURE') ?? true;

      if (host && user && pass) {
        this.client = new ImapFlow({
          host,
          port,
          secure,
          auth: {
            user,
            pass,
          },
          logger: false, // disable internal noise
        });
      } else {
        this.logger.warn('IMAP config is incomplete. Poller disabled.');
        this.client = null;
      }
    }
  }

  async onModuleInit() {
    if (!this.isEnabled || !this.client) return;
    this.logger.log('IMAP Poller configured. Scheduled to check inbox periodically.');
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async pollInbox() {
    if (!this.client || this.isProcessing) return;
    this.isProcessing = true;

    try {
      await this.client.connect();
      
      const lock = await this.client.getMailboxLock('INBOX');
      try {
        const messages = this.client.fetch({ seen: false }, { source: true });

        for await (const message of messages) {
          try {
            if (!message.source) continue;
            const parsed = await simpleParser(message.source as any);
            
            const subject = parsed.subject || '';
            const textBody = parsed.text || '';
            const fromAddress = parsed.from?.value[0]?.address;

            if (fromAddress) {
              this.eventEmitter.emit('mail.inbound.received', {
                subject,
                textBody,
                fromAddress,
              });
            }

            await this.client.messageFlagsAdd(`${message.uid}`, ['\\Seen'], { uid: true });
          } catch (err) {
            this.logger.error(`Error parsing message ${message.uid}`, err instanceof Error ? err.stack : String(err));
          }
        }
      } finally {
        lock.release();
      }
    } catch (err) {
      this.logger.error('Failed IMAP polling', err instanceof Error ? err.stack : String(err));
    } finally {
      this.isProcessing = false;
      if (this.client.usable) {
        try { await this.client.logout(); } catch (e) { this.logger.debug("Logout failed", e); }
      }
    }
  }
}
