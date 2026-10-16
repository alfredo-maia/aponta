import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { AttendanceType, Prisma, Role, ValuationType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorklogDto } from './dto/create-worklog.dto';
import { CreatePreAppointmentDto } from './dto/create-pre-appointment.dto';
import { StopPreAppointmentDto } from './dto/stop-pre-appointment.dto';
import { CommentsService } from '../comments/comments.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { assertListedAgentMayMutate } from '../service-desks/desk-policy';
import { TenantHelper } from '../core/security/tenant.helper';
import { TicketsService } from '../tickets/tickets.service';
import { splitBillingCycles, valueContractMinutes } from './contract-valuation';

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
  private readonly logger = new Logger(WorklogsService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly commentsService: CommentsService,
    private readonly ticketsService: TicketsService,
  ) {}

  async eligibleContracts(ticketId: string, startTime: string, endTime: string, user: CurrentUserPayload) {
    if (!([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(user.role)) {
      throw new ForbiddenException('Acesso negado');
    }
    const start = new Date(startTime);
    const end = new Date(endTime);
    if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end <= start) {
      throw new BadRequestException('Informe um intervalo válido');
    }
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId, AND: [TenantHelper.getTicketWhere(user)] },
      include: { requester: { select: { organizationId: true } } },
    });
    if (!ticket) throw new NotFoundException('Chamado não encontrado');
    const organizationId = ticket.requester.organizationId;
    if (!organizationId) return [];
    const contracts = await this.prisma.contract.findMany({
      where: { organizationId, active: true, AND: [
        { OR: [{ startsAt: null }, { startsAt: { lte: start } }] },
        { OR: [{ endsAt: null }, { endsAt: { gte: end } }] },
      ] },
      orderBy: { id: 'asc' },
      select: { id: true, name: true, type: true, organizationId: true, active: true,
        startsAt: true, endsAt: true, includedMinutes: true, hoursLimit: true,
        excessHourlyRateCents: user.role === Role.ADMIN, createdAt: true },
    });
    return contracts;
  }

  async create(
    ticketId: string,
    dto: CreateWorklogDto,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId, AND: [TenantHelper.getTicketWhere(currentUser)] },
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

    if (!([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(currentUser.role)) {
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
    if (minutes < 1 || minutes > 525600) {
      throw new BadRequestException('O apontamento deve ter entre 1 minuto e 1 ano');
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

    const description = dto.description.trim();
    if (!description) throw new BadRequestException('Informe a descrição do apontamento');
    const valuationType = dto.valuationType ?? ValuationType.CONTRACT;
    const billable = valuationType === ValuationType.GUARANTEE ? false : (dto.billable ?? true);
    if (valuationType === ValuationType.GUARANTEE && dto.billable === true) {
      throw new BadRequestException('Garantia não pode ser faturável');
    }
    if (valuationType === ValuationType.MANUAL && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Somente admin pode informar valor manual');
    }
    if (valuationType === ValuationType.MANUAL &&
      (dto.value == null || !Number.isFinite(dto.value) || dto.value < 0 ||
       Math.round(dto.value * 100) > 2147483647 || (!billable && dto.value > 0))) {
      throw new BadRequestException('Informe um valor manual válido e faturável');
    }
    if (valuationType !== ValuationType.CONTRACT && dto.contractId) {
      throw new BadRequestException('Contrato só pode ser vinculado à valorização contratual');
    }
    const afterCommit: Array<() => void> = [];
    const worklog = await this.prisma.$transaction(async (database) => {
      const valuation = await this.computeValuation(database, dto, valuationType, billable, start, end, ticket);
      const data: Prisma.WorklogUncheckedCreateInput = {
      ticketId,
      authorId,
      description,
      minutes,
      startTime: start,
      endTime: end,
      attendanceType: dto.attendanceType ?? AttendanceType.REMOTE,
      billable,
      valuationType,
      ...valuation,
    };

    const saved = await database.worklog.create({
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
      await this.ticketsService.withTransaction(database, afterCommit).changeStatus(ticketId, dto.nextStatus, currentUser);
    }

    if (dto.sendAsReply) {
      await this.commentsService.withTransaction(database, afterCommit).create(
        ticketId,
        { content: description, isInternal: false },
        currentUser,
      );
    }

    return saved;
    }, { timeout: 15000 });
    afterCommit.forEach(effect => {
      try { effect(); } catch {
        this.logger.error('Falha ao publicar evento de apontamento já salvo');
      }
    });
    return this.maskValue(worklog, currentUser);
  }

  private async computeValuation(
    database: Prisma.TransactionClient,
    dto: CreateWorklogDto,
    valuationType: ValuationType,
    billable: boolean,
    start: Date,
    end: Date,
    ticket: { requester?: { organization?: { id: string; name?: string } | null } | null },
  ) {
    const organization = ticket.requester?.organization;
    const baseSnapshot: Prisma.InputJsonObject = { version: 1, currency: 'BRL', timeConvention: 'UTC', valuationType,
      organizationId: organization?.id ?? null, organizationName: organization?.name ?? '', segments: [] };
    if (valuationType === ValuationType.MANUAL) {
      const cents = Math.round((dto.value ?? 0) * 100);
      return { value: cents / 100, valueCents: cents, valuationSnapshot: baseSnapshot };
    }

    if (valuationType === ValuationType.GUARANTEE) {
      return { value: 0, valueCents: 0, valuationSnapshot: baseSnapshot };
    }

    const organizationId = ticket.requester?.organization?.id;
    if (!organizationId) {
      if (dto.contractId) throw new BadRequestException('Chamado sem organização para este contrato');
      return { value: billable ? null : 0, valueCents: billable ? null : 0, valuationSnapshot: baseSnapshot };
    }

    const contracts = await database.contract.findMany({
      where: { organizationId, active: true, ...(dto.contractId ? { id: dto.contractId } : {}),
        AND: [ { OR: [{ startsAt: null }, { startsAt: { lte: start } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: end } }] } ] },
      orderBy: { id: 'asc' },
    });
    if (contracts.length > 1) throw new BadRequestException('Selecione o contrato para o apontamento');
    if (!contracts.length) {
      if (dto.contractId) throw new BadRequestException('Contrato inativo, fora da vigência ou de outra organização');
      return { value: billable ? null : 0, valueCents: billable ? null : 0, valuationSnapshot: baseSnapshot };
    }
    const contract = contracts[0];
    // The row lock serializes allowance allocation for concurrent inserts and
    // prevents a contract edit racing the financial snapshot.
    await database.$queryRaw(Prisma.sql`SELECT id FROM "Contract" WHERE id = ${contract.id} FOR UPDATE`);
    const current = await database.contract.findUniqueOrThrow({ where: { id: contract.id } });
    if (!current.active || current.organizationId !== organizationId ||
      (current.startsAt && current.startsAt > start) || (current.endsAt && current.endsAt < end)) {
      throw new BadRequestException('Contrato não está mais elegível');
    }
    const previous = billable ? await database.worklog.findMany({
      where: { contractId: contract.id, valuationType: ValuationType.CONTRACT, billable: true },
      select: { valuationSnapshot: true },
    }) : [];
    const segments = splitBillingCycles(start, end).map(part => {
      let consumed = 0;
      for (const log of previous) {
        const snapshot = log.valuationSnapshot as { segments?: Array<{cycleStart: string; minutes: number}> } | null;
        for (const prior of snapshot?.segments ?? []) {
          if (prior.cycleStart === part.cycleStart) consumed += prior.minutes;
        }
      }
      const valued = billable ? valueContractMinutes(current, part.minutes, consumed) : { coveredMinutes: 0, excessMinutes: 0, amountCents: 0 };
      return { ...part, ...valued, rateCents: current.excessHourlyRateCents };
    });
    const cents = segments.some(p => p.amountCents === null) ? null : segments.reduce((sum, p) => sum + (p.amountCents ?? 0), 0);
    if (cents !== null && cents > 2147483647) throw new BadRequestException('Valor excede o limite permitido');
    const snapshot: Prisma.InputJsonObject = {
      version: 1, currency: 'BRL', timeConvention: 'UTC', allocation: 'REGISTRATION_ORDER', organizationId,
      organizationName: ticket.requester?.organization?.name ?? '',
      contractId: current.id, contractName: current.name, contractType: current.type,
      includedMinutes: current.includedMinutes ?? (current.hoursLimit === null ? null : current.hoursLimit * 60),
      segments,
    };
    return { value: cents === null ? null : cents / 100, valueCents: cents, contractId: current.id, valuationSnapshot: snapshot };
  }

  private maskValue<T extends { value?: number | null; valueCents?: number | null; valuationSnapshot?: unknown }>(log: T, user: CurrentUserPayload): T {
    const snapshot = log.valuationSnapshot as { timeConvention?: string } | null;
    const timed = snapshot?.timeConvention === 'UTC' ? { ...log, timeConvention: 'UTC' } : log;
    if (user.role === Role.ADMIN) return timed;
    return { ...timed, value: null, valueCents: null, valuationSnapshot: null };
  }

  async findByTicket(
    ticketId: string,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId, AND: [TenantHelper.getTicketWhere(currentUser)] },
    });

    if (!ticket) {
      throw new NotFoundException(`Chamado com ID ${ticketId} não encontrado`);
    }

    if (!([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(currentUser.role)) {
      throw new ForbiddenException('Clientes não têm permissão para visualizar apontamentos de horas');
    }

    const logs = await this.prisma.worklog.findMany({
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
    return logs.map(log => this.maskValue(log, currentUser));
  }

  async delete(
    ticketId: string,
    worklogId: string,
    currentUser: CurrentUserPayload,
  ) {
    await this.findByTicket(ticketId, currentUser);
    const worklog = await this.prisma.worklog.findUnique({
      where: { id: worklogId },
    });

    if (!worklog || worklog.ticketId !== ticketId) {
      throw new NotFoundException(`Apontamento com ID ${worklogId} não encontrado no chamado`);
    }

    if (currentUser.role !== Role.ADMIN && worklog.authorId !== currentUser.id) {
      throw new ForbiddenException('Você não tem permissão para remover o apontamento de outro usuário');
    }

    const deleted = await this.prisma.$transaction(async database => {
      if (worklog.contractId) {
        await database.$queryRaw(Prisma.sql`SELECT id FROM "Contract" WHERE id = ${worklog.contractId} FOR UPDATE`);
      }
      return database.worklog.delete({ where: { id: worklogId } });
    });
    return this.maskValue(deleted, currentUser);
  }

  private async assertTicketForPreAppointments(
    ticketId: string,
    currentUser: CurrentUserPayload,
  ) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id: ticketId, AND: [TenantHelper.getTicketWhere(currentUser)] },
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
    await this.assertTicketForPreAppointments(ticketId, currentUser);
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
    await this.assertTicketForPreAppointments(ticketId, currentUser);
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
