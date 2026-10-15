import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AttendanceType, Prisma, Role, ValuationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorklogDto } from './dto/create-worklog.dto';
import { CreatePreAppointmentDto } from './dto/create-pre-appointment.dto';
import { StopPreAppointmentDto } from './dto/stop-pre-appointment.dto';
import { CommentsService } from '../comments/comments.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { assertListedAgentMayMutate } from '../service-desks/desk-policy';

const BRASILIA_TZ = 'America/Sao_Paulo';
const AUTHOR_SELECT = { select: { id: true, name: true, email: true } } as const;

function brasiliaHhMm(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: BRASILIA_TZ,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);
  let hour = parts.find((part) => part.type === 'hour')?.value ?? '00';
  const minute = parts.find((part) => part.type === 'minute')?.value ?? '00';
  if (hour === '24') hour = '00';
  return `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
}

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

  private async assertTicketForPreAppointments(
    ticketId: string,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
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
      throw new ForbiddenException('Clientes não têm permissão para pré-apontamentos');
    }

    if (ticket.serviceDesk) {
      assertListedAgentMayMutate({ desk: ticket.serviceDesk, user: currentUser });
    }

    return ticket;
  }

  async createPreAppointment(
    ticketId: string,
    dto: CreatePreAppointmentDto,
    currentUser: CurrentUserPayload,
  ) {
    await this.assertTicketForPreAppointments(ticketId, currentUser);

    const beginning = dto.beginning ? new Date(dto.beginning) : new Date();
    if (isNaN(beginning.getTime())) {
      throw new BadRequestException('Horário de início inválido');
    }

    const initTime = dto.initTime || brasiliaHhMm(beginning);

    return this.prisma.preAppointment.create({
      data: {
        ticketId,
        authorId: currentUser.id,
        beginning,
        initTime,
      },
      include: { author: AUTHOR_SELECT },
    });
  }

  async findPreAppointments(ticketId: string, currentUser: CurrentUserPayload) {
    await this.assertTicketForPreAppointments(ticketId, currentUser);

    return this.prisma.preAppointment.findMany({
      where: { ticketId },
      include: { author: AUTHOR_SELECT },
      orderBy: { createdAt: 'desc' },
    });
  }

  async stopPreAppointment(
    ticketId: string,
    preAppointmentId: string,
    dto: StopPreAppointmentDto,
    currentUser: CurrentUserPayload,
  ) {
    const pre = await this.prisma.preAppointment.findUnique({
      where: { id: preAppointmentId },
    });

    if (!pre || pre.ticketId !== ticketId) {
      throw new NotFoundException(`Pré-apontamento ${preAppointmentId} não encontrado no chamado`);
    }

    if (currentUser.role !== Role.ADMIN && pre.authorId !== currentUser.id) {
      throw new ForbiddenException('Você não tem permissão para encerrar o pré-apontamento de outro usuário');
    }

    const ending = dto.ending ? new Date(dto.ending) : new Date();
    if (isNaN(ending.getTime())) {
      throw new BadRequestException('Horário de término inválido');
    }

    if (ending <= pre.beginning) {
      throw new BadRequestException('O horário de término deve ser posterior ao início');
    }

    const endTime = dto.endTime || brasiliaHhMm(ending);

    return this.prisma.preAppointment.update({
      where: { id: preAppointmentId },
      data: { ending, endTime },
      include: { author: AUTHOR_SELECT },
    });
  }

  async deletePreAppointment(
    ticketId: string,
    preAppointmentId: string,
    currentUser: CurrentUserPayload,
  ) {
    const pre = await this.prisma.preAppointment.findUnique({
      where: { id: preAppointmentId },
    });

    if (!pre || pre.ticketId !== ticketId) {
      throw new NotFoundException(`Pré-apontamento ${preAppointmentId} não encontrado no chamado`);
    }

    if (currentUser.role !== Role.ADMIN && pre.authorId !== currentUser.id) {
      throw new ForbiddenException('Você não tem permissão para remover o pré-apontamento de outro usuário');
    }

    return this.prisma.preAppointment.delete({
      where: { id: preAppointmentId },
    });
  }
}
