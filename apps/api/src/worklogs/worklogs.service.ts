import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceType, Prisma, Role, ValuationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorklogDto } from './dto/create-worklog.dto';
import { CommentsService } from '../comments/comments.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { assertListedAgentMayMutate } from '../service-desks/desk-policy';

@Injectable()
export class WorklogsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly commentsService: CommentsService,
  ) {}

  async create(
    ticketId: string,
    dto: CreateWorklogDto,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        requester: { include: { organization: true } },
        serviceDesk: {
          select: {
            listedGroupsOnly: true,
            agents: { select: { id: true } },
            agentGroups: { select: { members: { select: { id: true } } } },
          },
        },
      },
    });

    if (!ticket) {
      throw new NotFoundException(`Chamado com ID ${ticketId} não encontrado`);
    }

    if (currentUser.role === Role.CLIENT) {
      throw new ForbiddenException('Clientes não têm permissão para registrar apontamentos');
    }

    if (ticket.serviceDesk) {
      assertListedAgentMayMutate({ desk: ticket.serviceDesk, user: currentUser });
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Horário de início ou término inválido');
    }

    if (end <= start) {
      throw new BadRequestException('O horário de término deve ser posterior ao horário de início');
    }

    const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

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

    const description = dto.description.trim();
    let billable = dto.billable !== undefined ? dto.billable : true;

    let valuationType: ValuationType | undefined;
    let value: number | null | undefined;

    if (dto.valuationType) {
      valuationType = dto.valuationType;
      value = await this.computeValuation(dto.valuationType, dto.value, minutes, ticket);
      if (dto.valuationType === ValuationType.GUARANTEE && dto.billable === undefined) {
        billable = false;
      }
    }

    const data: Prisma.WorklogUncheckedCreateInput = {
      ticketId,
      authorId,
      description,
      minutes,
      startTime: start,
      endTime: end,
      attendanceType: dto.attendanceType ?? AttendanceType.REMOTE,
      billable,
      ...(valuationType ? { valuationType, value } : {}),
    };

    const worklog = await this.prisma.worklog.create({
      data,
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

    if (dto.nextStatus) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: dto.nextStatus },
      });
    }

    if (dto.sendAsReply) {
      await this.commentsService.create(
        ticketId,
        { content: description, isInternal: false },
        currentUser,
      );
    }

    return worklog;
  }

  private async computeValuation(
    valuationType: ValuationType,
    manualValue: number | undefined,
    minutes: number,
    ticket: { requester?: { organization?: { id: string } | null } | null },
  ): Promise<number | null> {
    if (valuationType === ValuationType.MANUAL) {
      if (manualValue === undefined || manualValue === null) {
        throw new BadRequestException('Informe o valor manual do apontamento');
      }
      return manualValue;
    }

    if (valuationType === ValuationType.GUARANTEE) {
      return 0;
    }

    const organizationId = ticket.requester?.organization?.id;
    if (!organizationId) {
      return null;
    }

    const contract = await this.prisma.contract.findFirst({
      where: { organizationId, active: true },
    });

    if (!contract || !contract.monthlyValue || !contract.hoursLimit) {
      return null;
    }

    const hourlyRate = contract.monthlyValue / contract.hoursLimit;
    return Math.round(hourlyRate * (minutes / 60) * 100) / 100;
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
