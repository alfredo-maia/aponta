import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, TicketPriority, TicketStatus } from '@prisma/client';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service';
import { PrismaService } from '../prisma/prisma.service';

function prismaKnownError(code: string, meta: Record<string, unknown> = {}) {
  return new Prisma.PrismaClientKnownRequestError('mocked prisma error', {
    code,
    clientVersion: '7.10.0',
    meta,
  });
}

describe('TicketsService', () => {
  let service: TicketsService;
  let mockTx: {
    ticket: {
      findFirst: jest.Mock;
      create: jest.Mock;
    };
  };
  let mockPrismaService: {
    ticket: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      count: jest.Mock;
    };
    businessHour: { findMany: jest.Mock };
    holiday: { findMany: jest.Mock };
    ticketAudit: { create: jest.Mock; findMany: jest.Mock };
    serviceDesk: { findUnique: jest.Mock };
    user: { findUnique: jest.Mock };
    worklog: { findMany: jest.Mock };
    comment: { create: jest.Mock };
    ticketStage: { findFirst: jest.Mock };
    ticketStageTransition: { findUnique: jest.Mock };
    $transaction: jest.Mock;
  };

  const actingUser = { id: 'user-1', role: Role.AGENT };

  beforeEach(async () => {
    mockTx = {
      ticket: {
        findFirst: jest.fn(),
        create: jest.fn(),
      },
    };
    mockPrismaService = {
      ticket: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
      },
      businessHour: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      holiday: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ticketAudit: {
        create: jest.fn().mockResolvedValue({}),
        findMany: jest.fn().mockResolvedValue([]),
      },
      serviceDesk: {
        findUnique: jest.fn().mockResolvedValue({
          slaCriticalResponseHours: null,
          slaCriticalResolveHours: null,
          slaHighResponseHours: null,
          slaHighResolveHours: null,
          slaMediumResponseHours: null,
          slaMediumResolveHours: null,
          slaLowResponseHours: null,
          slaLowResolveHours: null,
          slaControlEnabled: true,
          defaultOpenStatus: TicketStatus.OPEN,
          active: true,
          acceptingNewTickets: true,
          internalUse: false,
          openByAgentsOnly: false,
          catalogRequiredOnOpen: false,
          requireRequesterName: false,
          requireRequesterEmail: false,
          requireRequesterPhone: false,
          requireRequesterExtension: false,
          requireResourceGroup: false,
          requireAttachments: false,
          listedGroupsOnly: false,
          unlistedCanCreateTicket: true,
          allowCancelTicket: true,
          allowAddSlaHours: false,
          allowPauseResumeSla: true,
          allowReopenUnbilled: true,
          allowReopenBilled: false,
          evaluationEnabled: false,
          defaultClosedStatus: TicketStatus.CLOSED,
          priorities: [],
          agents: [],
          agentGroups: [],
          stages: [{ id: 'stage-initial' }],
        }),
      },
      worklog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      comment: {
        create: jest.fn().mockResolvedValue({}),
      },
      ticketStage: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'stage-initial',
          isInitial: true,
          isFinal: false,
        }),
      },
      ticketStageTransition: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tr-1' }),
      },
      user: {
        findUnique: jest.fn().mockResolvedValue({
          name: 'Requester',
          email: 'requester@aponta.com',
          phone: '11999999999',
          extension: null,
        }),
      },
      $transaction: jest.fn(async (cb: (tx: unknown) => unknown) => cb(mockTx)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TicketsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get<TicketsService>(TicketsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
  });

  describe('create', () => {
    it('should create ticket with auto-calculated SLA deadlines (MEDIUM default)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00.000Z'));
      mockTx.ticket.findFirst.mockResolvedValue(null);
      mockTx.ticket.create.mockImplementation(({ data }) => ({
        id: 'ticket-1',
        ...data,
      }));

      const dto = {
        title: 'Printer broken',
        description: 'It smokes',
        serviceDeskId: 'desk-1',
      };

      const result = await service.create(dto, {
        id: 'requester-1',
        role: Role.AGENT,
      });

      expect(mockTx.ticket.create).toHaveBeenCalledWith({
        include: { requester: { select: { email: true } } },
        data: expect.objectContaining({
          protocol: 'AP-2026-0001',
          title: dto.title,
          description: dto.description,
          serviceDeskId: dto.serviceDeskId,
          requesterId: 'requester-1',
          status: TicketStatus.OPEN,
          stageId: 'stage-initial',
          priority: TicketPriority.MEDIUM,
          responseDeadline: new Date('2026-01-15T18:00:00.000Z'),
          resolveDeadline: new Date('2026-01-16T10:00:00.000Z'),
        }),
      });
      expect(result.protocol).toBe('AP-2026-0001');
    });

    it.each([
      [TicketPriority.CRITICAL, 1, 4],
      [TicketPriority.HIGH, 4, 8],
      [TicketPriority.MEDIUM, 8, 24],
      [TicketPriority.LOW, 24, 72],
    ])(
      'should calculate SLA for %s priority as %dh response / %dh resolve',
      async (priority, responseHours, resolveHours) => {
        const start = new Date('2026-03-01T00:00:00.000Z');
        jest.useFakeTimers().setSystemTime(start);
        mockTx.ticket.findFirst.mockResolvedValue(null);
        mockTx.ticket.create.mockImplementation(({ data }) => data);

        const result = (await service.create(
          {
            title: 't',
            description: 'd',
            serviceDeskId: 'desk-1',
            priority,
          },
          { id: 'requester-1', role: Role.AGENT },
        )) as unknown as {
          responseDeadline: Date;
          resolveDeadline: Date;
        };

        expect(result.responseDeadline.toISOString()).toBe(
          new Date(start.getTime() + responseHours * 3600 * 1000).toISOString(),
        );
        expect(result.resolveDeadline.toISOString()).toBe(
          new Date(start.getTime() + resolveHours * 3600 * 1000).toISOString(),
        );
      },
    );

    it('should calculate SLA using business hours when the service desk has an Expediente configured', async () => {
      // Friday 2026-01-16 is a weekday. Expediente: Mon-Fri 09:00-18:00.
      // Ticket created Friday 17:00 with CRITICAL priority (1h response,
      // 4h resolve): only 1 business hour left today (17:00-18:00), so the
      // 4h resolve deadline must roll over into Monday business hours.
      const start = new Date('2026-01-16T17:00:00.000Z'); // Friday
      jest.useFakeTimers().setSystemTime(start);
      mockTx.ticket.findFirst.mockResolvedValue(null);
      mockTx.ticket.create.mockImplementation(({ data }) => data);
      mockPrismaService.businessHour.findMany.mockResolvedValue([
        { weekday: 1, startTime: '09:00', endTime: '18:00' },
        { weekday: 2, startTime: '09:00', endTime: '18:00' },
        { weekday: 3, startTime: '09:00', endTime: '18:00' },
        { weekday: 4, startTime: '09:00', endTime: '18:00' },
        { weekday: 5, startTime: '09:00', endTime: '18:00' },
      ]);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const result = (await service.create(
        {
          title: 't',
          description: 'd',
          serviceDeskId: 'desk-1',
          priority: TicketPriority.CRITICAL,
        },
        { id: 'requester-1', role: Role.AGENT },
      )) as unknown as { responseDeadline: Date; resolveDeadline: Date };

      // 1h response: fits inside today's remaining window (17:00 -> 18:00).
      expect(result.responseDeadline.toISOString()).toBe(
        '2026-01-16T18:00:00.000Z',
      );
      // 4h resolve: 1h left Friday + roll to Monday 09:00 for the remaining 3h.
      expect(result.resolveDeadline.toISOString()).toBe(
        '2026-01-19T12:00:00.000Z',
      );
      expect(mockPrismaService.businessHour.findMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1' },
      });
    });

    it('should fall back to 24/7 wall-clock SLA when the service desk has no Expediente configured', async () => {
      const start = new Date('2026-01-16T17:00:00.000Z');
      jest.useFakeTimers().setSystemTime(start);
      mockTx.ticket.findFirst.mockResolvedValue(null);
      mockTx.ticket.create.mockImplementation(({ data }) => data);
      mockPrismaService.businessHour.findMany.mockResolvedValue([]);
      mockPrismaService.holiday.findMany.mockResolvedValue([]);

      const result = (await service.create(
        {
          title: 't',
          description: 'd',
          serviceDeskId: 'desk-1',
          priority: TicketPriority.CRITICAL,
        },
        { id: 'requester-1', role: Role.AGENT },
      )) as unknown as { responseDeadline: Date; resolveDeadline: Date };

      expect(result.responseDeadline.toISOString()).toBe(
        '2026-01-16T18:00:00.000Z',
      );
      expect(result.resolveDeadline.toISOString()).toBe(
        '2026-01-16T21:00:00.000Z',
      );
    });

    it('should generate sequential protocols per year based on highest existing protocol', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      mockTx.ticket.create.mockImplementation(({ data }) => data);

      mockTx.ticket.findFirst.mockResolvedValueOnce(null);
      const first = (await service.create(
        { title: 't1', description: 'd1', serviceDeskId: 'desk-1' },
        { id: 'requester-1', role: Role.AGENT },
      )) as unknown as { protocol: string };
      expect(first.protocol).toBe('AP-2026-0001');

      mockTx.ticket.findFirst.mockResolvedValueOnce({
        protocol: 'AP-2026-0001',
      });
      const second = (await service.create(
        { title: 't2', description: 'd2', serviceDeskId: 'desk-1' },
        { id: 'requester-1', role: Role.AGENT },
      )) as unknown as { protocol: string };
      expect(second.protocol).toBe('AP-2026-0002');
    });

    it('should derive the next protocol from the highest surviving row even when earlier rows in the year were deleted (gap)', async () => {
      // Regression test: earlier tickets AP-2026-0001..0004 were deleted
      // (e.g. admin cleanup / future soft-delete / failed test teardown),
      // leaving only AP-2026-0005 as the highest surviving protocol for
      // the year. A count()-based derivation would see 1 remaining row
      // and incorrectly compute AP-2026-0002 (a collision waiting to
      // happen). The correct behavior is to find the actual highest
      // existing protocol and increment its numeric suffix, yielding
      // AP-2026-0006 regardless of how many rows exist in between.
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      mockTx.ticket.findFirst.mockResolvedValueOnce({
        protocol: 'AP-2026-0005',
      });
      mockTx.ticket.create.mockImplementation(({ data }) => data);

      const result = (await service.create(
        { title: 't', description: 'd', serviceDeskId: 'desk-1' },
        { id: 'requester-1', role: Role.AGENT },
      )) as unknown as { protocol: string };

      expect(result.protocol).toBe('AP-2026-0006');
      expect(mockTx.ticket.findFirst).toHaveBeenCalledWith({
        where: { protocol: { startsWith: 'AP-2026-' } },
        orderBy: { protocol: 'desc' },
      });
    });

    it('should scope highest-protocol lookup by year prefix, not across all years', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2027-01-01T00:00:00.000Z'));
      mockTx.ticket.findFirst.mockResolvedValue({ protocol: 'AP-2027-0005' });
      mockTx.ticket.create.mockImplementation(({ data }) => data);

      await service.create(
        { title: 't', description: 'd', serviceDeskId: 'desk-1' },
        { id: 'requester-1', role: Role.AGENT },
      );

      expect(mockTx.ticket.findFirst).toHaveBeenCalledWith({
        where: { protocol: { startsWith: 'AP-2027-' } },
        orderBy: { protocol: 'desc' },
      });
    });

    it('should retry protocol generation once on a unique constraint collision (simulated race)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      // First attempt: findFirst says no rows yet -> would-be protocol
      // AP-2026-0001, but the insert collides (another concurrent request
      // already committed that protocol). Second attempt: findFirst now
      // sees the concurrently-committed AP-2026-0001 as the highest row
      // -> AP-2026-0002, which succeeds. This proves the app-level retry
      // path reacts correctly to a DB-reported collision; it does NOT
      // execute two real concurrent DB transactions, so it does not prove
      // real Postgres race behavior end-to-end (see report for the honest
      // scope of this test).
      mockTx.ticket.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ protocol: 'AP-2026-0001' });
      mockTx.ticket.create
        .mockImplementationOnce(() => {
          throw prismaKnownError('P2002', { target: ['protocol'] });
        })
        .mockImplementationOnce(({ data }) => data);

      const result = (await service.create(
        { title: 't', description: 'd', serviceDeskId: 'desk-1' },
        { id: 'requester-1', role: Role.AGENT },
      )) as unknown as { protocol: string };

      expect(result.protocol).toBe('AP-2026-0002');
      expect(mockTx.ticket.create).toHaveBeenCalledTimes(2);
    });

    it('should give up and rethrow after exhausting protocol retry attempts', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      mockTx.ticket.findFirst.mockResolvedValue(null);
      mockTx.ticket.create.mockImplementation(() => {
        throw prismaKnownError('P2002', { target: ['protocol'] });
      });

      await expect(
        service.create(
          { title: 't', description: 'd', serviceDeskId: 'desk-1' },
          { id: 'requester-1', role: Role.AGENT },
        ),
      ).rejects.toThrow();
    });

    it('should not swallow unrelated prisma errors from create', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      mockTx.ticket.findFirst.mockResolvedValue(null);
      mockTx.ticket.create.mockImplementation(() => {
        throw prismaKnownError('P2003', { field_name: 'serviceDeskId' });
      });

      await expect(
        service.create(
          { title: 't', description: 'd', serviceDeskId: 'bad-desk' },
          { id: 'requester-1', role: Role.AGENT },
        ),
      ).rejects.toThrow();
      expect(mockTx.ticket.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('findAll', () => {
    it('should list tickets filtered by serviceDeskId and status for AGENT', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { serviceDeskId: 'desk-1', status: TicketStatus.OPEN },
        { id: 'agent-1', role: Role.AGENT },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          serviceDeskId: 'desk-1',
          status: TicketStatus.OPEN,
          serviceDesk: {
            OR: [
              { agents: { some: { id: 'agent-1' } } },
              {
                agentGroups: { some: { members: { some: { id: 'agent-1' } } } },
              },
              { allowCrossDeskInteraction: true },
            ],
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('should not allow CLIENT to see other users tickets (forces requesterId filter)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { serviceDeskId: 'desk-1' },
        { id: 'client-1', role: Role.CLIENT },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1', requesterId: 'client-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('AGENT/ADMIN see tickets across all requesters (no requesterId filter)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll({}, { id: 'admin-1', role: Role.ADMIN });

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by priority', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { priority: TicketPriority.CRITICAL },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { priority: TicketPriority.CRITICAL },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('applies a case-insensitive search filter across title/protocol/description', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { search: 'printer' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { title: { contains: 'printer', mode: 'insensitive' } },
            { protocol: { contains: 'printer', mode: 'insensitive' } },
            { description: { contains: 'printer', mode: 'insensitive' } },
          ],
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('paginates using page/limit and returns meta', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([{ id: 't-1' }]);
      mockPrismaService.ticket.count.mockResolvedValue(45);

      const result = await service.findAll(
        { page: '2', limit: '10' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 10,
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      expect(result).toEqual({
        data: [{ id: 't-1', responseSlaStatus: null, resolveSlaStatus: null }],
        meta: { total: 45, page: 2, limit: 10, totalPages: 5 },
      });
    });

    it('decorates each listed ticket with responseSlaStatus/resolveSlaStatus', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T05:00:00.000Z'));
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 't-1',
          status: TicketStatus.OPEN,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          responseDeadline: new Date('2026-01-01T10:00:00.000Z'),
          resolveDeadline: new Date('2026-01-01T04:00:00.000Z'),
        },
      ]);

      const result = await service.findAll(
        {},
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(result.data[0]).toMatchObject({
        responseSlaStatus: 'ON_TRACK',
        resolveSlaStatus: 'BREACHED',
      });
    });

    it('does not report BREACHED/AT_RISK SLA status for RESOLVED or CLOSED tickets (already past deadline but settled)', async () => {
      // A ticket resolved WITHIN its deadline, long ago, should not keep
      // showing "Vencido" forever just because wall-clock time moved on —
      // there's no `resolvedAt` to compare against, so the safe behavior
      // is to suppress the (now meaningless) SLA status once the ticket
      // reaches a terminal state.
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 't-resolved',
          status: TicketStatus.RESOLVED,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          responseDeadline: new Date('2026-01-01T10:00:00.000Z'),
          resolveDeadline: new Date('2026-01-01T04:00:00.000Z'),
        },
        {
          id: 't-closed',
          status: TicketStatus.CLOSED,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          responseDeadline: new Date('2026-01-01T10:00:00.000Z'),
          resolveDeadline: new Date('2026-01-01T04:00:00.000Z'),
        },
      ]);

      const result = await service.findAll(
        {},
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(result.data[0]).toMatchObject({
        responseSlaStatus: null,
        resolveSlaStatus: null,
      });
      expect(result.data[1]).toMatchObject({
        responseSlaStatus: null,
        resolveSlaStatus: null,
      });
    });

    it('filters to tickets assigned to the current user when mine=true (dashboard "Meus" KPI)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { mine: 'true' },
        { id: 'agent-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { agentId: 'agent-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters to open tickets with no agent when unassigned=true (dashboard "Não atendidos" KPI)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { unassigned: 'true' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          agentId: null,
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters to ON_HOLD/PENDING_CUSTOMER/PENDING_APPROVAL when paused=true (dashboard "Pausados" KPI)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { paused: 'true' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          status: {
            in: [
              TicketStatus.ON_HOLD,
              TicketStatus.PENDING_CUSTOMER,
              TicketStatus.PENDING_APPROVAL,
            ],
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters to SLA-breached open tickets when overdue=true, computed in memory and paginated manually (dashboard "Vencidos" KPI)', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      mockPrismaService.ticket.findMany.mockResolvedValue([
        {
          id: 'breached-response',
          status: TicketStatus.OPEN,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          responseDeadline: new Date('2026-01-01T10:00:00.000Z'), // already past "now"
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
        {
          id: 'on-track',
          status: TicketStatus.OPEN,
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          responseDeadline: new Date('2026-01-10T00:00:00.000Z'), // far in the future
          resolveDeadline: new Date('2026-01-10T00:00:00.000Z'),
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
      ]);

      const result = await service.findAll(
        { overdue: 'true' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      // Overdue can't be a Prisma `where`, so it fetches the open candidate
      // set (no skip/take — pagination happens after the in-memory filter)
      // and excludes closed/resolved tickets at the DB level.
      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          status: { notIn: [TicketStatus.RESOLVED, TicketStatus.CLOSED] },
        },
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      expect(mockPrismaService.ticket.count).not.toHaveBeenCalled();

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({
        id: 'breached-response',
        responseSlaStatus: 'BREACHED',
      });
      expect(result.meta).toEqual({
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('paginates the in-memory overdue result set using page/limit', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-02T00:00:00.000Z'));
      const breachedTickets = Array.from({ length: 3 }, (_, i) => ({
        id: `breached-${i}`,
        status: TicketStatus.OPEN,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        responseDeadline: new Date('2026-01-01T10:00:00.000Z'),
        resolveDeadline: null,
        slaAccumulatedPauseTime: 0,
        slaPausedAt: null,
      }));
      mockPrismaService.ticket.findMany.mockResolvedValue(breachedTickets);

      const result = await service.findAll(
        { overdue: 'true', page: '2', limit: '2' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toMatchObject({ id: 'breached-2' });
      expect(result.meta).toEqual({
        total: 3,
        page: 2,
        limit: 2,
        totalPages: 2,
      });
    });

    it('filters by protocol substring via "number" (Busca avançada)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { number: '0007' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { protocol: { contains: '0007', mode: 'insensitive' } },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by title substring via "titleContains" (Busca avançada)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { titleContains: 'impressora' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { title: { contains: 'impressora', mode: 'insensitive' } },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by requester name/email substring via "requesterQuery" (Busca avançada)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { requesterQuery: 'maria' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          requester: {
            OR: [
              { name: { contains: 'maria', mode: 'insensitive' } },
              { email: { contains: 'maria', mode: 'insensitive' } },
            ],
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by a specific agentId (Busca avançada "Atendente")', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { agentId: 'agent-7' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { agentId: 'agent-7' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by a list of agentIds (Kanban avatar filter, multi-select)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { agentIds: ['agent-1', 'agent-2'] },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { agentId: { in: ['agent-1', 'agent-2'] } },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('"mine=true" wins over an explicit agentId/agentIds (prevents a client faking another agent\'s queue)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { mine: 'true', agentId: 'someone-else' },
        { id: 'agent-1', role: Role.AGENT },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ agentId: 'agent-1' }) }),
      );
    });

    it('filters by stageId (Busca avançada "Estágio")', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { stageId: 'stage-1' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: { stageId: 'stage-1' },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by a createdAt date range when dateField is createdAt (or omitted)', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { dateFrom: '2026-01-01', dateTo: '2026-01-31' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: new Date('2026-01-01'),
            lte: new Date('2026-01-31'),
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('filters by a closedAt date range when dateField is closedAt', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { dateField: 'closedAt', dateFrom: '2026-02-01', dateTo: '2026-02-28' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          closedAt: {
            gte: new Date('2026-02-01'),
            lte: new Date('2026-02-28'),
          },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('sorts by an allow-listed field and direction via sortBy/sortDir', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { sortBy: 'title', sortDir: 'asc' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { title: 'asc' },
        include: expect.any(Object),
      });
    });

    it('ignores a sortBy field not on the allow-list and falls back to createdAt desc', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { sortBy: 'description' as any, sortDir: 'asc' },
        { id: 'admin-1', role: Role.ADMIN },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
    });

    it('AC10: a CLIENT forcing agentId/organizationId in the query still only gets their own tickets', async () => {
      mockPrismaService.ticket.findMany.mockResolvedValue([]);

      await service.findAll(
        { agentId: 'someone-else', organizationId: 'org-not-mine' },
        { id: 'client-1', role: Role.CLIENT },
      );

      expect(mockPrismaService.ticket.findMany).toHaveBeenCalledWith({
        where: {
          requesterId: 'client-1',
          agentId: 'someone-else',
          requester: { organizationId: 'org-not-mine' },
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
        include: expect.any(Object),
      });
      // requesterId: 'client-1' is ANDed with the attacker-supplied filters,
      // so Prisma can never return a row that isn't also the client's own —
      // the base tenant scope always wins regardless of what the client sends.
    });
  });

  describe('findOne', () => {
    it('returns the ticket for AGENT regardless of requester', async () => {
      const ticket = {
        id: 't1',
        requesterId: 'someone-else',
        serviceDesk: { agents: [{ id: 'agent-1' }] },
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.findOne('t1', {
        id: 'agent-1',
        role: Role.AGENT,
      });

      expect(result).toEqual({
        id: 't1',
        requesterId: 'someone-else',
        nextStages: [],
        serviceDesk: {},
        responseSlaStatus: null,
        resolveSlaStatus: null,
      });
    });

    it('returns the ticket for CLIENT when they are the requester', async () => {
      const ticket = { id: 't1', requesterId: 'client-1' };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.findOne('t1', {
        id: 'client-1',
        role: Role.CLIENT,
      });

      expect(result).toEqual({
        ...ticket,
        responseSlaStatus: null,
        resolveSlaStatus: null,
      });
    });

    it('throws NotFoundException when CLIENT requests another users ticket', async () => {
      const ticket = { id: 't1', requesterId: 'someone-else' };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      await expect(
        service.findOne('t1', { id: 'client-1', role: Role.CLIENT }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne('missing', { id: 'admin-1', role: Role.ADMIN }),
      ).rejects.toThrow(NotFoundException);
    });

    it('returns the ticket for AGENT when the mesa allows cross-desk interaction', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        requesterId: 'someone-else',
        serviceDesk: {
          agents: [],
          allowCrossDeskInteraction: true,
          ticketSections: [],
        },
      });

      const result = await service.findOne('t1', {
        id: 'agent-1',
        role: Role.AGENT,
      });

      expect(result).toEqual({
        id: 't1',
        requesterId: 'someone-else',
        nextStages: [],
        serviceDesk: { allowCrossDeskInteraction: true, ticketSections: [] },
        responseSlaStatus: null,
        resolveSlaStatus: null,
      });
    });

    it('decorates the ticket with responseSlaStatus/resolveSlaStatus when deadlines are present', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-01T09:30:00.000Z'));
      const ticket = {
        id: 't1',
        requesterId: 'admin-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        responseDeadline: new Date('2026-01-01T10:00:00.000Z'),
        resolveDeadline: new Date('2026-01-02T00:00:00.000Z'),
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = (await service.findOne('t1', {
        id: 'admin-1',
        role: Role.ADMIN,
      })) as unknown as {
        responseSlaStatus: string;
        resolveSlaStatus: string;
      };

      expect(result.responseSlaStatus).toBe('AT_RISK'); // 9.5h of 10h elapsed = 95%
      expect(result.resolveSlaStatus).toBe('ON_TRACK');
    });

    it('suppresses SLA status for a RESOLVED ticket even past its deadline', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      const ticket = {
        id: 't1',
        requesterId: 'admin-1',
        status: TicketStatus.RESOLVED,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        responseDeadline: new Date('2026-01-01T10:00:00.000Z'),
        resolveDeadline: new Date('2026-01-02T00:00:00.000Z'),
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = (await service.findOne('t1', {
        id: 'admin-1',
        role: Role.ADMIN,
      })) as unknown as {
        responseSlaStatus: string | null;
        resolveSlaStatus: string | null;
      };

      expect(result.responseSlaStatus).toBeNull();
      expect(result.resolveSlaStatus).toBeNull();
    });
  });

  describe('update', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const existingTicket = {
      id: 't1',
      title: 'old',
      description: 'old-desc',
      priority: TicketPriority.MEDIUM,
      createdAt,
      serviceDeskId: 'desk-1',
      responseDeadline: new Date('2026-01-01T08:00:00.000Z'),
      resolveDeadline: new Date('2026-01-02T00:00:00.000Z'),
    };

    it('updates title/description without touching SLA when priority is unchanged', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.ticket.update.mockResolvedValue({});

      await service.update('t1', { title: 'new title' }, actingUser);

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { title: 'new title' },
      });
    });

    it('recalculates SLA deadlines from the ORIGINAL createdAt when priority changes', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.ticket.update.mockResolvedValue({});

      await service.update(
        't1',
        { priority: TicketPriority.CRITICAL },
        actingUser,
      );

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          priority: TicketPriority.CRITICAL,
          responseDeadline: new Date('2026-01-01T01:00:00.000Z'),
          resolveDeadline: new Date('2026-01-01T04:00:00.000Z'),
        },
      });
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { title: 'x' }, actingUser),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('assign', () => {
    it('assigns an agent to a ticket', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({ id: 't1' });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        agentId: 'agent-1',
      });

      const result = await service.assign('t1', 'agent-1', actingUser);

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { agentId: 'agent-1' },
        include: { agent: { select: { email: true } } },
      });
      expect(result.agentId).toBe('agent-1');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.assign('missing', 'agent-1', actingUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when agentId does not reference a real user', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({ id: 't1' });
      mockPrismaService.ticket.update.mockImplementation(() => {
        throw prismaKnownError('P2003', { field_name: 'agentId' });
      });

      await expect(
        service.assign('t1', 'ghost-agent', actingUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('changeStatus (state machine)', () => {
    it('allows a valid forward transition OPEN -> IN_PROGRESS', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
      });

      const result = await service.changeStatus(
        't1',
        TicketStatus.IN_PROGRESS,
        { id: 'agent-1', role: Role.AGENT },
      );

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: TicketStatus.IN_PROGRESS },
        include: { requester: { select: { email: true } } },
      });
      expect(result.status).toBe(TicketStatus.IN_PROGRESS);
    });

    it('rejects an invalid transition that skips a step (OPEN -> RESOLVED)', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });

      await expect(
        service.changeStatus('t1', TicketStatus.RESOLVED, {
          id: 'agent-1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });

    it('rejects a backward transition for AGENT (RESOLVED -> OPEN)', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.RESOLVED,
      });

      await expect(
        service.changeStatus('t1', TicketStatus.OPEN, {
          id: 'agent-1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejects CLOSED -> OPEN reopen for AGENT', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
      });

      await expect(
        service.changeStatus('t1', TicketStatus.OPEN, {
          id: 'agent-1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows CLOSED -> OPEN reopen for ADMIN only', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });

      const result = await service.changeStatus('t1', TicketStatus.OPEN, {
        id: 'admin-1',
        role: Role.ADMIN,
      });

      expect(result.status).toBe(TicketStatus.OPEN);
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.changeStatus('missing', TicketStatus.IN_PROGRESS, {
          id: 'agent-1',
          role: Role.AGENT,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('generates a csatToken when transitioning to RESOLVED and evaluation is enabled', async () => {
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        evaluationEnabled: true,
        listedGroupsOnly: false,
        allowPauseResumeSla: true,
        allowReopenUnbilled: true,
        allowReopenBilled: false,
        agents: [],
        agentGroups: [],
      });
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
        csatToken: null,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.RESOLVED,
        csatToken: 'generated-token',
      });

      await service.changeStatus('t1', TicketStatus.RESOLVED, {
        id: 'agent-1',
        role: Role.AGENT,
      });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          status: TicketStatus.RESOLVED,
          csatToken: expect.any(String),
          closedAt: expect.any(Date),
        },
        include: { requester: { select: { email: true } } },
      });
    });

    it('does not overwrite an existing csatToken when transitioning to RESOLVED again', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
        csatToken: 'already-existing-token',
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.RESOLVED,
        csatToken: 'already-existing-token',
      });

      await service.changeStatus('t1', TicketStatus.RESOLVED, {
        id: 'agent-1',
        role: Role.AGENT,
      });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: TicketStatus.RESOLVED, closedAt: expect.any(Date) },
        include: { requester: { select: { email: true } } },
      });
    });

    it('sets closedAt when transitioning to CLOSED (Busca avançada "Data de Fechamento", D8/Q1)', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.RESOLVED,
        csatToken: null,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
      });

      await service.changeStatus('t1', TicketStatus.CLOSED, {
        id: 'agent-1',
        role: Role.AGENT,
      });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: TicketStatus.CLOSED, closedAt: expect.any(Date) },
        include: { requester: { select: { email: true } } },
      });
    });

    it('clears closedAt when an ADMIN reopens a CLOSED ticket back to OPEN', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
        closedAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });

      await service.changeStatus('t1', TicketStatus.OPEN, {
        id: 'admin-1',
        role: Role.ADMIN,
      });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ closedAt: null }),
        }),
      );
    });

    // Note: CLIENT is blocked from ever reaching changeStatus() at the route
    // level (JwtAuthGuard + RolesGuard(AGENT, ADMIN) on the controller
    // method) — see tickets.controller.spec.ts for that assertion. There is
    // no route through which a CLIENT-authenticated request invokes this
    // service method at all.
  });

  describe('audit trail', () => {
    it('records a TicketAudit row when priority changes via update()', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        title: 'old',
        description: 'old-desc',
        priority: TicketPriority.MEDIUM,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.ticket.update.mockResolvedValue({});

      await service.update(
        't1',
        { priority: TicketPriority.CRITICAL },
        actingUser,
      );

      expect(mockPrismaService.ticketAudit.create).toHaveBeenCalledWith({
        data: {
          action: 'PRIORITY_CHANGED',
          prevVal: TicketPriority.MEDIUM,
          newVal: TicketPriority.CRITICAL,
          ticketId: 't1',
          userId: actingUser.id,
        },
      });
    });

    it('does NOT record an audit row when update() changes only title/description', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        title: 'old',
        description: 'old-desc',
        priority: TicketPriority.MEDIUM,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.ticket.update.mockResolvedValue({});

      await service.update('t1', { title: 'new title' }, actingUser);

      expect(mockPrismaService.ticketAudit.create).not.toHaveBeenCalled();
    });

    it('records a TicketAudit row when an agent is (re)assigned', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        agentId: null,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        agentId: 'agent-2',
      });

      await service.assign('t1', 'agent-2', actingUser);

      expect(mockPrismaService.ticketAudit.create).toHaveBeenCalledWith({
        data: {
          action: 'ASSIGNED',
          prevVal: null,
          newVal: 'agent-2',
          ticketId: 't1',
          userId: actingUser.id,
        },
      });
    });

    it('records a TicketAudit row on a valid status transition', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
      });

      await service.changeStatus('t1', TicketStatus.IN_PROGRESS, actingUser);

      expect(mockPrismaService.ticketAudit.create).toHaveBeenCalledWith({
        data: {
          action: 'STATUS_CHANGED',
          prevVal: TicketStatus.OPEN,
          newVal: TicketStatus.IN_PROGRESS,
          ticketId: 't1',
          userId: actingUser.id,
        },
      });
    });

    it('does NOT record an audit row when a status transition is rejected', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });

      await expect(
        service.changeStatus('t1', TicketStatus.RESOLVED, actingUser),
      ).rejects.toThrow(BadRequestException);

      expect(mockPrismaService.ticketAudit.create).not.toHaveBeenCalled();
    });
  });

  describe('changeServiceDesk', () => {
    it('moves the ticket to a different service desk and records an audit row', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        id: 'desk-2',
        name: 'Financeiro',
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        serviceDeskId: 'desk-2',
      });

      const result = await service.changeServiceDesk(
        't1',
        'desk-2',
        actingUser,
      );

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { serviceDeskId: 'desk-2', stageId: 'stage-initial' },
      });
      expect(mockPrismaService.ticketAudit.create).toHaveBeenCalledWith({
        data: {
          action: 'SERVICE_DESK_CHANGED',
          prevVal: 'desk-1',
          newVal: 'desk-2',
          ticketId: 't1',
          userId: actingUser.id,
        },
      });
      expect(result.serviceDeskId).toBe('desk-2');
    });

    it('throws NotFoundException when the ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.changeServiceDesk('missing', 'desk-2', actingUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException when the target service desk does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue(null);

      await expect(
        service.changeServiceDesk('t1', 'ghost-desk', actingUser),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });

    it('is a no-op (no audit, no update) when the target desk is the same as the current one', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        id: 'desk-1',
        name: 'Suporte Geral',
      });

      await service.changeServiceDesk('t1', 'desk-1', actingUser);

      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
      expect(mockPrismaService.ticketAudit.create).not.toHaveBeenCalled();
    });
  });

  describe('findAudits', () => {
    it('returns the audit trail for a ticket ordered oldest first, with the acting user name', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({ id: 't1' });
      mockPrismaService.ticketAudit.findMany.mockResolvedValue([
        {
          id: 'a1',
          action: 'STATUS_CHANGED',
          prevVal: 'OPEN',
          newVal: 'IN_PROGRESS',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          user: { name: 'Agente Teste' },
        },
      ]);

      const result = await service.findAudits('t1');

      expect(mockPrismaService.ticketAudit.findMany).toHaveBeenCalledWith({
        where: { ticketId: 't1' },
        orderBy: { createdAt: 'asc' },
        include: { user: { select: { name: true } } },
      });
      expect(result).toEqual([
        {
          id: 'a1',
          action: 'STATUS_CHANGED',
          prevVal: 'OPEN',
          newVal: 'IN_PROGRESS',
          createdAt: new Date('2026-01-01T00:00:00.000Z'),
          user: { name: 'Agente Teste' },
        },
      ]);
    });

    it('throws NotFoundException when the ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findAudits('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('closes the ticket with defaultClosedStatus and writes a cancelled audit', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
      });

      const result = await service.cancel('t1', actingUser);

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { status: TicketStatus.CLOSED, closedAt: expect.any(Date) },
        include: { requester: { select: { email: true } } },
      });
      expect(mockPrismaService.ticketAudit.create).toHaveBeenCalledWith({
        data: {
          action: 'cancelled',
          prevVal: TicketStatus.OPEN,
          newVal: TicketStatus.CLOSED,
          ticketId: 't1',
          userId: actingUser.id,
        },
      });
      expect(result.status).toBe(TicketStatus.CLOSED);
    });

    it('returns 403 when the mesa forbids cancel', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        allowCancelTicket: false,
        listedGroupsOnly: false,
        agents: [],
        agentGroups: [],
      });

      await expect(service.cancel('t1', actingUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });
  });

  describe('addSlaHours', () => {
    it('extends both deadlines when the mesa allows it', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-01-15T10:00:00.000Z'));
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        serviceDeskId: 'desk-1',
        responseDeadline: new Date('2026-01-15T12:00:00.000Z'),
        resolveDeadline: new Date('2026-01-16T10:00:00.000Z'),
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        allowAddSlaHours: true,
        slaControlEnabled: true,
        listedGroupsOnly: false,
        agents: [],
        agentGroups: [],
      });
      mockPrismaService.ticket.update.mockResolvedValue({ id: 't1' });

      await service.addSlaHours('t1', 2, actingUser);

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          responseDeadline: new Date('2026-01-15T14:00:00.000Z'),
          resolveDeadline: new Date('2026-01-16T12:00:00.000Z'),
        },
      });
    });

    it('returns 403 when the mesa forbids adding hours', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        serviceDeskId: 'desk-1',
        responseDeadline: new Date('2026-01-15T12:00:00.000Z'),
        resolveDeadline: new Date('2026-01-16T10:00:00.000Z'),
      });

      await expect(service.addSlaHours('t1', 2, actingUser)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('mesa reopen and pause policy', () => {
    it('forbids billed reopen when allowReopenBilled is false', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.worklog.findMany.mockResolvedValue([
        { billable: true, valuationType: 'CONTRACT', value: null },
      ]);

      await expect(
        service.changeStatus('t1', TicketStatus.OPEN, {
          id: 'admin-1',
          role: Role.ADMIN,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrismaService.ticket.update).not.toHaveBeenCalled();
    });

    it('posts the default reopen reply when configured', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.CLOSED,
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        listedGroupsOnly: false,
        allowPauseResumeSla: true,
        allowReopenUnbilled: true,
        allowReopenBilled: false,
        reopenDefaultReplyUnbilled: 'Reaberto pela mesa.',
        agents: [],
        agentGroups: [],
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
      });

      await service.changeStatus('t1', TicketStatus.OPEN, {
        id: 'admin-1',
        role: Role.ADMIN,
      });

      expect(mockPrismaService.comment.create).toHaveBeenCalledWith({
        data: {
          content: 'Reaberto pela mesa.',
          isInternal: false,
          ticketId: 't1',
          authorId: 'admin-1',
        },
      });
    });

    it('forbids pause when allowPauseResumeSla is false', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.IN_PROGRESS,
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        listedGroupsOnly: false,
        allowPauseResumeSla: false,
        agents: [],
        agentGroups: [],
      });

      await expect(
        service.changeStatus('t1', TicketStatus.ON_HOLD, actingUser),
      ).rejects.toThrow(ForbiddenException);
    });

    it('forbids unlisted agents from changing status when listedGroupsOnly', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        status: TicketStatus.OPEN,
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({
        listedGroupsOnly: true,
        allowPauseResumeSla: true,
        agents: [],
        agentGroups: [],
      });

      await expect(
        service.changeStatus('t1', TicketStatus.IN_PROGRESS, actingUser),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('changeStage', () => {
    it('moves the ticket when the transition exists and closes on final stage', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        stageId: 'stage-initial',
        serviceDeskId: 'desk-1',
        status: TicketStatus.OPEN,
      });
      mockPrismaService.ticketStage.findFirst.mockResolvedValue({
        id: 'stage-final',
        isInitial: false,
        isFinal: true,
      });
      mockPrismaService.ticket.update.mockResolvedValue({
        id: 't1',
        stageId: 'stage-final',
        status: TicketStatus.CLOSED,
      });

      const result = await service.changeStage('t1', 'stage-final', actingUser);

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: {
          stage: { connect: { id: 'stage-final' } },
          status: TicketStatus.CLOSED,
        },
      });
      expect(result.status).toBe(TicketStatus.CLOSED);
    });

    it('rejects a transition that is not configured', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({
        id: 't1',
        stageId: 'stage-initial',
        serviceDeskId: 'desk-1',
      });
      mockPrismaService.ticketStage.findFirst.mockResolvedValue({
        id: 'stage-n2',
        isInitial: false,
        isFinal: false,
      });
      mockPrismaService.ticketStageTransition.findUnique.mockResolvedValue(
        null,
      );

      await expect(
        service.changeStage('t1', 'stage-n2', actingUser),
      ).rejects.toThrow('Transição de estágio não permitida');
    });
  });
});
