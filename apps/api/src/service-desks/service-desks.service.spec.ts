import { Test, TestingModule } from '@nestjs/testing';
import { ServiceDesksService } from './service-desks.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrismaService = {
  serviceDesk: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
};

describe('ServiceDesksService', () => {
  let service: ServiceDesksService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceDesksService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ServiceDesksService>(ServiceDesksService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should create a service desk', async () => {
    const createDto = { name: 'IT Support' };
    const expecteddesk = { id: 'uuid-123', name: 'IT Support' };
    
    mockPrismaService.serviceDesk.create.mockResolvedValue(expecteddesk);

    const result = await service.create(createDto);
    expect(result).toEqual(expecteddesk);
    expect(prisma.serviceDesk.create).toHaveBeenCalledWith({ data: createDto });
  });

  it('should find all service desks', async () => {
    const expected = [{ id: '1', name: 'Desk 1' }, { id: '2', name: 'Desk 2' }];
    mockPrismaService.serviceDesk.findMany.mockResolvedValue(expected);

    const result = await service.findAll();
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.findMany).toHaveBeenCalled();
  });

  it('should find one service desk by id', async () => {
    const expected = { id: '1', name: 'Desk 1' };
    mockPrismaService.serviceDesk.findUnique.mockResolvedValue(expected);

    const result = await service.findOne('1');
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.findUnique).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  it('should update a service desk', async () => {
    const updateDto = { name: 'New Name' };
    const expected = { id: '1', name: 'New Name' };
    mockPrismaService.serviceDesk.update.mockResolvedValue(expected);

    const result = await service.update('1', updateDto);
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.update).toHaveBeenCalledWith({
      where: { id: '1' },
      data: updateDto,
    });
  });

  it('should delete a service desk', async () => {
    const expected = { id: '1', name: 'Desk 1' };
    mockPrismaService.serviceDesk.delete.mockResolvedValue(expected);

    const result = await service.remove('1');
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });
});
