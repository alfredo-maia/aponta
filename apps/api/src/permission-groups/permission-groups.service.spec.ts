import { NotFoundException } from '@nestjs/common';
import { PermissionGroupsService } from './permission-groups.service';

describe('PermissionGroupsService', () => {
  let service: PermissionGroupsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      permissionGroup: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      permissionGroupUser: {
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      permissionGroupTechnicalGroup: {
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new PermissionGroupsService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('lists groups ordered by name, including user and technical-group members', async () => {
      await service.findAll();

      expect(mockPrisma.permissionGroup.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        include: {
          userMembers: { include: { user: true } },
          technicalGroupLinks: { include: { technicalGroup: true } },
        },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when the group does not exist', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });

    it('returns the group with its members when found', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });

      const result = await service.findOne('g-1');

      expect(result).toEqual({ id: 'g-1' });
    });
  });

  describe('create', () => {
    it('creates a group with an empty permission list by default', async () => {
      mockPrisma.permissionGroup.create.mockResolvedValue({ id: 'g-1' });

      await service.create({ name: 'Consultor' });

      expect(mockPrisma.permissionGroup.create).toHaveBeenCalledWith({
        data: { name: 'Consultor', description: undefined, permissions: [] },
      });
    });

    it('creates a group with the given permissions', async () => {
      mockPrisma.permissionGroup.create.mockResolvedValue({ id: 'g-1' });

      await service.create({
        name: 'Consultor',
        permissions: ['VIEW_AND_OPEN_TICKETS'],
      });

      expect(mockPrisma.permissionGroup.create).toHaveBeenCalledWith({
        data: {
          name: 'Consultor',
          description: undefined,
          permissions: ['VIEW_AND_OPEN_TICKETS'],
        },
      });
    });
  });

  describe('update', () => {
    it('throws NotFoundException if the group does not exist', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { name: 'Novo nome' })).rejects.toThrow(
        NotFoundException,
      );
    });

    it('updates name/description', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });
      mockPrisma.permissionGroup.update.mockResolvedValue({ id: 'g-1', name: 'Novo nome' });

      await service.update('g-1', { name: 'Novo nome' });

      expect(mockPrisma.permissionGroup.update).toHaveBeenCalledWith({
        where: { id: 'g-1' },
        data: { name: 'Novo nome' },
      });
    });
  });

  describe('updatePermissions', () => {
    it('replaces the whole permission list', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });
      mockPrisma.permissionGroup.update.mockResolvedValue({ id: 'g-1' });

      await service.updatePermissions('g-1', {
        permissions: ['MANAGE_USERS', 'MANAGE_PERMISSION_GROUPS'],
      });

      expect(mockPrisma.permissionGroup.update).toHaveBeenCalledWith({
        where: { id: 'g-1' },
        data: { permissions: ['MANAGE_USERS', 'MANAGE_PERMISSION_GROUPS'] },
      });
    });

    it('throws NotFoundException if the group does not exist', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue(null);

      await expect(
        service.updatePermissions('missing', { permissions: [] }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('throws NotFoundException if the group does not exist', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes the group', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });
      mockPrisma.permissionGroup.delete.mockResolvedValue({ id: 'g-1' });

      await service.remove('g-1');

      expect(mockPrisma.permissionGroup.delete).toHaveBeenCalledWith({ where: { id: 'g-1' } });
    });
  });

  describe('addUser / removeUser', () => {
    it('upserts the membership row (idempotent add)', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });

      await service.addUser('g-1', 'u-1');

      expect(mockPrisma.permissionGroupUser.upsert).toHaveBeenCalledWith({
        where: { permissionGroupId_userId: { permissionGroupId: 'g-1', userId: 'u-1' } },
        update: {},
        create: { permissionGroupId: 'g-1', userId: 'u-1' },
      });
    });

    it('removes the membership row', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });

      await service.removeUser('g-1', 'u-1');

      expect(mockPrisma.permissionGroupUser.delete).toHaveBeenCalledWith({
        where: { permissionGroupId_userId: { permissionGroupId: 'g-1', userId: 'u-1' } },
      });
    });
  });

  describe('addTechnicalGroup / removeTechnicalGroup', () => {
    it('upserts the link row (idempotent add)', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });

      await service.addTechnicalGroup('g-1', 't-1');

      expect(mockPrisma.permissionGroupTechnicalGroup.upsert).toHaveBeenCalledWith({
        where: {
          permissionGroupId_technicalGroupId: { permissionGroupId: 'g-1', technicalGroupId: 't-1' },
        },
        update: {},
        create: { permissionGroupId: 'g-1', technicalGroupId: 't-1' },
      });
    });

    it('removes the link row', async () => {
      mockPrisma.permissionGroup.findUnique.mockResolvedValue({ id: 'g-1' });

      await service.removeTechnicalGroup('g-1', 't-1');

      expect(mockPrisma.permissionGroupTechnicalGroup.delete).toHaveBeenCalledWith({
        where: {
          permissionGroupId_technicalGroupId: { permissionGroupId: 'g-1', technicalGroupId: 't-1' },
        },
      });
    });
  });
});
