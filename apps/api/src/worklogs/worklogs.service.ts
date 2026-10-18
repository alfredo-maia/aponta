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
import { allocateCommercialSegments, isCompleteCommercialTerm } from './commercial-valuation';

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
    return this.prisma.$transaction(async database => {
      const { contracts } = await this.commercialContext(database, ticketId, user, start, end);
      return contracts.map(contract => ({ id: contract.id, name: contract.name, type: contract.type,
        organizationId: contract.organizationId, active: contract.active, approved: contract.approved,
        startsAt: contract.startsAt, endsAt: contract.endsAt, includedMinutes: contract.includedMinutes,
        hoursLimit: contract.hoursLimit, excessHourlyRateCents: user.role === Role.ADMIN ? contract.excessHourlyRateCents : null }));
    });
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
        if (!([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(targetUser.role)) {
          throw new BadRequestException('O autor do apontamento deve ser um técnico');
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
    const courtesy = valuationType === ValuationType.GUARANTEE || valuationType === ValuationType.BONUS;
    const billable = courtesy ? false : (dto.billable ?? true);
    if (courtesy && dto.billable === true) {
      throw new BadRequestException('Garantia ou bonificação não pode ser faturável');
    }
    if (valuationType === ValuationType.BONUS && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Somente admin pode autorizar bonificação');
    }
    if (courtesy && (!dto.bonusReason?.trim() || dto.bonusReason.trim().length > 1000)) {
      throw new BadRequestException('Informe o motivo da garantia ou bonificação (até 1000 caracteres)');
    }
    if (valuationType === ValuationType.CONTRACT && !billable) {
      throw new BadRequestException('Use Garantia ou Bonificação com motivo para horas não faturáveis');
    }
    if (valuationType === ValuationType.MANUAL && currentUser.role !== Role.ADMIN) {
      throw new ForbiddenException('Somente admin pode informar valor manual');
    }
    if (valuationType === ValuationType.MANUAL &&
      (dto.value == null || !Number.isFinite(dto.value) || dto.value < 0 ||
       Math.round(dto.value * 100) > 2147483647 || (!billable && dto.value > 0))) {
      throw new BadRequestException('Informe um valor manual válido e faturável');
    }
    const afterCommit: Array<() => void> = [];
    const worklog = await this.prisma.$transaction(async (database) => {
      const valuation = await this.computeValuation(database, dto, valuationType, billable, start, end, ticketId, currentUser, authorId);
      let source: Prisma.InputJsonObject = {};
      if (dto.preAppointmentId) {
        if (!dto.contractId) throw new BadRequestException('Selecione explicitamente o contrato ao converter o cronômetro');
        await database.$queryRaw(Prisma.sql`SELECT id FROM "PreAppointment" WHERE id = ${dto.preAppointmentId} FOR UPDATE`);
        const pre = await database.preAppointment.findUnique({ where: { id: dto.preAppointmentId } });
        if (!pre || pre.ticketId !== ticketId || pre.authorId !== authorId || !pre.ending) {
          throw new BadRequestException('Pré-apontamento encerrado do mesmo chamado e autor é obrigatório');
        }
        if (await database.worklog.findUnique({ where: { sourcePreAppointmentId: pre.id } })) {
          throw new BadRequestException('Este pré-apontamento já foi convertido');
        }
        source = { sourcePreAppointmentId: pre.id, sourceBeginning: pre.beginning.toISOString(), sourceEnding: pre.ending.toISOString(),
          sourceContractId: pre.contractId, sourceContractChanged: pre.contractId !== valuation.contractId };
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
      valuationType,
      bonusReason: courtesy ? dto.bonusReason!.trim() : null,
      ...valuation,
      sourcePreAppointmentId: dto.preAppointmentId ?? null,
      valuationSnapshot: { ...valuation.valuationSnapshot, ...source },
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

    if (dto.nextStageId) {
      await this.ticketsService.withTransaction(database, afterCommit).changeStage(ticketId, dto.nextStageId, currentUser);
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
    ticketId: string,
    user: CurrentUserPayload,
    authorId: string,
  ) {
    const { ticket, organizationId, contracts } = await this.commercialContext(database, ticketId, user, start, end, dto.contractId);
    if (contracts.length > 1) throw new BadRequestException('Selecione o contrato para o apontamento');
    if (!contracts.length) throw new BadRequestException('Nenhum contrato aprovado e vigente cobre esta empresa e mesa; regularize o cadastro');
    const contract = contracts[0];
    await database.$queryRaw(Prisma.sql`SELECT id FROM "Contract" WHERE id = ${contract.id} FOR UPDATE`);
    const current = await database.contract.findUniqueOrThrow({ where: { id: contract.id }, include: { terms: true, lifecycleEvents: { orderBy: [{ effectiveFrom: 'asc' }, { createdAt: 'asc' }] }, serviceDesks: { select: { id: true } } } });
    if (!this.contractCovers(current, organizationId, ticket.serviceDeskId, start, end)) throw new BadRequestException('Contrato não está mais elegível');
    // The same User lock is held by append-only cost changes.
    await database.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id = ${authorId} FOR UPDATE`);
    const costRates = await database.technicianCostRate.findMany({ where: { userId: authorId, effectiveFrom: { lt: end } }, orderBy: { effectiveFrom: 'asc' } });
    const previous = billable && valuationType === ValuationType.CONTRACT ? await database.worklog.findMany({
      where: { contractId: contract.id, valuationType: ValuationType.CONTRACT, billable: true, voidedAt: null },
      select: { valuationSnapshot: true },
    }) : [];
    const priorSegments = previous.flatMap(log => {
      const snapshot = log.valuationSnapshot as { segments?: Array<{ cycleStart: string; minutes: number }> } | null;
      return snapshot?.segments ?? [];
    });
    const segments = allocateCommercialSegments({ start, end, terms: current.terms, costRates, previous: priorSegments,
      valuationType, billable, manualCents: valuationType === ValuationType.MANUAL ? Math.round((dto.value ?? 0) * 100) : undefined });
    const cents = segments.reduce((sum, part) => sum + part.amountCents, 0);
    const costCents = segments.some(part => part.costCents === null) ? null : segments.reduce((sum, part) => sum + (part.costCents ?? 0), 0);
    if (cents > 2147483647 || (costCents !== null && costCents > 2147483647)) throw new BadRequestException('Valor excede o limite permitido');
    const snapshot: Prisma.InputJsonObject = {
      version: 2, currency: 'BRL', timeConvention: 'UTC', allocation: 'REGISTRATION_ORDER', organizationId,
      organizationName: ticket.commercialOrganization?.name ?? '', serviceDeskId: ticket.serviceDeskId, valuationType,
      contractId: current.id, contractName: current.name, contractType: current.type,
      recordedById: user.id, performedById: authorId,
      ...(valuationType === ValuationType.BONUS ? { authorizedById: user.id, authorizedAt: new Date().toISOString() } : {}),
      includedMinutes: current.includedMinutes, segments: segments.map(part => ({ ...part })),
    };
    return { value: cents / 100, valueCents: cents, costCents, contractId: current.id, valuationSnapshot: snapshot };
  }

  private contractCovers(contract: Prisma.ContractGetPayload<{ include: { terms: true; lifecycleEvents: true; serviceDesks: { select: { id: true } } } }>, organizationId: string, deskId: string, start: Date, end: Date) {
    if (!contract.approved || !contract.active || contract.organizationId !== organizationId || !contract.startsAt ||
      contract.startsAt > start || (contract.endsAt && contract.endsAt < end) ||
      !contract.serviceDesks.some(desk => desk.id === deskId)) return false;
    const terms = contract.terms.filter(term => term.effectiveFrom < end).sort((a, b) => a.effectiveFrom.getTime() - b.effectiveFrom.getTime());
    const atStart = terms.filter(term => term.effectiveFrom <= start).at(-1);
    if (!atStart) return false;
    const states = contract.lifecycleEvents.filter(event => event.effectiveFrom < end);
    const firstState = states.filter(event => event.effectiveFrom <= start).at(-1);
    if (!firstState || ![firstState, ...states.filter(event => event.effectiveFrom > start)].every(event =>
      event.active && event.approved && !!event.startsAt && event.startsAt <= start && (!event.endsAt || event.endsAt >= end))) return false;
    return [atStart, ...terms.filter(term => term.effectiveFrom > start)].every(term =>
      isCompleteCommercialTerm(term) && Array.isArray(term.serviceDeskIds) && term.serviceDeskIds.includes(deskId));
  }

  private async commercialContext(database: Prisma.TransactionClient, ticketId: string, user: CurrentUserPayload, start: Date, end: Date, contractId?: string) {
    await database.$queryRaw(Prisma.sql`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`);
    const ticket = await database.ticket.findUnique({ where: { id: ticketId, AND: [TenantHelper.getTicketWhere(user)] },
      include: { commercialOrganization: { select: { id: true, name: true } }, serviceDesk: { select: {
        listedGroupsOnly: true, agents: { select: { id: true } }, agentGroups: { select: { members: { select: { id: true } } } },
      } } } });
    if (!ticket) throw new NotFoundException('Chamado não encontrado');
    if (!([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(user.role)) throw new ForbiddenException('Acesso negado');
    assertListedAgentMayMutate({ desk: ticket.serviceDesk, user });
    const organizationId = ticket.commercialOrganizationId;
    if (!organizationId) throw new BadRequestException('Chamado sem empresa comercial; solicite regularização ao administrador');
    await database.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`);
    const desk = await database.serviceDesk.findFirst({ where: { id: ticket.serviceDeskId, active: true, organizations: { some: { id: organizationId } } }, select: { id: true } });
    if (!desk) throw new BadRequestException('A empresa comercial não está vinculada a esta mesa ativa; regularize o relacionamento');
    const candidates = await database.contract.findMany({ where: { organizationId, active: true, approved: true,
      ...(contractId ? { id: contractId } : {}), serviceDesks: { some: { id: ticket.serviceDeskId } } },
      include: { terms: true, lifecycleEvents: { orderBy: [{ effectiveFrom: 'asc' }, { createdAt: 'asc' }] }, serviceDesks: { select: { id: true } } }, orderBy: { id: 'asc' } });
    const contracts = candidates.filter(contract => this.contractCovers(contract, organizationId, ticket.serviceDeskId, start, end));
    return { ticket, organizationId, contracts };
  }

  async setCommercialOrganization(ticketId: string, organizationId: string, user: CurrentUserPayload) {
    if (user.role !== Role.ADMIN) throw new ForbiddenException('Apenas admin pode regularizar a empresa comercial');
    return this.prisma.$transaction(async database => {
      await database.$queryRaw(Prisma.sql`SELECT id FROM "Ticket" WHERE id = ${ticketId} FOR UPDATE`);
      const ticket = await database.ticket.findUnique({ where: { id: ticketId } });
      if (!ticket) throw new NotFoundException('Chamado não encontrado');
      if (ticket.commercialOrganizationId === organizationId) return ticket;
      if (await database.worklog.count({ where: { ticketId } })) throw new BadRequestException('Chamado com apontamentos não pode mudar de empresa comercial');
      await database.$queryRaw(Prisma.sql`SELECT id FROM "Organization" WHERE id = ${organizationId} FOR UPDATE`);
      const linked = await database.serviceDesk.findFirst({ where: { id: ticket.serviceDeskId, active: true, organizations: { some: { id: organizationId } } }, select: { id: true } });
      if (!linked) throw new BadRequestException('Vincule a empresa à mesa antes de regularizar o chamado');
      return database.ticket.update({ where: { id: ticketId }, data: { commercialOrganizationId: organizationId } });
    });
  }

  private maskValue<T extends { value?: number | null; valueCents?: number | null; costCents?: number | null; valuationSnapshot?: unknown; bonusReason?: string | null }>(log: T, user: CurrentUserPayload): T {
    const snapshot = log.valuationSnapshot as { timeConvention?: string } | null;
    const timed = snapshot?.timeConvention === 'UTC' ? { ...log, timeConvention: 'UTC' } : log;
    if (user.role === Role.ADMIN) return timed;
    return { ...timed, value: null, valueCents: null, costCents: null, bonusReason: null, valuationSnapshot: null };
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
      where: { ticketId, voidedAt: null },
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
      const current = await database.worklog.findUnique({ where: { id: worklogId } });
      if (!current) throw new NotFoundException('Apontamento não encontrado');
      if (current.voidedAt) return current;
      const snapshot = current.valuationSnapshot as { version?: number } | null;
      if (snapshot?.version === 2) {
        return database.worklog.update({ where: { id: worklogId }, data: { voidedAt: new Date(), voidedBy: currentUser.id } });
      }
      return database.worklog.delete({ where: { id: worklogId } });
    });
    return this.maskValue(deleted, currentUser);
  }

  async auditByTicket(ticketId: string, currentUser: CurrentUserPayload) {
    if (currentUser.role !== Role.ADMIN) throw new ForbiddenException('Auditoria restrita ao administrador');
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException('Chamado não encontrado');
    return this.prisma.worklog.findMany({ where: { ticketId }, orderBy: { createdAt: 'desc' }, include: { author: AUTHOR_SELECT } });
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

    if (!([Role.ADMIN, Role.AGENT, Role.AGENT_MASTER] as Role[]).includes(currentUser.role)) {
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

    return this.prisma.$transaction(async database => {
      const { ticket: context, contracts } = await this.commercialContext(database, ticketId, currentUser, beginning, new Date(beginning.getTime() + 60000), dto.contractId);
      if (contracts.length !== 1) throw new BadRequestException(contracts.length ? 'Selecione o contrato para o cronômetro' : 'Nenhum contrato aprovado e vigente cobre esta empresa e mesa');
      await database.$queryRaw(Prisma.sql`SELECT id FROM "Contract" WHERE id = ${contracts[0].id} FOR UPDATE`);
      const current = await database.contract.findUniqueOrThrow({ where: { id: contracts[0].id }, include: { terms: true, lifecycleEvents: { orderBy: [{ effectiveFrom: 'asc' }, { createdAt: 'asc' }] }, serviceDesks: { select: { id: true } } } });
      if (!context.commercialOrganizationId || !this.contractCovers(current, context.commercialOrganizationId, context.serviceDeskId, beginning, new Date(beginning.getTime() + 60000))) throw new BadRequestException('Contrato não está mais elegível');
      return database.preAppointment.create({
      data: {
        ticketId,
        authorId: currentUser.id,
        beginning,
        initTime,
        contractId: current.id,
      },
      include: { author: AUTHOR_SELECT },
      });
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
