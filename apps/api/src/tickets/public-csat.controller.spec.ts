import { Test, TestingModule } from '@nestjs/testing';
import { PublicCsatController } from './public-csat.controller';
import { PublicCsatService } from './public-csat.service';

const mockPublicCsatService = {
  getSummary: jest.fn(),
  rate: jest.fn(),
};

describe('PublicCsatController', () => {
  let controller: PublicCsatController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PublicCsatController],
      providers: [
        { provide: PublicCsatService, useValue: mockPublicCsatService },
      ],
    }).compile();

    controller = module.get<PublicCsatController>(PublicCsatController);
    jest.clearAllMocks();
  });

  it('GET /public/csat/:token delegates to service.getSummary', async () => {
    mockPublicCsatService.getSummary.mockResolvedValue({ protocol: '2026-0001' });

    const result = await controller.getSummary('tok-1');

    expect(mockPublicCsatService.getSummary).toHaveBeenCalledWith('tok-1');
    expect(result).toEqual({ protocol: '2026-0001' });
  });

  it('PATCH /public/csat/:token delegates to service.rate', async () => {
    mockPublicCsatService.rate.mockResolvedValue({ id: 'ticket-1' });

    const result = await controller.rate('tok-1', { score: 5 });

    expect(mockPublicCsatService.rate).toHaveBeenCalledWith('tok-1', {
      score: 5,
    });
    expect(result).toEqual({ id: 'ticket-1' });
  });
});
