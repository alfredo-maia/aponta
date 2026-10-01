import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RateCsatDto } from './dto/rate-csat.dto';

export interface PublicCsatSummary {
  protocol: string;
  title: string;
  score: number | null;
  comment: string | null;
}

/**
 * Public (no-login) CSAT rating flow reached from the invitation e-mail.
 * Authorization is the opaque, single-use-per-ticket `csatToken` itself
 * (generated once when a ticket first becomes RESOLVED — see
 * TicketsService.changeStatus) rather than a JWT: anyone who holds the
 * link in the e-mail can view/submit the rating for THAT ticket only,
 * nothing else. There is intentionally no expiration in this MVP.
 */
@Injectable()
export class PublicCsatService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(token: string): Promise<PublicCsatSummary> {
    const ticket = await this.prisma.ticket.findUnique({
      where: { csatToken: token },
    });

    if (!ticket) {
      throw new NotFoundException('Link de avaliação inválido ou expirado');
    }

    return {
      protocol: ticket.protocol,
      title: ticket.title,
      score: ticket.csatScore,
      comment: ticket.csatComment,
    };
  }

  async rate(token: string, dto: RateCsatDto) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { csatToken: token },
    });

    if (!ticket) {
      throw new NotFoundException('Link de avaliação inválido ou expirado');
    }

    return this.prisma.ticket.update({
      where: { csatToken: token },
      data: { csatScore: dto.score, csatComment: dto.comment },
    });
  }
}
