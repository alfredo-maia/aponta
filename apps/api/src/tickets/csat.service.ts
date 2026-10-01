import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateCsatDto } from './dto/rate-csat.dto';
import { CurrentUserPayload } from './decorators/current-user.decorator';

/**
 * Lets a ticket's requester rate the service received (CSAT) once their
 * ticket has been handled. Only the original requester may submit a
 * rating for their own ticket.
 */
@Injectable()
export class CsatService {
  constructor(private readonly prisma: PrismaService) {}

  async rate(
    ticketId: string,
    dto: RateCsatDto,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Ticket with ID ${ticketId} not found`);
    }

    if (ticket.requesterId !== currentUser.id) {
      throw new ForbiddenException('Só o autor do chamado pode avaliar');
    }

    return this.prisma.ticket.update({
      where: { id: ticketId },
      data: { csatScore: dto.score, csatComment: dto.comment },
    });
  }
}
