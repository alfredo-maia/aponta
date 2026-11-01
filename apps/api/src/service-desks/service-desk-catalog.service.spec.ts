import { Test, TestingModule } from '@nestjs/testing';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { ServiceDeskCatalogService } from './service-desk-catalog.service';
import { PrismaService } from '../prisma/prisma.service';

function uniqueViolation() {
  return new Prisma.PrismaClientKnownRequestError('mocked prisma error', {
    code: 'P2002',
    clientVersion: '7.10.0',
    meta: {},
  });
}

const mockPrisma = {
  serviceDesk: { findUnique: jest.fn() },
  serviceDeskCategory: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  serviceDeskServiceType: {
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  ticket: { count: jest.fn() },
};

describe('ServiceDeskCatalogService', () => {
  let service: ServiceDeskCatalogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ServiceDeskCatalogService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();
    service = module.get(ServiceDeskCatalogService);
    jest.clearAllMocks();
    mockPrisma.serviceDesk.findUnique.mockResolvedValue({ id: 'desk-1' });
    mockPrisma.ticket.count.mockResolvedValue(0);
  });

  describe('list (AC-01/AC-02)', () => {
    it('lists items of the desk ordered by sortOrder then name', async () => {
      mockPrisma.serviceDeskCategory.findMany.mockResolvedValue([
        { id: 'c1', name: 'Hardware', active: true, sortOrder: 0 },
      ]);

      const result = await service.list('category', 'desk-1', false);

      expect(mockPrisma.serviceDeskCategory.findMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1' },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
      expect(result).toEqual([
        { id: 'c1', name: 'Hardware', active: true, sortOrder: 0 },
      ]);
    });

    it('filters to active=true items only when activeOnly is requested', async () => {
      mockPrisma.serviceDeskServiceType.findMany.mockResolvedValue([]);

      await service.list('serviceType', 'desk-1', true);

      expect(mockPrisma.serviceDeskServiceType.findMany).toHaveBeenCalledWith({
        where: { serviceDeskId: 'desk-1', active: true },
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      });
    });

    it('throws NotFoundException when the desk does not exist', async () => {
      mockPrisma.serviceDesk.findUnique.mockResolvedValue(null);

      await expect(service.list('category', 'missing', false)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create (AC-01/AC-02)', () => {
    it('creates a category with the trimmed name', async () => {
      mockPrisma.serviceDeskCategory.findMany.mockResolvedValue([]);
      mockPrisma.serviceDeskCategory.create.mockResolvedValue({
        id: 'c1',
        name: 'Hardware',
        active: true,
        sortOrder: 0,
      });

      const result = await service.create('category', 'desk-1', '  Hardware  ');

      expect(mockPrisma.serviceDeskCategory.create).toHaveBeenCalledWith({
        data: { serviceDeskId: 'desk-1', name: 'Hardware' },
      });
      expect(result).toEqual({
        id: 'c1',
        name: 'Hardware',
        active: true,
        sortOrder: 0,
      });
    });

    it('rejects an empty name with 400', async () => {
      await expect(service.create('category', 'desk-1', '   ')).rejects.toThrow(
        BadRequestException,
      );
      expect(mockPrisma.serviceDeskCategory.create).not.toHaveBeenCalled();
    });

    it('rejects a duplicate name in the same desk (case-insensitive) with 409', async () => {
      mockPrisma.serviceDeskCategory.findMany.mockResolvedValue([
        { id: 'c1', name: 'hardware', active: true, sortOrder: 0 },
      ]);

      await expect(
        service.create('category', 'desk-1', 'Hardware'),
      ).rejects.toThrow(ConflictException);
      expect(mockPrisma.serviceDeskCategory.create).not.toHaveBeenCalled();
    });

    it('translates a racing unique-constraint violation from the DB into 409', async () => {
      mockPrisma.serviceDeskCategory.findMany.mockResolvedValue([]);
      mockPrisma.serviceDeskCategory.create.mockRejectedValue(uniqueViolation());

      await expect(
        service.create('category', 'desk-1', 'Hardware'),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException when the desk does not exist', async () => {
      mockPrisma.serviceDesk.findUnique.mockResolvedValue(null);

      await expect(
        service.create('serviceType', 'missing', 'Remoto'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update (AC-01/AC-02)', () => {
    const existingItem = {
      id: 'c1',
      serviceDeskId: 'desk-1',
      name: 'Hardware',
      active: true,
      sortOrder: 0,
    };

    it('renames, (in)activates and reorders an item', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(existingItem);
      mockPrisma.serviceDeskCategory.findMany.mockResolvedValue([]);
      mockPrisma.serviceDeskCategory.update.mockResolvedValue({
        ...existingItem,
        name: 'Hardware e Rede',
        active: false,
        sortOrder: 2,
      });

      await service.update('category', 'desk-1', 'c1', {
        name: 'Hardware e Rede',
        active: false,
        sortOrder: 2,
      });

      expect(mockPrisma.serviceDeskCategory.update).toHaveBeenCalledWith({
        where: { id: 'c1' },
        data: { name: 'Hardware e Rede', active: false, sortOrder: 2 },
      });
    });

    it('rejects clearing the name to empty with 400', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(existingItem);

      await expect(
        service.update('category', 'desk-1', 'c1', { name: '   ' }),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.serviceDeskCategory.update).not.toHaveBeenCalled();
    });

    it('rejects renaming to a name already used by another item in the desk with 409', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(existingItem);
      mockPrisma.serviceDeskCategory.findMany.mockResolvedValue([
        { id: 'c2', name: 'Software', active: true, sortOrder: 1 },
      ]);

      await expect(
        service.update('category', 'desk-1', 'c1', { name: 'Software' }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws NotFoundException for an item belonging to another desk', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.update('category', 'desk-1', 'other-desk-item', { active: false }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove (AC-01/AC-02)', () => {
    const existingItem = {
      id: 'c1',
      serviceDeskId: 'desk-1',
      name: 'Hardware',
      active: true,
      sortOrder: 0,
    };

    it('deletes an item that is not referenced by any ticket', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(existingItem);
      mockPrisma.ticket.count.mockResolvedValue(0);

      const result = await service.remove('category', 'desk-1', 'c1');

      expect(mockPrisma.serviceDeskCategory.delete).toHaveBeenCalledWith({
        where: { id: 'c1' },
      });
      expect(result).toEqual({ id: 'c1' });
    });

    it('rejects deleting an item still referenced by tickets with 409', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(existingItem);
      mockPrisma.ticket.count.mockResolvedValue(3);

      await expect(service.remove('category', 'desk-1', 'c1')).rejects.toThrow(
        ConflictException,
      );
      expect(mockPrisma.serviceDeskCategory.delete).not.toHaveBeenCalled();
    });

    it('checks ticket references by the categoryId field for kind=category', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(existingItem);
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.remove('category', 'desk-1', 'c1');

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: { categoryId: 'c1' },
      });
    });

    it('checks ticket references by the serviceTypeId field for kind=serviceType', async () => {
      mockPrisma.serviceDeskServiceType.findFirst.mockResolvedValue({
        ...existingItem,
        id: 't1',
      });
      mockPrisma.ticket.count.mockResolvedValue(0);

      await service.remove('serviceType', 'desk-1', 't1');

      expect(mockPrisma.ticket.count).toHaveBeenCalledWith({
        where: { serviceTypeId: 't1' },
      });
    });

    it('throws NotFoundException for an item belonging to another desk', async () => {
      mockPrisma.serviceDeskCategory.findFirst.mockResolvedValue(null);

      await expect(
        service.remove('category', 'desk-1', 'other-desk-item'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
