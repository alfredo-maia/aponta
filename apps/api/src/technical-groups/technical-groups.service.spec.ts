import { BadRequestException, NotFoundException } from '@nestjs/common';
import { TechnicalGroupsService } from './technical-groups.service';

describe('TechnicalGroupsService', () => {
  let service: TechnicalGroupsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      technicalGroup: {
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      technicalGroupOrganization: {
        upsert: jest.fn(),
        delete: jest.fn(),
      },
      technicalGroupServiceDesk: {
        upsert: jest.fn(),
        delete: jest.fn(),
      },
    };
    service = new TechnicalGroupsService(mockPrisma as any);
  });

  describe('findAll', () => {
    it('lists groups ordered by name', async () => {
      await service.findAll();
      expect(mockPrisma.technicalGroup.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findOne', () => {
    it('throws NotFoundException when missing', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue(null);
      await expect(service.findOne('missing')).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    it('defaults dailyWorklogEmailEnabled=false and scheduleEnabled=true', async () => {
      mockPrisma.technicalGroup.create.mockResolvedValue({ id: 't-1' });

      await service.create({ name: 'Consultor' });

      expect(mockPrisma.technicalGroup.create).toHaveBeenCalledWith({
        data: {
          name: 'Consultor',
          description: undefined,
          dailyWorklogEmailEnabled: false,
          scheduleEnabled: true,
        },
      });
    });

    it('honors explicit flags', async () => {
      mockPrisma.technicalGroup.create.mockResolvedValue({ id: 't-1' });

      await service.create({
        name: 'Consultor',
        dailyWorklogEmailEnabled: true,
        scheduleEnabled: false,
      });

      expect(mockPrisma.technicalGroup.create).toHaveBeenCalledWith({
        data: {
          name: 'Consultor',
          description: undefined,
          dailyWorklogEmailEnabled: true,
          scheduleEnabled: false,
        },
      });
    });
  });

  describe('addMember / removeMember', () => {
    it('sets the user technicalGroupId on addMember', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });

      await service.addMember('t-1', 'u-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { technicalGroupId: 't-1' },
      });
    });

    it('rejects removeMember if the user does not belong to this group', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', technicalGroupId: 'other' });

      await expect(service.removeMember('t-1', 'u-1')).rejects.toThrow(BadRequestException);
      expect(mockPrisma.user.update).not.toHaveBeenCalled();
    });

    it('clears technicalGroupId on removeMember when the user does belong to the group', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'u-1', technicalGroupId: 't-1' });

      await service.removeMember('t-1', 'u-1');

      expect(mockPrisma.user.update).toHaveBeenCalledWith({
        where: { id: 'u-1' },
        data: { technicalGroupId: null },
      });
    });
  });

  describe('organization access (Acessos > Clientes)', () => {
    it('adds a client link', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });

      await service.addOrganization('t-1', 'o-1');

      expect(mockPrisma.technicalGroupOrganization.upsert).toHaveBeenCalledWith({
        where: { technicalGroupId_organizationId: { technicalGroupId: 't-1', organizationId: 'o-1' } },
        update: {},
        create: { technicalGroupId: 't-1', organizationId: 'o-1' },
      });
    });

    it('removes a client link', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });

      await service.removeOrganization('t-1', 'o-1');

      expect(mockPrisma.technicalGroupOrganization.delete).toHaveBeenCalledWith({
        where: { technicalGroupId_organizationId: { technicalGroupId: 't-1', organizationId: 'o-1' } },
      });
    });
  });

  describe('service desk access (Acessos > Mesas de serviço)', () => {
    it('adds a service desk link', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });

      await service.addServiceDesk('t-1', 'sd-1');

      expect(mockPrisma.technicalGroupServiceDesk.upsert).toHaveBeenCalledWith({
        where: { technicalGroupId_serviceDeskId: { technicalGroupId: 't-1', serviceDeskId: 'sd-1' } },
        update: {},
        create: { technicalGroupId: 't-1', serviceDeskId: 'sd-1' },
      });
    });

    it('removes a service desk link', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });

      await service.removeServiceDesk('t-1', 'sd-1');

      expect(mockPrisma.technicalGroupServiceDesk.delete).toHaveBeenCalledWith({
        where: { technicalGroupId_serviceDeskId: { technicalGroupId: 't-1', serviceDeskId: 'sd-1' } },
      });
    });
  });

  describe('remove', () => {
    it('throws NotFoundException if the group does not exist', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue(null);
      await expect(service.remove('missing')).rejects.toThrow(NotFoundException);
    });

    it('deletes the group', async () => {
      mockPrisma.technicalGroup.findUnique.mockResolvedValue({ id: 't-1' });
      mockPrisma.technicalGroup.delete.mockResolvedValue({ id: 't-1' });

      await service.remove('t-1');

      expect(mockPrisma.technicalGroup.delete).toHaveBeenCalledWith({ where: { id: 't-1' } });
    });
  });
});
