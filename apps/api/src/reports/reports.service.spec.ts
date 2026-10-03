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
  });
});
