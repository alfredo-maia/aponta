import { Test } from '@nestjs/testing';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  it('should be defined', async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const service = module.get<PrismaService>(PrismaService);
    expect(service).toBeDefined();
  });

  it('should connect to database', async () => {
    const module = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    const service = module.get<PrismaService>(PrismaService);
    await service.$connect();
    await service.$disconnect();
  });
});
