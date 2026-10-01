import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma, Role, TicketPriority, TicketStatus } from '@prisma/client';
import {
  BadRequestException,
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
    $transaction: jest.Mock;
  };

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

      const result = await service.create(dto, 'requester-1');

      expect(mockTx.ticket.create).toHaveBeenCalledWith({
        include: { requester: { select: { email: true } } },
        data: expect.objectContaining({
          protocol: 'AP-2026-0001',
          title: dto.title,
          description: dto.description,
          serviceDeskId: dto.serviceDeskId,
          requesterId: 'requester-1',
          status: TicketStatus.OPEN,
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
          'requester-1',
        )) as unknown as {
          responseDeadline: Date;
          resolveDeadline: Date;
        };

        expect(result.responseDeadline.toISOString()).toBe(
          new Date(
            start.getTime() + responseHours * 3600 * 1000,
          ).toISOString(),
        );
        expect(result.resolveDeadline.toISOString()).toBe(
          new Date(start.getTime() + resolveHours * 3600 * 1000).toISOString(),
        );
      },
    );

    it('should generate sequential protocols per year based on highest existing protocol', async () => {
      jest.useFakeTimers().setSystemTime(new Date('2026-06-01T00:00:00.000Z'));
      mockTx.ticket.create.mockImplementation(({ data }) => data);

      mockTx.ticket.findFirst.mockResolvedValueOnce(null);
      const first = (await service.create(
        { title: 't1', description: 'd1', serviceDeskId: 'desk-1' },
        'requester-1',
      )) as unknown as { protocol: string };
      expect(first.protocol).toBe('AP-2026-0001');

      mockTx.ticket.findFirst.mockResolvedValueOnce({
        protocol: 'AP-2026-0001',
      });
      const second = (await service.create(
        { title: 't2', description: 'd2', serviceDeskId: 'desk-1' },
        'requester-1',
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
        'requester-1',
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
        'requester-1',
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
        'requester-1',
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
          'requester-1',
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
          'requester-1',
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
          serviceDesk: { agents: { some: { id: 'agent-1' } } } 
        },
        skip: 0,
        take: 20,
        orderBy: { createdAt: 'desc' },
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
      });
      expect(result).toEqual({
        data: [{ id: 't-1' }],
        meta: { total: 45, page: 2, limit: 10, totalPages: 5 },
      });
    });
  });

  describe('findOne', () => {
    it('returns the ticket for AGENT regardless of requester', async () => {
      const ticket = { 
        id: 't1', 
        requesterId: 'someone-else',
        serviceDesk: { agents: [{ id: 'agent-1' }] }
      };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.findOne('t1', {
        id: 'agent-1',
        role: Role.AGENT,
      });

      // The service deletes relations before returning
      const expected = { id: 't1', requesterId: 'someone-else' };
      expect(result).toEqual(expected);
    });

    it('returns the ticket for CLIENT when they are the requester', async () => {
      const ticket = { id: 't1', requesterId: 'client-1' };
      mockPrismaService.ticket.findUnique.mockResolvedValue(ticket);

      const result = await service.findOne('t1', {
        id: 'client-1',
        role: Role.CLIENT,
      });

      expect(result).toEqual(ticket);
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
  });

  describe('update', () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    const existingTicket = {
      id: 't1',
      title: 'old',
      description: 'old-desc',
      priority: TicketPriority.MEDIUM,
      createdAt,
      responseDeadline: new Date('2026-01-01T08:00:00.000Z'),
      resolveDeadline: new Date('2026-01-02T00:00:00.000Z'),
    };

    it('updates title/description without touching SLA when priority is unchanged', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.ticket.update.mockResolvedValue({});

      await service.update('t1', { title: 'new title' });

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { title: 'new title' },
      });
    });

    it('recalculates SLA deadlines from the ORIGINAL createdAt when priority changes', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(existingTicket);
      mockPrismaService.ticket.update.mockResolvedValue({});

      await service.update('t1', { priority: TicketPriority.CRITICAL });

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
        service.update('missing', { title: 'x' }),
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

      const result = await service.assign('t1', 'agent-1');

      expect(mockPrismaService.ticket.update).toHaveBeenCalledWith({
        where: { id: 't1' },
        data: { agentId: 'agent-1' },
        include: { agent: { select: { email: true } } },
      });
      expect(result.agentId).toBe('agent-1');
    });

    it('throws NotFoundException when ticket does not exist', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue(null);

      await expect(service.assign('missing', 'agent-1')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('throws BadRequestException when agentId does not reference a real user', async () => {
      mockPrismaService.ticket.findUnique.mockResolvedValue({ id: 't1' });
      mockPrismaService.ticket.update.mockImplementation(() => {
        throw prismaKnownError('P2003', { field_name: 'agentId' });
      });

      await expect(service.assign('t1', 'ghost-agent')).rejects.toThrow(
        BadRequestException,
      );
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

    // Note: CLIENT is blocked from ever reaching changeStatus() at the route
    // level (JwtAuthGuard + RolesGuard(AGENT, ADMIN) on the controller
    // method) — see tickets.controller.spec.ts for that assertion. There is
    // no route through which a CLIENT-authenticated request invokes this
    // service method at all.
  });
});
