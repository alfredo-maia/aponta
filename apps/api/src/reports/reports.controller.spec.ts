import { Test, TestingModule } from '@nestjs/testing';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

const mockReportsService = {
  getWorkload: jest.fn(),
  getBilling: jest.fn(),
};

describe('ReportsController', () => {
  let controller: ReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReportsController],
      providers: [{ provide: ReportsService, useValue: mockReportsService }],
    }).compile();

    controller = module.get<ReportsController>(ReportsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getWorkload', () => {
    it('delegates to the service with user and optional agentId', async () => {
      const user = { id: 'u1' } as any;
      mockReportsService.getWorkload.mockResolvedValue([{ agentId: 'a1' }]);

      const result = await controller.getWorkload(user, 'a1');

      expect(mockReportsService.getWorkload).toHaveBeenCalledWith(user, 'a1');
      expect(result).toEqual([{ agentId: 'a1' }]);
    });

    it('works without an agentId filter', async () => {
      const user = { id: 'u1' } as any;
      mockReportsService.getWorkload.mockResolvedValue([]);

      await controller.getWorkload(user);

      expect(mockReportsService.getWorkload).toHaveBeenCalledWith(user, undefined);
    });
  });

  describe('getBilling', () => {
    it('delegates to the service with the current user', async () => {
      const user = { id: 'u1' } as any;
      mockReportsService.getBilling.mockResolvedValue([{ organizationId: 'org-1' }]);

      const result = await controller.getBilling(user);

      expect(mockReportsService.getBilling).toHaveBeenCalledWith(user);
      expect(result).toEqual([{ organizationId: 'org-1' }]);
    });
  });
});
