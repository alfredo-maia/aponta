import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CommentsService } from '../comments.service';
import { CurrentUserPayload } from '../../tickets/decorators/current-user.decorator';

@Injectable()
export class MailInboundListener {
  private readonly logger = new Logger(MailInboundListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentsService: CommentsService,
  ) {}

  @OnEvent('mail.inbound.received')
  async handleInboundEmail(payload: {
    subject: string;
    fromAddress: string;
    textBody: string;
  }): Promise<void> {
    const match = payload.subject.match(/AP-\d{4}-\d+/i);
    if (!match) {
      this.logger.debug(`Ignored inbound email (no protocol in subject): ${payload.subject}`);
      return;
    }

    const protocol = match[0].toUpperCase();
    const ticket = await this.prisma.ticket.findUnique({ where: { protocol } });
    
    if (!ticket) {
      this.logger.warn(`Ignored inbound email (protocol not found): ${protocol}`);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { email: payload.fromAddress },
    });

    if (!user) {
      this.logger.warn(`Ignored inbound email (user not found): ${payload.fromAddress}`);
      return;
    }

    const currentUser: CurrentUserPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
    };

    let content = payload.textBody;
    // Very basic reply trimming
    const splitTokens = ['\nOn ', '\nEm ', '\nDe:', '\n>'];
    for (const token of splitTokens) {
      const splitIndex = content.toLowerCase().search(token.toLowerCase());
      if (splitIndex !== -1) {
        content = content.substring(0, splitIndex);
      }
    }
    content = content.trim();
    
    if (!content) {
       this.logger.warn(`Ignored inbound email (empty content after trim): ${protocol}`);
       return;
    }

    try {
      await this.commentsService.create(
        ticket.id,
        { content, isInternal: false },
        currentUser,
      );
      this.logger.log(`Created inbound email comment for ticket ${protocol}`);
    } catch (e) {
      if (e instanceof NotFoundException) {
        this.logger.warn(
          `Inbound email rejected: user ${user.email} not authorized for ticket ${protocol}`,
        );
      } else {
        this.logger.error(
          `Error creating inbound comment for ticket ${protocol}`,
          e instanceof Error ? e.stack : String(e),
        );
      }
    }
  }
}
