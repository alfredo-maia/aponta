import { Test, TestingModule } from '@nestjs/testing';
import { ServiceDesksService } from './service-desks.service';
import { PrismaService } from '../prisma/prisma.service';
import { HolidaysImportService } from './holidays-import.service';

const mockPrismaService = {
  serviceDesk: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  businessHour: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  holiday: {
    findMany: jest.fn(),
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
  $transaction: jest.fn(),
};

const mockHolidaysImportService = {
  fetchNationalHolidays: jest.fn(),
};

describe('ServiceDesksService', () => {
  let service: ServiceDesksService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceDesksService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: HolidaysImportService, useValue: mockHolidaysImportService },
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
    expect(prisma.serviceDesk.create).toHaveBeenCalledWith({
      data: createDto,
      include: { agents: { select: { id: true, name: true, email: true } } }
    });
  });

  it('should find all service desks', async () => {
    const expected = [{ id: '1', name: 'Desk 1' }, { id: '2', name: 'Desk 2' }];
    mockPrismaService.serviceDesk.findMany.mockResolvedValue(expected);

    const result = await service.findAll();
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.findMany).toHaveBeenCalledWith({
      include: { agents: { select: { id: true, name: true, email: true } } }
    });
  });

  it('should find one service desk by id', async () => {
    const expected = { id: '1', name: 'Desk 1' };
    mockPrismaService.serviceDesk.findUnique.mockResolvedValue(expected);

    const result = await service.findOne('1');
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.findUnique).toHaveBeenCalledWith({
      where: { id: '1' },
      include: { agents: { select: { id: true, name: true, email: true } } }
    });
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
      include: { agents: { select: { id: true, name: true, email: true } } }
    });
  });

  it('should delete a service desk', async () => {
    const expected = { id: '1', name: 'Desk 1' };
    mockPrismaService.serviceDesk.delete.mockResolvedValue(expected);

    const result = await service.remove('1');
    expect(result).toEqual(expected);
    expect(prisma.serviceDesk.delete).toHaveBeenCalledWith({ where: { id: '1' } });
  });

  describe('getBusinessHours', () => {
    it('returns the business hours and holidays for a service desk', async () => {
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({ id: 'desk-1' });
      const businessHours = [
        { id: 'bh-1', weekday: 1, startTime: '08:00', endTime: '18:00', serviceDeskId: 'desk-1' },
      ];
      const holidays = [
        { id: 'hol-1', date: new Date('2026-12-25'), name: 'Natal', serviceDeskId: 'desk-1' },
      ];
      mockPrismaService.businessHour.findMany.mockResolvedValue(businessHours);
      mockPrismaService.holiday.findMany.mockResolvedValue(holidays);

      const result = await service.getBusinessHours('desk-1');

      expect(result).toEqual({ businessHours, holidays });
      expect(prisma.businessHour.findMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1' },
      });
      expect(prisma.holiday.findMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1' },
      });
    });

    it('throws NotFoundException when the service desk does not exist', async () => {
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue(null);
      await expect(service.getBusinessHours('missing')).rejects.toThrow(
        'ServiceDesk with ID missing not found',
      );
    });
  });

  describe('updateBusinessHours', () => {
    it('replaces all business hour windows and holidays inside a transaction', async () => {
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue({ id: 'desk-1' });
      const dto = {
        businessHours: [{ weekday: 1, startTime: '08:00', endTime: '18:00' }],
        holidays: [{ date: '2026-12-25', name: 'Natal' }],
      };
      mockPrismaService.$transaction.mockImplementation(
        async (fns: unknown[]) => Promise.all((fns as Promise<unknown>[]).map((f) => f)),
      );

      await service.updateBusinessHours('desk-1', dto);

      expect(prisma.$transaction).toHaveBeenCalled();
      expect(prisma.businessHour.deleteMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1' },
      });
      expect(prisma.holiday.deleteMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1' },
      });
      expect(prisma.businessHour.createMany).toHaveBeenCalledWith({
        data: [{ weekday: 1, startTime: '08:00', endTime: '18:00', serviceDeskId: 'desk-1' }],
      });
      expect(prisma.holiday.createMany).toHaveBeenCalledWith({
        data: [{ date: new Date('2026-12-25'), name: 'Natal', serviceDeskId: 'desk-1' }],
      });
    });

    it('throws NotFoundException when the service desk does not exist', async () => {
      mockPrismaService.serviceDesk.findUnique.mockResolvedValue(null);
      await expect(
        service.updateBusinessHours('missing', { businessHours: [], holidays: [] }),
      ).rejects.toThrow('ServiceDesk with ID missing not found');
    });
  });

  describe('importNationalHolidays', () => {
    it('delegates to HolidaysImportService with the given year', async () => {
      const expected = [{ date: '2026-01-01', name: 'Confraternização mundial' }];
      mockHolidaysImportService.fetchNationalHolidays.mockResolvedValue(
        expected,
      );

      const result = await service.importNationalHolidays(2026);

      expect(
        mockHolidaysImportService.fetchNationalHolidays,
      ).toHaveBeenCalledWith(2026);
      expect(result).toEqual(expected);
    });
  });
});
