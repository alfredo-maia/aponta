import { Test, TestingModule } from '@nestjs/testing';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  ticket: {
    findMany: jest.fn(),
  },
};

describe('ReportsService', () => {
  let service: ReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('calculates average CSAT and distribution correctly', async () => {
    mockPrismaService.ticket.findMany.mockResolvedValue([
      { status: 'RESOLVED', csatScore: 5, createdAt: new Date(), updatedAt: new Date() },
      { status: 'CLOSED', csatScore: 5, createdAt: new Date(), updatedAt: new Date() },
      { status: 'RESOLVED', csatScore: 4, createdAt: new Date(), updatedAt: new Date() },
      { status: 'RESOLVED', csatScore: 1, createdAt: new Date(), updatedAt: new Date() },
      // ticket with no score:
      { status: 'RESOLVED', csatScore: null, createdAt: new Date(), updatedAt: new Date() },
      // open ticket:
      { status: 'OPEN', csatScore: null, createdAt: new Date(), updatedAt: new Date() }
    ]);

    const result = await service.getDashboardMetrics();

    expect(result.csat).toBeDefined();
    expect(result.csat.average).toBe(3.75); // (5+5+4+1) = 15 / 4 = 3.75
    expect(result.csat.distribution).toEqual({
      '1': 1,
      '2': 0,
      '3': 0,
      '4': 1,
      '5': 2,
    });
    expect(result.csat.totalRated).toBe(4);
  });
});
