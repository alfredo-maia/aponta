
import { ContractsService } from './contracts.service';
import { Role } from '@prisma/client';

describe('ContractsService', () => {
  let service: ContractsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      contract: {
        findMany: jest.fn(),
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
  });
});
