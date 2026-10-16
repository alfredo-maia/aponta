import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceType, Role, TicketStatus, ValuationType } from '@prisma/client';
import { WorklogsService } from './worklogs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from '../comments/comments.service';
import { TicketsService } from '../tickets/tickets.service';
import { TenantHelper } from '../core/security/tenant.helper';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

describe('WorklogsService', () => {
  let service: WorklogsService;
  let mockPrisma: {
    $transaction: jest.Mock;
    $queryRaw: jest.Mock;
    ticket: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    contract: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      findUniqueOrThrow: jest.Mock;
    };
    worklog: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
    preAppointment: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let mockCommentsService: { create: jest.Mock; withTransaction: jest.Mock };
  let mockTicketsService: { changeStatus: jest.Mock; withTransaction: jest.Mock };

  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
  const adminUser: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };
  const clientUser: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };

  const validTicket = { id: 'ticket-1', title: 'Problema no ERP' };

  beforeEach(async () => {
    mockPrisma = {
      $transaction: jest.fn((callback) => callback(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      ticket: {
        findUnique: jest.fn().mockResolvedValue(validTicket),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      contract: {
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUniqueOrThrow: jest.fn(),
      },
      worklog: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      preAppointment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    mockCommentsService = { create: jest.fn(), withTransaction: jest.fn(() => mockCommentsService) };
    mockTicketsService = { changeStatus: jest.fn(), withTransaction: jest.fn(() => mockTicketsService) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommentsService, useValue: mockCommentsService },
        { provide: TicketsService, useValue: mockTicketsService },
      ],
    }).compile();

    service = module.get<WorklogsService>(WorklogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('blocks unlisted agents when the mesa has listedGroupsOnly', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...validTicket,
        serviceDesk: {
          listedGroupsOnly: true,
          agents: [],
          agentGroups: [],
        },
      });

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00.000Z',
            endTime: '2026-10-13T09:00:00.000Z',
            description: 'Blocked',
          },
          agentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should allow AGENT to create a worklog for themselves, deriving minutes from the time range', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        minutes: 60,
        description: 'Análise de banco',
        billable: true,
        author: { id: 'agent-1', name: 'Agent One', email: 'agent@test.com' },
      });

      const result = await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Análise de banco',
        },
        agentUser,
      );

      expect(result.id).toBe('wl-1');
      expect(mockPrisma.worklog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-1',
          minutes: 60,
          startTime: new Date('2026-10-13T08:00:00Z'),
          endTime: new Date('2026-10-13T09:00:00Z'),
          attendanceType: AttendanceType.REMOTE,
          description: 'Análise de banco',
          billable: true,
          valuationType: ValuationType.CONTRACT,
          value: null,
          valueCents: null,
          valuationSnapshot: expect.objectContaining({ version: 1, currency: 'BRL', organizationId: null, segments: [] }),
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it('should accept an explicit ON_SITE attendanceType', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-3' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T08:30:00Z',
          attendanceType: AttendanceType.ON_SITE,
          description: 'Visita técnica',
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attendanceType: AttendanceType.ON_SITE, minutes: 30 }),
        }),
      );
    });

    it('should throw BadRequestException when endTime is not after startTime', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T09:00:00Z',
            endTime: '2026-10-13T08:00:00Z',
            description: 'Horário inválido',
          },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when startTime or endTime cannot be parsed', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          { startTime: 'not-a-date', endTime: '2026-10-13T08:00:00Z', description: 'Teste' },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when AGENT tries to log for another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T08:30:00Z',
            description: 'Trabalho',
            authorId: 'other-user',
          },
          agentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to log work for another user if authorId is provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'agent-2', name: 'Agent Two' });
      mockPrisma.worklog.create.mockResolvedValue({
        id: 'wl-2',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
        minutes: 120,
        description: 'Desenvolvimento',
        billable: false,
      });

      const result = await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T10:00:00Z',
          description: 'Desenvolvimento',
          billable: false,
          authorId: 'agent-2',
        },
        adminUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-2',
          minutes: 120,
          startTime: new Date('2026-10-13T08:00:00Z'),
          endTime: new Date('2026-10-13T10:00:00Z'),
          attendanceType: AttendanceType.REMOTE,
          description: 'Desenvolvimento',
          billable: false,
          valuationType: ValuationType.CONTRACT,
          value: 0,
          valueCents: 0,
          valuationSnapshot: expect.objectContaining({ version: 1, currency: 'BRL', organizationId: null, segments: [] }),
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result.id).toBe('wl-2');
    });

    it('should throw NotFoundException if ADMIN specifies non-existent authorId', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T08:45:00Z',
            description: 'Task',
            authorId: 'non-existent',
          },
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'invalid-ticket',
          { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Task' },
          agentUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if CLIENT tries to create a worklog', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T09:00:00Z',
            description: 'Tentativa cliente',
          },
          clientUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update the ticket status when nextStatus is provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-4' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Resolvido',
          nextStatus: TicketStatus.RESOLVED,
        },
        agentUser,
      );

      expect(mockTicketsService.changeStatus).toHaveBeenCalledWith('ticket-1', TicketStatus.RESOLVED, agentUser);
      expect(mockTicketsService.withTransaction).toHaveBeenCalledWith(mockPrisma, expect.any(Array));
    });

    it('should not touch the ticket status when nextStatus is not provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-5' });

      await service.create(
        'ticket-1',
        { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Sem mudança' },
        agentUser,
      );

      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
    });

    it('should publish the description as a non-internal comment when sendAsReply is true', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-6' });
      mockCommentsService.create.mockResolvedValue({ id: 'c-1' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Diagnóstico concluído',
          sendAsReply: true,
        },
        agentUser,
      );

      expect(mockCommentsService.create).toHaveBeenCalledWith(
        'ticket-1',
        { content: 'Diagnóstico concluído', isInternal: false },
        agentUser,
      );
    });

    it('should not create a comment when sendAsReply is omitted', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-7' });

      await service.create(
        'ticket-1',
        { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Sem resposta' },
        agentUser,
      );

      expect(mockCommentsService.create).not.toHaveBeenCalled();
    });

    it('should store the manual value when valuationType is MANUAL', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-8' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Ajuste pontual',
          valuationType: ValuationType.MANUAL,
          value: 250,
        },
        adminUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ valuationType: ValuationType.MANUAL, value: 250 }) }),
      );
    });

    it('should throw BadRequestException when valuationType is MANUAL without a value', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T09:00:00Z',
            description: 'Sem valor',
            valuationType: ValuationType.MANUAL,
          },
          adminUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should zero the value and default billable to false when valuationType is GUARANTEE', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-9' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Retrabalho em garantia',
          valuationType: ValuationType.GUARANTEE,
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ valuationType: ValuationType.GUARANTEE, value: 0, billable: false }),
        }),
      );
    });

    it('rejects billable guarantees before opening a transaction', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-10' });

      await expect(service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Garantia faturável por acordo',
          valuationType: ValuationType.GUARANTEE,
          billable: true,
        },
        agentUser,
      )).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it('uses the explicit excess tariff rather than monthlyValue divided by hoursLimit', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...validTicket,
        requester: { organization: { id: 'org-1' } },
      });
      const contract = {
        id: 'contract-1',
        organizationId: 'org-1',
        active: true,
        monthlyValue: 6000,
        hoursLimit: 60,
        includedMinutes: 0,
        excessHourlyRateCents: 12000,
        type: 'HOUR_PACKAGE',
      };
      mockPrisma.contract.findMany.mockResolvedValue([contract]);
      mockPrisma.contract.findUniqueOrThrow.mockResolvedValue(contract);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-11' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z', // 60 minutes = 1h
          description: 'Atendimento contratual',
          valuationType: ValuationType.CONTRACT,
        },
        agentUser,
      );

      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', active: true }),
      }));
      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ valuationType: ValuationType.CONTRACT, value: 120, valueCents: 12000 }) }),
      );
    });

    it('should leave value null under CONTRACT when there is no active contract', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...validTicket,
        requester: { organization: { id: 'org-2' } },
      });
      mockPrisma.contract.findFirst.mockResolvedValue(null);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-12' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Sem contrato ativo',
          valuationType: ValuationType.CONTRACT,
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ valuationType: ValuationType.CONTRACT, value: null }) }),
      );
    });

    it('defaults omitted valuationType to CONTRACT and records unknown value for missing organization', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-13' });

      await service.create(
        'ticket-1',
        { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Padrão' },
        agentUser,
      );

      const callArgs = mockPrisma.worklog.create.mock.calls[0][0];
      expect(callArgs.data.valuationType).toBe(ValuationType.CONTRACT);
      expect(callArgs.data.value).toBeNull();
      expect(callArgs.data.valueCents).toBeNull();
      expect(mockPrisma.contract.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('contract valuation and transaction boundaries', () => {
    const dto = { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Atendimento' };
    const contract = {
      id: 'contract-1', name: 'Suporte', organizationId: 'org-1', active: true,
      type: 'HOUR_PACKAGE', includedMinutes: 600, hoursLimit: null, excessHourlyRateCents: 12000,
      startsAt: null, endsAt: null,
    };

    beforeEach(() => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...validTicket, requester: { organization: { id: 'org-1', name: 'Cliente' } } });
      mockPrisma.contract.findMany.mockResolvedValue([contract]);
      mockPrisma.contract.findUniqueOrThrow.mockResolvedValue(contract);
      mockPrisma.worklog.create.mockImplementation(async ({ data }) => ({ id: 'new', ...data }));
    });

    it('requires an explicit choice when several eligible contracts exist', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([contract, { ...contract, id: 'contract-2' }]);
      await expect(service.create('ticket-1', dto, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('filters explicit contract by organization and entire interval, rejecting absent eligibility', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);
      await expect(service.create('ticket-1', { ...dto, contractId: 'foreign' }, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: {
        organizationId: 'org-1', active: true, id: 'foreign',
        AND: [
          { OR: [{ startsAt: null }, { startsAt: { lte: new Date(dto.startTime) } }] },
          { OR: [{ endsAt: null }, { endsAt: { gte: new Date(dto.endTime) } }] },
        ],
      } }));
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it.each([
      { active: false }, { organizationId: 'foreign' },
      { startsAt: new Date('2026-11-01') }, { endsAt: new Date('2026-10-01') },
    ])('revalidates eligibility after locking against concurrent edits: %j', async (change) => {
      mockPrisma.contract.findUniqueOrThrow.mockResolvedValue({ ...contract, ...change });
      await expect(service.create('ticket-1', dto, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('snapshots only excess minutes in cents after previous cycle consumption', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([
        { valuationSnapshot: { segments: [{ cycleStart: '2026-10-01T03:00:00.000Z', minutes: 570 }] } },
        { valuationSnapshot: { segments: [{ cycleStart: '2026-09-01T03:00:00.000Z', minutes: 600 }] } },
        { valuationSnapshot: null },
      ]);
      const result = await service.create('ticket-1', dto, adminUser);
      expect(result).toMatchObject({ contractId: 'contract-1', value: 60, valueCents: 6000, valuationType: ValuationType.CONTRACT,
        valuationSnapshot: { organizationId: 'org-1', includedMinutes: 600, segments: [
          { minutes: 60, coveredMinutes: 30, excessMinutes: 30, amountCents: 6000, rateCents: 12000 },
        ] },
      });
    });

    it('preserves unknown excess tariff without inventing a zero', async () => {
      mockPrisma.contract.findUniqueOrThrow.mockResolvedValue({ ...contract, includedMinutes: 0, excessHourlyRateCents: null });
      const result = await service.create('ticket-1', dto, adminUser);
      expect(result.valueCents).toBeNull();
      expect(result.value).toBeNull();
      expect(result.valuationSnapshot).toMatchObject({ segments: [{ amountCents: null, excessMinutes: 60, rateCents: null }] });
    });

    it('retains the selected contract on nonbillable work without consuming allowance', async () => {
      const result = await service.create('ticket-1', { ...dto, contractId: contract.id, billable: false }, adminUser);
      expect(result).toMatchObject({ contractId: contract.id, valueCents: 0,
        valuationSnapshot: { segments: [{ minutes: 60, coveredMinutes: 0, excessMinutes: 0, amountCents: 0 }] } });
      expect(mockPrisma.worklog.findMany).not.toHaveBeenCalled();
    });

    it('rejects an invalid explicit contract even for nonbillable work', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([]);
      await expect(service.create('ticket-1', { ...dto, contractId: 'foreign', billable: false }, adminUser)).rejects.toThrow(BadRequestException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('exposes the time convention without disclosing the financial snapshot', async () => {
      const result = await service.create('ticket-1', dto, agentUser);
      expect(result).toMatchObject({ timeConvention: 'UTC', valuationSnapshot: null, valueCents: null });
    });

    it('limits eligible contracts by ticket visibility, organization and execution interval', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({ ...validTicket, requester: { organizationId: 'org-1' } });
      await service.eligibleContracts('ticket-1', dto.startTime, dto.endTime, agentUser);
      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ticket-1', AND: [TenantHelper.getTicketWhere(agentUser)] } }));
      expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({ organizationId: 'org-1', active: true }),
        select: expect.objectContaining({ excessHourlyRateCents: false }),
      }));
    });

    it('rejects invalid eligible-contract intervals and missing tickets', async () => {
      await expect(service.eligibleContracts('ticket-1', 'invalid', dto.endTime, agentUser)).rejects.toThrow(BadRequestException);
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.eligibleContracts('missing', dto.startTime, dto.endTime, agentUser)).rejects.toThrow(NotFoundException);
    });

    it.each([Role.AGENT, Role.AGENT_MASTER])('hides cents and snapshot on create/list/delete for %s', async (role) => {
      const user = { id: 'agent-1', role };
      const created = await service.create('ticket-1', dto, user);
      const financial = { id: 'wl-1', ticketId: 'ticket-1', authorId: 'agent-1', contractId: 'contract-1', value: 120, valueCents: 12000, valuationSnapshot: { rateCents: 12000 } };
      mockPrisma.worklog.findMany.mockResolvedValue([financial]);
      mockPrisma.worklog.findUnique.mockResolvedValue(financial);
      mockPrisma.worklog.delete.mockResolvedValue(financial);
      const [listed] = await service.findByTicket('ticket-1', user);
      const deleted = await service.delete('ticket-1', 'wl-1', user);
      for (const result of [created, listed, deleted]) expect(result).toMatchObject({ value: null, valueCents: null, valuationSnapshot: null });
      expect(financial.valueCents).toBe(12000);
    });

    it.each([Role.AGENT, Role.AGENT_MASTER])('forbids manual values for %s', async (role) => {
      await expect(service.create('ticket-1', { ...dto, valuationType: ValuationType.MANUAL, value: 10 }, { id: 'agent-1', role })).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.$transaction).not.toHaveBeenCalled();
    });

    it.each([{ value: -1 }, { value: Number.NaN }, { value: Infinity }, { value: 1, billable: false }])('rejects invalid ADMIN manual valuation %j', async (fields) => {
      await expect(service.create('ticket-1', { ...dto, ...fields, valuationType: ValuationType.MANUAL }, adminUser)).rejects.toThrow(BadRequestException);
    });

    it('passes scoped ticket reads to the database before returning data', async () => {
      await service.create('ticket-1', dto, agentUser);
      expect(mockPrisma.ticket.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'ticket-1', AND: [TenantHelper.getTicketWhere(agentUser)] } }));
    });

    it('propagates transactional status failures and does not send a reply or run after-commit effects', async () => {
      const effect = jest.fn();
      mockTicketsService.withTransaction.mockImplementation((_db, effects) => { effects.push(effect); return mockTicketsService; });
      mockTicketsService.changeStatus.mockRejectedValue(new BadRequestException('Invalid status transition'));
      await expect(service.create('ticket-1', { ...dto, nextStatus: TicketStatus.RESOLVED, sendAsReply: true }, adminUser)).rejects.toThrow('Invalid status transition');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockCommentsService.create).not.toHaveBeenCalled();
      expect(effect).not.toHaveBeenCalled();
    });

    it('runs deferred effects only after the transaction commits', async () => {
      const effect = jest.fn();
      mockCommentsService.withTransaction.mockImplementation((_db, effects) => { effects.push(effect); return mockCommentsService; });
      mockPrisma.$transaction.mockImplementation(async callback => {
        const result = await callback(mockPrisma);
        expect(effect).not.toHaveBeenCalled();
        return result;
      });
      await service.create('ticket-1', { ...dto, sendAsReply: true }, adminUser);
      expect(effect).toHaveBeenCalledTimes(1);
    });

    it('blocks stopping and deleting preappointments on inaccessible tickets', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);
      await expect(service.stopPreAppointment('foreign', 'pre-1', {}, agentUser)).rejects.toThrow(NotFoundException);
      await expect(service.deletePreAppointment('foreign', 'pre-1', agentUser)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.preAppointment.update).not.toHaveBeenCalled();
      expect(mockPrisma.preAppointment.delete).not.toHaveBeenCalled();
    });
  });

  describe('findByTicket', () => {
    it('should return worklogs for valid ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.findMany.mockResolvedValue([
        { id: 'wl-1', minutes: 60, description: 'Log 1' },
      ]);

      const result = await service.findByTicket('ticket-1', agentUser);

      expect(result).toHaveLength(1);
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findByTicket('none', agentUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for CLIENT', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(service.findByTicket('ticket-1', clientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    beforeEach(() => mockPrisma.ticket.findUnique.mockResolvedValue(validTicket));
    it('should allow AGENT to delete their own worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
      });
      mockPrisma.worklog.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await service.delete('ticket-1', 'wl-1', agentUser);
      expect(result.id).toBe('wl-1');
      expect(mockPrisma.worklog.delete).toHaveBeenCalledWith({ where: { id: 'wl-1' } });
    });

    it('should forbid AGENT from deleting another user worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });

      await expect(service.delete('ticket-1', 'wl-1', agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to delete any worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });
      mockPrisma.worklog.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await service.delete('ticket-1', 'wl-1', adminUser);
      expect(result.id).toBe('wl-1');
    });

    it('should throw NotFoundException when worklog not found or ticket mismatch', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'other-ticket',
        authorId: 'agent-1',
      });

      await expect(service.delete('ticket-1', 'wl-1', agentUser)).rejects.toThrow(NotFoundException);
    });
  });

  describe('pre-appointments', () => {
    const authorInclude = { author: { select: { id: true, name: true, email: true } } };

    it('creates a new pré-apontamento without replacing existing ones', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.preAppointment.create.mockResolvedValue({ id: 'pre-2' });

      const result = await service.createPreAppointment(
        'ticket-1',
        { beginning: '2026-10-15T14:36:00.000Z' },
        agentUser,
      );

      expect(result.id).toBe('pre-2');
      expect(mockPrisma.preAppointment.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-1',
          beginning: new Date('2026-10-15T14:36:00.000Z'),
          initTime: '11:36',
        },
        include: authorInclude,
      });
    });

    it('lists all pré-apontamentos of the ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.preAppointment.findMany.mockResolvedValue([{ id: 'pre-1' }, { id: 'pre-2' }]);

      const result = await service.findPreAppointments('ticket-1', agentUser);

      expect(result).toHaveLength(2);
      expect(mockPrisma.preAppointment.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        include: authorInclude,
        orderBy: { createdAt: 'desc' },
      });
    });

    it('stops an open pré-apontamento filling ending and Brasília endTime', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        beginning: new Date('2026-10-15T14:36:00.000Z'),
      });
      mockPrisma.preAppointment.update.mockResolvedValue({ id: 'pre-1' });

      await service.stopPreAppointment(
        'ticket-1',
        'pre-1',
        { ending: '2026-10-15T15:10:00.000Z' },
        agentUser,
      );

      expect(mockPrisma.preAppointment.update).toHaveBeenCalledWith({
        where: { id: 'pre-1' },
        data: {
          ending: new Date('2026-10-15T15:10:00.000Z'),
          endTime: '12:10',
        },
        include: authorInclude,
      });
    });

    it('forbids AGENT from stopping another user pré-apontamento', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
        beginning: new Date('2026-10-15T14:36:00.000Z'),
      });

      await expect(
        service.stopPreAppointment('ticket-1', 'pre-1', {}, agentUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('deletes a pré-apontamento owned by the agent', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
      });
      mockPrisma.preAppointment.delete.mockResolvedValue({ id: 'pre-1' });

      await service.deletePreAppointment('ticket-1', 'pre-1', agentUser);
      expect(mockPrisma.preAppointment.delete).toHaveBeenCalledWith({ where: { id: 'pre-1' } });
    });

    it('forbids CLIENT from creating pré-apontamentos', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(service.createPreAppointment('ticket-1', {}, clientUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('rejects an invalid beginning', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.createPreAppointment('ticket-1', { beginning: 'not-a-date' }, agentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects stopping with an ending before the beginning', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        beginning: new Date('2026-10-15T14:36:00.000Z'),
      });

      await expect(
        service.stopPreAppointment(
          'ticket-1',
          'pre-1',
          { ending: '2026-10-15T14:00:00.000Z' },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws when the pré-apontamento is missing on stop or delete', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue(null);

      await expect(
        service.stopPreAppointment('ticket-1', 'pre-missing', {}, agentUser),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.deletePreAppointment('ticket-1', 'pre-missing', agentUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws when the ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findPreAppointments('missing', agentUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('creates using now and Brasília initTime when the payload is empty', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.preAppointment.create.mockResolvedValue({ id: 'pre-now' });

      await service.createPreAppointment('ticket-1', {}, agentUser);

      const data = mockPrisma.preAppointment.create.mock.calls[0][0].data;
      expect(data.ticketId).toBe('ticket-1');
      expect(data.authorId).toBe('agent-1');
      expect(data.beginning).toBeInstanceOf(Date);
      expect(data.initTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('keeps an explicit initTime from the payload', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.preAppointment.create.mockResolvedValue({ id: 'pre-init' });

      await service.createPreAppointment(
        'ticket-1',
        { beginning: '2026-10-15T14:36:00.000Z', initTime: '19:36' },
        agentUser,
      );

      expect(mockPrisma.preAppointment.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-1',
          beginning: new Date('2026-10-15T14:36:00.000Z'),
          initTime: '19:36',
        },
        include: authorInclude,
      });
    });

    it('blocks unlisted agents from creating pré-apontamentos on a listed mesa', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...validTicket,
        serviceDesk: {
          listedGroupsOnly: true,
          agents: [],
          agentGroups: [],
        },
      });

      await expect(service.createPreAppointment('ticket-1', {}, agentUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrisma.preAppointment.create).not.toHaveBeenCalled();
    });

    it('stops using now and Brasília endTime when the payload is empty', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        beginning: new Date(Date.now() - 60_000),
      });
      mockPrisma.preAppointment.update.mockResolvedValue({ id: 'pre-1' });

      await service.stopPreAppointment('ticket-1', 'pre-1', {}, agentUser);

      const data = mockPrisma.preAppointment.update.mock.calls[0][0].data;
      expect(data.ending).toBeInstanceOf(Date);
      expect(data.endTime).toMatch(/^\d{2}:\d{2}$/);
    });

    it('keeps an explicit endTime from the payload', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        beginning: new Date('2026-10-15T14:36:00.000Z'),
      });
      mockPrisma.preAppointment.update.mockResolvedValue({ id: 'pre-1' });

      await service.stopPreAppointment(
        'ticket-1',
        'pre-1',
        { ending: '2026-10-15T15:10:00.000Z', endTime: '12:10' },
        agentUser,
      );

      expect(mockPrisma.preAppointment.update).toHaveBeenCalledWith({
        where: { id: 'pre-1' },
        data: {
          ending: new Date('2026-10-15T15:10:00.000Z'),
          endTime: '12:10',
        },
        include: authorInclude,
      });
    });

    it('rejects an invalid ending', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        beginning: new Date('2026-10-15T14:36:00.000Z'),
      });

      await expect(
        service.stopPreAppointment('ticket-1', 'pre-1', { ending: 'not-a-date' }, agentUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('lets ADMIN stop and delete another user pré-apontamento', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
        beginning: new Date('2026-10-15T14:36:00.000Z'),
      });
      mockPrisma.preAppointment.update.mockResolvedValue({ id: 'pre-1' });
      mockPrisma.preAppointment.delete.mockResolvedValue({ id: 'pre-1' });

      await service.stopPreAppointment(
        'ticket-1',
        'pre-1',
        { ending: '2026-10-15T15:10:00.000Z' },
        adminUser,
      );
      await service.deletePreAppointment('ticket-1', 'pre-1', adminUser);

      expect(mockPrisma.preAppointment.update).toHaveBeenCalled();
      expect(mockPrisma.preAppointment.delete).toHaveBeenCalledWith({ where: { id: 'pre-1' } });
    });

    it('forbids AGENT from deleting another user pré-apontamento', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });

      await expect(service.deletePreAppointment('ticket-1', 'pre-1', agentUser)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws when the pré-apontamento belongs to another ticket', async () => {
      mockPrisma.preAppointment.findUnique.mockResolvedValue({
        id: 'pre-1',
        ticketId: 'other-ticket',
        authorId: 'agent-1',
      });

      await expect(
        service.stopPreAppointment('ticket-1', 'pre-1', {}, agentUser),
      ).rejects.toThrow(NotFoundException);
      await expect(service.deletePreAppointment('ticket-1', 'pre-1', agentUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
