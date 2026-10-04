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

    it('allows a plain CLIENT scoped to their own requested tickets', async () => {
      mockPrisma.worklog.findMany.mockResolvedValue([]);
      const res = await service.getBilling({ id: 'client-1', role: Role.CLIENT });
      expect(res).toEqual([]);
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: { ticket: { requesterId: 'client-1' } },
        include: expect.any(Object),
      });
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
        { organizationId: 'org-2', organizationName: 'Org 2', billableMinutes: 200, nonBillableMinutes: 0 },
        { organizationId: 'org-1', organizationName: 'Org 1', billableMinutes: 60, nonBillableMinutes: 30 },
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
        where: { ticket: { requesterId: 'client-1' } },
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
  });
});
