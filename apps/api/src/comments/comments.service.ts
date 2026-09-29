import { Injectable, NotFoundException } from '@nestjs/common';
import { Comment, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a comment on a ticket. `isInternal` is only honored for
   * AGENT/ADMIN callers; for CLIENT it is forced to `false` server-side no
   * matter what the request body contained, so a client can never publish a
   * comment other clients can't see, nor probe the internal-note channel.
   */
  async create(
    ticketId: string,
    dto: CreateCommentDto,
    currentUser: CurrentUserPayload,
  ): Promise<Comment> {
    await this.assertTicketVisibleTo(ticketId, currentUser);

    const isInternal =
      currentUser.role === Role.CLIENT ? false : (dto.isInternal ?? false);

    return this.prisma.comment.create({
      data: {
        content: dto.content,
        isInternal,
        ticketId,
        authorId: currentUser.id,
      },
    });
  }

  /**
   * Lists a ticket's comments in chronological order. Internal comments are
   * filtered out at the database query level for CLIENT readers (never
   * fetched-then-filtered in memory), so a CLIENT can never receive an
   * internal note through this endpoint.
   */
  async findByTicket(
    ticketId: string,
    currentUser: CurrentUserPayload,
  ): Promise<Comment[]> {
    await this.assertTicketVisibleTo(ticketId, currentUser);

    const where: Prisma.CommentWhereInput = { ticketId };
    if (currentUser.role === Role.CLIENT) {
      where.isInternal = false;
    }

    return this.prisma.comment.findMany({
      where,
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Loads the ticket and enforces CLIENT ownership, reusing the exact
   * pattern from TicketsService.findOne: a CLIENT interacting with a ticket
   * they do not request gets NotFoundException (NOT ForbiddenException) so
   * the existence of other users' tickets is never leaked.
   */
  private async assertTicketVisibleTo(
    ticketId: string,
    currentUser: CurrentUserPayload,
  ): Promise<void> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });
    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }
    if (
      currentUser.role === Role.CLIENT &&
      ticket.requesterId !== currentUser.id
    ) {
      // Deliberately NotFoundException (not Forbidden): do not leak the
      // existence of other users' tickets to a CLIENT.
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }
  }
}
