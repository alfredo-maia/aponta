import { ContractsService } from './contracts.service';
import { Role } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common';

describe('ContractsService', () => {
  let service: ContractsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      contract: {
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new ContractsService(mockPrisma as any);
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
