import { ForbiddenException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { Role } from '@prisma/client';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      worklog: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      ticket: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    service = new ReportsService(mockPrisma as any);
  });

  describe('getBilling', () => {
    it('should block AGENT from billing', async () => {
      await expect(service.getBilling({ id: '1', role: Role.AGENT })).rejects.toThrow(ForbiddenException);
    });

    it('should block AGENT_MASTER from billing', async () => {
      await expect(service.getBilling({ id: '2', role: Role.AGENT_MASTER })).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to view billing', async () => {
      const res = await service.getBilling({ id: '3', role: Role.ADMIN });
      expect(res).toEqual([]);
    });

    it('blocks a plain CLIENT from financial data consistently with the controller', async () => {
      await expect(service.getBilling({ id: 'client-1', role: Role.CLIENT })).rejects.toThrow(ForbiddenException);
    });

    it('groups billable/non-billable minutes per organization and sorts descending', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([
        {
          billable: true,
          minutes: 60,
          ticket: { requester: { organization: { id: 'org-1', name: 'Org 1' } } },
        },
        {
          billable: false,
          minutes: 30,
          ticket: { requester: { organization: { id: 'org-1', name: 'Org 1' } } },
        },
        {
          billable: true,
          minutes: 200,
          ticket: { requester: { organization: { id: 'org-2', name: 'Org 2' } } },
        },
      ]);

      const res = await service.getBilling({ id: 'admin', role: Role.ADMIN });

      expect(res).toEqual([
        { organizationId: 'org-2', organizationName: 'Org 2', billableMinutes: 200, nonBillableMinutes: 0, coveredMinutes: 0, excessMinutes: 0, totalValueCents: 0, unknownValuationCount: 1 },
        { organizationId: 'org-1', organizationName: 'Org 1', billableMinutes: 60, nonBillableMinutes: 30, coveredMinutes: 0, excessMinutes: 0, totalValueCents: 0, unknownValuationCount: 2 },
      ]);
    });

    it('falls back to SEM_EMPRESA when the requester has no organization', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([
        { billable: true, minutes: 10, ticket: { requester: { organization: null } } },
      ]);

      const res = await service.getBilling({ id: 'admin', role: Role.ADMIN });

      expect(res).toEqual([
        {
          organizationId: 'SEM_EMPRESA',
          organizationName: 'Cliente Sem Organização Vinculada',
          billableMinutes: 10,
          nonBillableMinutes: 0,
          coveredMinutes: 0, excessMinutes: 0, totalValueCents: 0, unknownValuationCount: 1,
        },
      ]);
    });
  });

  describe('getWorkload', () => {
    it('should force agent filter and allow AGENT to view their own workload', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([]);
      await service.getWorkload({ id: 'agent-1', role: Role.AGENT }, 'other-id');
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ authorId: 'agent-1' }),
        include: expect.any(Object),
      });
    });

    it('should not force filter if ADMIN', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([]);
      await service.getWorkload({ id: 'admin', role: Role.ADMIN }, 'other-id');
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({ authorId: 'other-id' }),
        include: expect.any(Object),
      });
    });

    it('allows a plain CLIENT scoped to their own requested tickets', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([]);
      await service.getWorkload({ id: 'client-1', role: Role.CLIENT });
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: { ticket: { requesterId: 'client-1' }, voidedAt: null },
        include: expect.any(Object),
      });
    });

    it('does not filter by authorId when no targetAgentId is given for non-AGENT roles', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([]);
      await service.getWorkload({ id: 'admin', role: Role.ADMIN });
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: expect.not.objectContaining({ authorId: expect.anything() }),
        include: expect.any(Object),
      });
    });

    it('sums minutes per agent and sorts descending by total', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([
        { authorId: 'a1', minutes: 30, author: { id: 'a1', name: 'Alice' } },
        { authorId: 'a1', minutes: 15, author: { id: 'a1', name: 'Alice' } },
        { authorId: 'a2', minutes: 100, author: { id: 'a2', name: 'Bob' } },
      ]);

      const res = await service.getWorkload({ id: 'admin', role: Role.ADMIN });

      expect(res).toEqual([
        { agentId: 'a2', agentName: 'Bob', totalMinutes: 100 },
        { agentId: 'a1', agentName: 'Alice', totalMinutes: 45 },
      ]);
    });
  });

  describe('getSummary', () => {
    it('blocks roles the TenantHelper fails closed for', async () => {
      await expect(
        service.getSummary({ id: 'x', role: 'UNKNOWN' as Role }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('counts open vs closed tickets and groups open ones by status', async () => {
      const now = new Date();
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          status: 'OPEN',
          createdAt: now,
          updatedAt: now,
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
        {
          status: 'IN_PROGRESS',
          createdAt: now,
          updatedAt: now,
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
        {
          status: 'RESOLVED',
          createdAt: new Date(now.getTime() - 120 * 60000),
          updatedAt: now,
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
      ]);

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      expect(res.openCount).toBe(2);
      expect(res.closedCount).toBe(1);
      expect(res.byStatus).toEqual({ OPEN: 1, IN_PROGRESS: 1 });
      expect(res.avgResolutionMinutes).toBe(120);
    });

    it('flags an open ticket as SLA-breached once its deadline has passed', async () => {
      const now = new Date();
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          status: 'OPEN',
          createdAt: new Date(now.getTime() - 60 * 60000),
          updatedAt: now,
          responseDeadline: new Date(now.getTime() - 1000),
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
      ]);

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      expect(res.slaBreachedCount).toBe(1);
    });

    it('returns avgResolutionMinutes null when nothing is closed yet', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([
        {
          status: 'OPEN',
          createdAt: new Date(),
          updatedAt: new Date(),
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
      ]);

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      expect(res.avgResolutionMinutes).toBeNull();
    });

    it('builds a 30-day trend of created/closed tickets bucketed by local day, with cancelled always zero', async () => {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 10, 0, 0);
      const fortyDaysAgo = new Date(today.getTime() - 40 * 86400000);

      mockPrisma.ticket.findMany.mockResolvedValue([
        // Created and resolved today — counts in both series for today's bucket.
        {
          status: 'RESOLVED',
          createdAt: today,
          updatedAt: today,
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
        // Still open, created today.
        {
          status: 'OPEN',
          createdAt: today,
          updatedAt: today,
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
        // Outside the trailing-30-day window — must not appear in any bucket.
        {
          status: 'CLOSED',
          createdAt: fortyDaysAgo,
          updatedAt: fortyDaysAgo,
          responseDeadline: null,
          resolveDeadline: null,
          slaAccumulatedPauseTime: 0,
          slaPausedAt: null,
        },
      ]);

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      const trend = res.ticketsTrend30d ?? [];
      expect(trend).toHaveLength(30);
      const dateKey = (d: Date) =>
        `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const todayBucket = trend.find((b) => b.date === dateKey(today));
      expect(todayBucket).toEqual({ date: dateKey(today), created: 2, closed: 1, cancelled: 0 });
      expect(trend.every((b) => b.cancelled === 0)).toBe(true);
      // Every bucket outside today's should be empty, since the only other ticket is 40 days old.
      const otherBuckets = trend.filter((b) => b.date !== dateKey(today));
      expect(otherBuckets.every((b) => b.created === 0 && b.closed === 0)).toBe(true);
    });

    it('reports honest zero/null chat metrics with real desk/agent names, never fabricated interaction numbers', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.serviceDesk = { findMany: jest.fn().mockResolvedValue([{ id: 'sd-1', name: 'Suporte N1' }]) };
      mockPrisma.user = {
        findMany: jest.fn().mockResolvedValue([{ id: 'u1', name: 'Agente Real', agentGroups: [{ name: 'N1' }] }]),
      };
      mockPrisma.appointment = { findMany: jest.fn().mockResolvedValue([]) };

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      expect(res.chatsByDepartment).toEqual([
        { department: 'Suporte N1', total: 0, inProgress: 0, waitingQueue: 0, waitingResponse: 0, avgWait: null, avgService: null },
      ]);
      expect(res.chatsByAgent).toEqual([{ name: 'Agente Real', status: null, inProgress: 0, group: 'N1' }]);
      expect(res.myChats).toEqual({ inProgress: 0, waitingResponse: 0, avgWaitMinutes: null, avgServiceMinutes: null });
      expect(res.allChats).toEqual({ inProgress: 0, waitingResponse: 0, avgWaitMinutes: null, avgServiceMinutes: null });
    });

    it('returns empty chat department/agent arrays when there are none, instead of fabricated fallback rows', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.serviceDesk = { findMany: jest.fn().mockResolvedValue([]) };
      mockPrisma.user = { findMany: jest.fn().mockResolvedValue([]) };
      mockPrisma.appointment = { findMany: jest.fn().mockResolvedValue([]) };

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      expect(res.chatsByDepartment).toEqual([]);
      expect(res.chatsByAgent).toEqual([]);
    });

    it('computes myAppointments/allAppointments as real counts from the Appointment table (Agenda module)', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.serviceDesk = { findMany: jest.fn().mockResolvedValue([]) };
      mockPrisma.user = { findMany: jest.fn().mockResolvedValue([]) };

      const now = new Date();
      const findManyAppointment = jest
        .fn()
        .mockResolvedValueOnce([{ startTime: now }])
        .mockResolvedValueOnce([{ startTime: now }, { startTime: now }]);
      mockPrisma.appointment = { findMany: findManyAppointment };

      // AGENT: TenantHelper.getAppointmentWhere also scopes "all" to { userId: user.id }.
      const res = await service.getSummary({ id: 'agent-1', role: Role.AGENT });

      expect(findManyAppointment).toHaveBeenNthCalledWith(1, {
        where: { userId: 'agent-1' },
        select: { startTime: true },
      });
      expect(findManyAppointment).toHaveBeenNthCalledWith(2, {
        where: { userId: 'agent-1' },
        select: { startTime: true },
      });

      expect(res.myAppointments).toEqual({ total: 1, today: 1, week: 1, month: 1 });
      expect(res.allAppointments).toEqual({ total: 2, today: 2, week: 2, month: 2 });
      expect(res.myAppointments).not.toHaveProperty('items');
    });

    it('falls back to empty appointment summaries when the Appointment model is unavailable', async () => {
      mockPrisma.ticket.findMany.mockResolvedValue([]);
      mockPrisma.serviceDesk = { findMany: jest.fn().mockResolvedValue([]) };
      mockPrisma.user = { findMany: jest.fn().mockResolvedValue([]) };
      // No mockPrisma.appointment at all — mirrors the defensive optional-chain
      // guard already used for serviceDesk/user/worklog in this service.

      const res = await service.getSummary({ id: 'admin', role: Role.ADMIN });

      expect(res.myAppointments).toEqual({ total: 0, today: 0, week: 0, month: 0 });
      expect(res.allAppointments).toEqual({ total: 0, today: 0, week: 0, month: 0 });
    });
  });
});
