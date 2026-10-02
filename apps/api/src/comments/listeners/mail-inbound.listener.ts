import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CommentsService } from '../comments.service';
import { UsersService } from '../../users/users.service';

interface InboundEmailPayload {
  subject: string;
  textBody: string;
  fromAddress: string;
}

@Injectable()
export class MailInboundListener {
  private readonly logger = new Logger(MailInboundListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly commentsService: CommentsService,
    private readonly usersService: UsersService,
  ) {}

  @OnEvent('mail.inbound.received')
  async handleInboundEmail(payload: InboundEmailPayload) {
    const match = payload.subject.match(/chamado\s+([A-Za-z0-9-]+)/i);
    if (!match) {
      this.logger.debug(`Ignored email: No protocol found in subject "${payload.subject}".`);
      return;
    }

    const protocol = match[1];

    const user = await this.usersService.findByEmail(payload.fromAddress);
    if (!user) {
      this.logger.warn(`Ignored email for ticket ${protocol}: Author email ${payload.fromAddress} not found.`);
      return;
    }

    const ticket = await this.prisma.ticket.findUnique({
      where: { protocol },
    });

    if (!ticket) {
      this.logger.warn(`Ignored email: Ticket with protocol ${protocol} not found.`);
      return;
    }

    try {
      await this.commentsService.create(
        ticket.id,
        {
          content: payload.textBody,
          isInternal: false,
        },
        {
          id: user.id,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
      );
      this.logger.log(`Created email reply comment for ticket ${protocol} from ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to create comment for ticked ${protocol} from ${user.email}`, error instanceof Error ? error.stack : String(error));
    }
  }
}
