import { NotFoundException } from '@nestjs/common';
import { OrganizationsService } from './organizations.service';

describe('OrganizationsService', () => {
  let service: OrganizationsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      organization: {
        create: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new OrganizationsService(mockPrisma as any);
  });

  describe('create', () => {
    it('creates the organization with the given dto', async () => {
      const dto = { name: 'Acme Corp' } as any;
      mockPrisma.organization.create.mockResolvedValue({ id: 'org-1', ...dto });

      const result = await service.create(dto);

      expect(mockPrisma.organization.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'org-1', ...dto });
    });
  });

  describe('findAll', () => {
    it('returns all organizations with a user count', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-1', _count: { users: 3 } }]);

      const result = await service.findAll();

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        include: { _count: { select: { users: true } } },
      });
      expect(result).toEqual([{ id: 'org-1', _count: { users: 3 } }]);
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing-id')).rejects.toThrow(NotFoundException);
    });

    it('returns the organization with its users when it exists', async () => {
      const org = { id: 'org-1', users: [{ id: 'u1', name: 'Jane', email: 'j@x.com', role: 'CLIENT' }] };
      mockPrisma.organization.findUnique.mockResolvedValue(org);

      const result = await service.findOne('org-1');

      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        include: {
          users: { select: { id: true, name: true, email: true, role: true } },
        },
      });
      expect(result).toEqual(org);
    });
  });

  describe('update', () => {
    it('throws NotFoundException without updating when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.update('missing-id', { name: 'X' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it('updates the organization when it exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1', name: 'New Name' });

      const result = await service.update('org-1', { name: 'New Name' } as any);

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { name: 'New Name' },
      });
      expect(result).toEqual({ id: 'org-1', name: 'New Name' });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException without deleting when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organization.delete).not.toHaveBeenCalled();
    });

    it('deletes the organization when it exists', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.organization.delete.mockResolvedValue({ id: 'org-1' });

      const result = await service.remove('org-1');

      expect(mockPrisma.organization.delete).toHaveBeenCalledWith({ where: { id: 'org-1' } });
      expect(result).toEqual({ id: 'org-1' });
    });
  });
});
