import { ContractsService } from './contracts.service';
import { Role } from '@prisma/client';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';

describe('ContractsService', () => {
  let service: ContractsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      $transaction: jest.fn(callback => callback(mockPrisma)),
      $queryRaw: jest.fn().mockResolvedValue([]),
      contract: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        findUnique: jest.fn().mockResolvedValue({ id: 'c1', organizationId: 'org-1' }),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      worklog: { count: jest.fn().mockResolvedValue(0) },
    };
    service = new ContractsService(mockPrisma as any);
  });

  it.each([Role.AGENT, Role.AGENT_MASTER])('masks explicit rates in list and detail for %s', async (role) => {
    const contract = { id: 'c1', excessHourlyRateCents: 12000, monthlyValue: 0 };
    mockPrisma.contract.findMany.mockResolvedValue([contract]);
    mockPrisma.contract.findFirst.mockResolvedValue(contract);
    expect((await service.findAll({ id: 'u1', role }))[0].excessHourlyRateCents).toBeNull();
    expect((await service.findOne('c1', { id: 'u1', role })).excessHourlyRateCents).toBeNull();
    expect(contract.excessHourlyRateCents).toBe(12000);
  });

  it('scopes detail to the client organization and hides missing/foreign contracts', async () => {
    mockPrisma.contract.findFirst.mockResolvedValue(null);
    await expect(service.findOne('foreign', { id: 'u1', role: Role.CLIENT_MASTER, organizationId: 'own' })).rejects.toThrow(NotFoundException);
    expect(mockPrisma.contract.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'foreign', organizationId: 'own' } }));
  });

  it('combines search with tenant filters', async () => {
    mockPrisma.contract.findMany.mockResolvedValue([]);
    await service.findAll({ id: 'u1', role: Role.CLIENT_MASTER, organizationId: 'own' }, ' suporte ');
    expect(mockPrisma.contract.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ organizationId: 'own', OR: expect.any(Array) }) }));
  });

  it.each([{ name: '  ' }, { includedMinutes: -1 }, { includedMinutes: 1.5 }, { excessHourlyRateCents: -1 }, { excessHourlyRateCents: 1.5 }, { monthlyValue: -1 }, { hoursLimit: 1.5 }, { startsAt: 'bad' }, { startsAt: '2026-12-01', endsAt: '2026-01-01' }])('rejects invalid contract domain values %j', async (data) => {
    await expect(service.create({ organizationId: 'org-1', ...data } as any, { id: 'u1', role: Role.ADMIN })).rejects.toThrow(BadRequestException);
    expect(mockPrisma.contract.create).not.toHaveBeenCalled();
  });

  it('validates partial dates against persisted dates', async () => {
    mockPrisma.contract.findUnique.mockResolvedValue({ id: 'c1', startsAt: new Date('2026-10-01') });
    await expect(service.update('c1', { endsAt: '2026-09-01' } as any, { id: 'u1', role: Role.ADMIN })).rejects.toThrow(BadRequestException);
  });

  it('prevents moving contracts with historical worklogs', async () => {
    mockPrisma.worklog.count.mockResolvedValue(1);
    await expect(service.update('c1', { organizationId: 'org-2' }, { id: 'u1', role: Role.ADMIN })).rejects.toThrow(ConflictException);
    expect(mockPrisma.contract.update).not.toHaveBeenCalled();
    expect(mockPrisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockPrisma.contract.findUnique.mock.invocationCallOrder[0]);
    expect(mockPrisma.$queryRaw.mock.invocationCallOrder[0]).toBeLessThan(mockPrisma.worklog.count.mock.invocationCallOrder[0]);
  });

  it('explains linked-worklog deletion failures', async () => {
    mockPrisma.contract.delete.mockRejectedValue({ code: 'P2003' });
    await expect(service.remove('c1', { id: 'u1', role: Role.ADMIN })).rejects.toThrow(ConflictException);
  });

  it('normalizes date-only input and preserves explicit zero without fabricating a rate', async () => {
    const dto = { organizationId: 'org-1', startsAt: '2026-10-01', includedMinutes: 0, monthlyValue: 0 };
    await service.create(dto, { id: 'u1', role: Role.ADMIN });
    expect(mockPrisma.contract.create).toHaveBeenCalledWith({ data: { ...dto, startsAt: new Date('2026-10-01') } });
    expect(mockPrisma.contract.create.mock.calls[0][0].data).not.toHaveProperty('excessHourlyRateCents');
  });

  describe('findAll masking', () => {
    it('should strip financial data for AGENT', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        { id: '1', monthlyValue: 1000, lastAmendmentValue: 500, adjustmentDate: new Date() },
      ]);
      const user = { id: 'agent-1', role: Role.AGENT };
      const res = await service.findAll(user);
      expect(res[0].monthlyValue).toBeNull();
      expect(res[0].lastAmendmentValue).toBeNull();
      expect(res[0].adjustmentDate).toBeNull();
    });

    it('should NOT strip financial data for ADMIN', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        { id: '1', monthlyValue: 1000, lastAmendmentValue: 500, adjustmentDate: new Date() },
      ]);
      const user = { id: 'admin-1', role: Role.ADMIN };
      const res = await service.findAll(user);
      expect(res[0].monthlyValue).toBe(1000);
      expect(res[0].lastAmendmentValue).toBe(500);
    });

    it('should NOT strip financial data for CLIENT_MASTER', async () => {
      mockPrisma.contract.findMany.mockResolvedValue([
        { id: '1', monthlyValue: 1000, lastAmendmentValue: 500, adjustmentDate: new Date() },
      ]);
      const user = { id: 'cm-1', role: Role.CLIENT_MASTER, organizationId: 'org-1' };
      const res = await service.findAll(user);
      expect(res[0].monthlyValue).toBe(1000);
    });

    it('fails closed (ForbiddenException) for a plain CLIENT', async () => {
      const user = { id: 'client-1', role: Role.CLIENT };
      await expect(service.findAll(user)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.contract.findMany).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('throws ForbiddenException for non-ADMIN roles', async () => {
      const user = { id: 'agent-1', role: Role.AGENT };
      await expect(service.create({} as any, user)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.contract.create).not.toHaveBeenCalled();
    });

    it('creates the contract for ADMIN', async () => {
      const dto = { organizationId: 'org-1', monthlyValue: 100 } as any;
      mockPrisma.contract.create.mockResolvedValue({ id: 'c1', ...dto });
      const user = { id: 'admin-1', role: Role.ADMIN };

      const result = await service.create(dto, user);

      expect(mockPrisma.contract.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'c1', ...dto });
    });
  });

  describe('update', () => {
    it('throws ForbiddenException for non-ADMIN roles', async () => {
      const user = { id: 'agent-1', role: Role.AGENT };
      await expect(service.update('c1', {} as any, user)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.contract.update).not.toHaveBeenCalled();
    });

    it('updates the contract for ADMIN', async () => {
      const dto = { monthlyValue: 200 } as any;
      mockPrisma.contract.update.mockResolvedValue({ id: 'c1', ...dto });
      const user = { id: 'admin-1', role: Role.ADMIN };

      const result = await service.update('c1', dto, user);

      expect(mockPrisma.contract.update).toHaveBeenCalledWith({ where: { id: 'c1' }, data: dto });
      expect(mockPrisma.$transaction).toHaveBeenCalled();
      expect(mockPrisma.$queryRaw).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'c1', ...dto });
    });
  });

  describe('remove', () => {
    it('throws ForbiddenException for non-ADMIN roles', async () => {
      const user = { id: 'agent-1', role: Role.AGENT };
      await expect(service.remove('c1', user)).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.contract.delete).not.toHaveBeenCalled();
    });

    it('deletes the contract for ADMIN', async () => {
      mockPrisma.contract.delete.mockResolvedValue({ id: 'c1' });
      const user = { id: 'admin-1', role: Role.ADMIN };

      const result = await service.remove('c1', user);

      expect(mockPrisma.contract.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
      expect(result).toEqual({ id: 'c1' });
    });
  });
});
