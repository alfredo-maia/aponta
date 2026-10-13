import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AppointmentType, Prisma, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TenantHelper } from '../core/security/tenant.helper';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';
import { QueryAppointmentDto } from './dto/query-appointment.dto';

@Injectable()
export class AgendaService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: QueryAppointmentDto, user: CurrentUserPayload) {
    const baseWhere = TenantHelper.getAppointmentWhere(user);
    const where: Prisma.AppointmentWhereInput = { ...baseWhere };

    if (query.userId) {
      if (user.role === Role.ADMIN || user.role === Role.AGENT_MASTER) {
        where.userId = query.userId;
      }
    }

    if (query.organizationId) {
      if (user.role !== Role.CLIENT_MASTER) {
        where.organizationId = query.organizationId;
      }
    }

    if (query.type) {
      if (user.role === Role.CLIENT_MASTER && query.type === AppointmentType.ABSENCE) {
        // CLIENT_MASTER cannot query internal absences
        return [];
      }
      where.type = query.type;
    }

    if (query.startTime || query.endTime) {
      if (query.startTime && query.endTime) {
        where.startTime = { lte: new Date(query.endTime) };
        where.endTime = { gte: new Date(query.startTime) };
      } else if (query.startTime) {
        where.endTime = { gte: new Date(query.startTime) };
      } else if (query.endTime) {
        where.startTime = { lte: new Date(query.endTime) };
      }
    }

    return this.prisma.appointment.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        ticket: {
          select: {
            id: true,
            protocol: true,
            title: true,
            description: true,
            status: true,
            requester: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });
  }

  async findOne(id: string, user: CurrentUserPayload) {
    const baseWhere = TenantHelper.getAppointmentWhere(user);
    const appointment = await this.prisma.appointment.findFirst({
      where: {
        id,
        ...baseWhere,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        ticket: {
          select: {
            id: true,
            protocol: true,
            title: true,
            description: true,
            status: true,
            requester: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!appointment) {
      throw new NotFoundException('Compromisso não encontrado');
    }

    return appointment;
  }

  async create(dto: CreateAppointmentDto, user: CurrentUserPayload) {
    if (user.role === Role.CLIENT) {
      throw new ForbiddenException('Clientes não têm permissão para agendar compromissos');
    }

    const start = new Date(dto.startTime);
    const end = new Date(dto.endTime);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Datas de início e término inválidas');
    }

    if (end <= start) {
      throw new BadRequestException('A data de término deve ser posterior à data de início');
    }

    let targetUserId = user.id;
    if (user.role === Role.ADMIN && dto.userId) {
      targetUserId = dto.userId;
    }

    let targetOrgId = dto.organizationId;
    if (user.role === Role.CLIENT_MASTER) {
      targetOrgId = user.organizationId ?? undefined;
    }

    let title = dto.title;
    let description = dto.description;
    if (dto.ticketId) {
      const link = await this.resolveTicketLinkage(dto.ticketId, user);
      title = link.title;
      targetOrgId = link.organizationId ?? targetOrgId;
      description = description ?? link.descriptionSummary;
    }

    return this.prisma.appointment.create({
      data: {
        title,
        description,
        startTime: start,
        endTime: end,
        type: dto.type ?? AppointmentType.AGENDA,
        userId: targetUserId,
        organizationId: targetOrgId,
        ticketId: dto.ticketId,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        ticket: {
          select: {
            id: true,
            protocol: true,
            title: true,
            description: true,
            status: true,
            requester: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  /**
   * When an appointment is linked to a ticket, its title mirrors the
   * ticket's title and its client organization is derived from the
   * ticket's requester — both are authoritative on the ticket, not
   * independently editable on the appointment (DMTE-18 review feedback).
   */
  private async resolveTicketLinkage(ticketId: string, user: CurrentUserPayload) {
    const ticketWhere = TenantHelper.getTicketWhere(user);
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, ...ticketWhere },
      select: {
        title: true,
        description: true,
        requester: { select: { organizationId: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Chamado vinculado não encontrado');
    }

    const descriptionSummary =
      ticket.description.length > 160
        ? `${ticket.description.slice(0, 160).trim()}…`
        : ticket.description;

    return {
      title: ticket.title,
      organizationId: ticket.requester.organizationId ?? undefined,
      descriptionSummary,
    };
  }

  async update(id: string, dto: UpdateAppointmentDto, user: CurrentUserPayload) {
    const existing = await this.findOne(id, user);

    if (user.role !== Role.ADMIN && existing.userId !== user.id) {
      throw new ForbiddenException('Sem permissão para alterar este compromisso');
    }

    const start = dto.startTime ? new Date(dto.startTime) : existing.startTime;
    const end = dto.endTime ? new Date(dto.endTime) : existing.endTime;

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException('Datas de início e término inválidas');
    }

    if (end <= start) {
      throw new BadRequestException('A data de término deve ser posterior à data de início');
    }

    let title = dto.title;
    let description = dto.description;
    let organizationId = dto.organizationId;
    if (dto.ticketId) {
      const link = await this.resolveTicketLinkage(dto.ticketId, user);
      title = link.title;
      organizationId = link.organizationId ?? organizationId;
      description = description ?? link.descriptionSummary;
    }

    return this.prisma.appointment.update({
      where: { id },
      data: {
        title,
        description,
        startTime: dto.startTime ? start : undefined,
        endTime: dto.endTime ? end : undefined,
        type: dto.type,
        userId: user.role === Role.ADMIN && dto.userId ? dto.userId : undefined,
        organizationId: organizationId !== undefined ? organizationId : undefined,
        ticketId: dto.ticketId !== undefined ? dto.ticketId : undefined,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        organization: { select: { id: true, name: true } },
        ticket: {
          select: {
            id: true,
            protocol: true,
            title: true,
            description: true,
            status: true,
            requester: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });
  }

  async remove(id: string, user: CurrentUserPayload) {
    const existing = await this.findOne(id, user);

    if (user.role !== Role.ADMIN && existing.userId !== user.id) {
      throw new ForbiddenException('Sem permissão para excluir este compromisso');
    }

    return this.prisma.appointment.delete({
      where: { id },
    });
  }
}
