import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorklogDto } from './dto/create-worklog.dto';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

@Injectable()
export class WorklogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    ticketId: string,
    dto: CreateWorklogDto,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Chamado com ID ${ticketId} não encontrado`);
    }

    if (currentUser.role === Role.CLIENT) {
      throw new ForbiddenException('Clientes não têm permissão para registrar apontamentos');
    }

    let authorId = currentUser.id;

    if (currentUser.role === Role.ADMIN) {
      if (dto.authorId) {
        const targetUser = await this.prisma.user.findUnique({
          where: { id: dto.authorId },
        });
        if (!targetUser) {
          throw new NotFoundException(`Usuário ${dto.authorId} não encontrado`);
        }
        authorId = dto.authorId;
      }
    } else {
      if (dto.authorId && dto.authorId !== currentUser.id) {
        throw new ForbiddenException('Técnicos só podem registrar apontamento de horas para si mesmos');
      }
    }

    return this.prisma.worklog.create({
      data: {
        ticketId,
        authorId,
        description: dto.description.trim(),
        minutes: dto.minutes,
        billable: dto.billable !== undefined ? dto.billable : true,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async findByTicket(
    ticketId: string,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException(`Chamado com ID ${ticketId} não encontrado`);
    }

    if (currentUser.role === Role.CLIENT) {
      throw new ForbiddenException('Clientes não têm permissão para visualizar apontamentos de horas');
    }

    return this.prisma.worklog.findMany({
      where: { ticketId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async delete(
    ticketId: string,
    worklogId: string,
    currentUser: CurrentUserPayload,
  ) {
    const worklog = await this.prisma.worklog.findUnique({
      where: { id: worklogId },
    });

    if (!worklog || worklog.ticketId !== ticketId) {
      throw new NotFoundException(`Apontamento com ID ${worklogId} não encontrado no chamado`);
    }

    if (currentUser.role !== Role.ADMIN && worklog.authorId !== currentUser.id) {
      throw new ForbiddenException('Você não tem permissão para remover o apontamento de outro usuário');
    }

    return this.prisma.worklog.delete({
      where: { id: worklogId },
    });
  }
}
