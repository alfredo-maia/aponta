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
      organizationAddress: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      organizationContact: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
      serviceDesk: {
        findUnique: jest.fn(),
      },
      agentGroup: {
        create: jest.fn(),
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

    it('creates organization with quarterly billing and billing preferences', async () => {
      const dto = {
        name: 'Financeira XYZ',
        quarterlyBilling: true,
        billingEmails: 'financeiro@xyz.com,contato@xyz.com',
        billingDueDay: 15,
        billingMethod: 'BOLETO',
        billingNotes: 'Enviar nota fiscal com 5 dias de antecedência',
      };
      mockPrisma.organization.create.mockResolvedValue({ id: 'org-1', ...dto });

      const result = await service.create(dto);
      expect(mockPrisma.organization.create).toHaveBeenCalledWith({ data: dto });
      expect(result.quarterlyBilling).toBe(true);
      expect(result.billingDueDay).toBe(15);
    });
  });

  describe('findAll', () => {
    it('returns all organizations with a user count when no filter is given', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-1', _count: { users: 3 } }]);

      const result = await service.findAll();

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { _count: { select: { users: true } } },
      });
      expect(result).toEqual([{ id: 'org-1', _count: { users: 3 } }]);
    });

    it('filters by active=true when requested (Tiflux-parity, issue #56)', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-1', active: true }]);

      const result = await service.findAll(true);

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: { active: true },
        include: { _count: { select: { users: true } } },
      });
      expect(result).toEqual([{ id: 'org-1', active: true }]);
    });

    it('filters by active=false when requested', async () => {
      mockPrisma.organization.findMany.mockResolvedValue([{ id: 'org-2', active: false }]);

      const result = await service.findAll(false);

      expect(mockPrisma.organization.findMany).toHaveBeenCalledWith({
        where: { active: false },
        include: { _count: { select: { users: true } } },
      });
      expect(result).toEqual([{ id: 'org-2', active: false }]);
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
          addresses: true,
          contacts: true,
          serviceDesks: { select: { id: true, name: true } },
          agentGroups: {
            include: { members: { select: { id: true, name: true, email: true } } },
          },
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

    it('updates quarterly billing and billing preferences', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      const billingUpdate = {
        quarterlyBilling: true,
        billingEmails: 'faturamento@empresa.com',
        billingDueDay: 10,
        billingMethod: 'PIX',
      };
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1', ...billingUpdate });

      const result = await service.update('org-1', billingUpdate as any);
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: billingUpdate,
      });
      expect(result.quarterlyBilling).toBe(true);
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

  describe('addAddress', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.addAddress('missing-id', { city: 'SP' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.organizationAddress.create).not.toHaveBeenCalled();
    });

    it('creates the address linked to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      const dto = { city: 'Sao Paulo' } as any;
      mockPrisma.organizationAddress.create.mockResolvedValue({ id: 'addr-1', organizationId: 'org-1', ...dto });

      const result = await service.addAddress('org-1', dto);

      expect(mockPrisma.organizationAddress.create).toHaveBeenCalledWith({
        data: { ...dto, organizationId: 'org-1' },
      });
      expect(result).toEqual({ id: 'addr-1', organizationId: 'org-1', ...dto });
    });
  });

  describe('removeAddress', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.removeAddress('missing-org', 'addr-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organizationAddress.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the address does not belong to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.organizationAddress.findUnique.mockResolvedValue({ id: 'addr-1', organizationId: 'org-2' });

      await expect(service.removeAddress('org-1', 'addr-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organizationAddress.delete).not.toHaveBeenCalled();
    });

    it('deletes the address when it belongs to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.organizationAddress.findUnique.mockResolvedValue({ id: 'addr-1', organizationId: 'org-1' });
      mockPrisma.organizationAddress.delete.mockResolvedValue({ id: 'addr-1' });

      const result = await service.removeAddress('org-1', 'addr-1');

      expect(mockPrisma.organizationAddress.delete).toHaveBeenCalledWith({ where: { id: 'addr-1' } });
      expect(result).toEqual({ id: 'addr-1' });
    });
  });

  describe('addContact', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.addContact('missing-id', { name: 'Jane' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.organizationContact.create).not.toHaveBeenCalled();
    });

    it('creates the contact linked to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      const dto = { name: 'Jane' } as any;
      mockPrisma.organizationContact.create.mockResolvedValue({ id: 'contact-1', organizationId: 'org-1', ...dto });

      const result = await service.addContact('org-1', dto);

      expect(mockPrisma.organizationContact.create).toHaveBeenCalledWith({
        data: { ...dto, organizationId: 'org-1' },
      });
      expect(result).toEqual({ id: 'contact-1', organizationId: 'org-1', ...dto });
    });
  });

  describe('removeContact', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.removeContact('missing-org', 'contact-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organizationContact.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the contact does not belong to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.organizationContact.findUnique.mockResolvedValue({ id: 'contact-1', organizationId: 'org-2' });

      await expect(service.removeContact('org-1', 'contact-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organizationContact.delete).not.toHaveBeenCalled();
    });

    it('deletes the contact when it belongs to the organization', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.organizationContact.findUnique.mockResolvedValue({ id: 'contact-1', organizationId: 'org-1' });
      mockPrisma.organizationContact.delete.mockResolvedValue({ id: 'contact-1' });

      const result = await service.removeContact('org-1', 'contact-1');

      expect(mockPrisma.organizationContact.delete).toHaveBeenCalledWith({ where: { id: 'contact-1' } });
      expect(result).toEqual({ id: 'contact-1' });
    });
  });

  describe('linkServiceDesk', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.linkServiceDesk('missing-org', 'desk-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the service desk does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      mockPrisma.serviceDesk.findUnique.mockResolvedValue(null);

      await expect(service.linkServiceDesk('org-1', 'missing-desk')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it('connects the service desk to the organization (N:N)', async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({ id: 'org-1', users: [] })
        .mockResolvedValueOnce({ id: 'org-1', serviceDesks: [{ id: 'desk-1' }] });
      mockPrisma.serviceDesk.findUnique.mockResolvedValue({ id: 'desk-1' });
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });

      const result = await service.linkServiceDesk('org-1', 'desk-1');

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { serviceDesks: { connect: { id: 'desk-1' } } },
      });
      expect(result).toEqual({ id: 'org-1', serviceDesks: [{ id: 'desk-1' }] });
    });
  });

  describe('unlinkServiceDesk', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.unlinkServiceDesk('missing-org', 'desk-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.organization.update).not.toHaveBeenCalled();
    });

    it('disconnects the service desk from the organization', async () => {
      mockPrisma.organization.findUnique
        .mockResolvedValueOnce({ id: 'org-1', users: [] })
        .mockResolvedValueOnce({ id: 'org-1', serviceDesks: [] });
      mockPrisma.organization.update.mockResolvedValue({ id: 'org-1' });

      const result = await service.unlinkServiceDesk('org-1', 'desk-1');

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-1' },
        data: { serviceDesks: { disconnect: { id: 'desk-1' } } },
      });
      expect(result).toEqual({ id: 'org-1', serviceDesks: [] });
    });
  });

  describe('createAgentGroup', () => {
    it('throws NotFoundException when the organization does not exist', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue(null);

      await expect(service.createAgentGroup('missing-org', { name: 'Consultor' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.agentGroup.create).not.toHaveBeenCalled();
    });

    it('creates the agent group linked to the organization, with members', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({ id: 'org-1', users: [] });
      const expected = { id: 'group-1', name: 'Consultor', organizationId: 'org-1', members: [] };
      mockPrisma.agentGroup.create.mockResolvedValue(expected);

      const result = await service.createAgentGroup('org-1', { name: 'Consultor', memberIds: ['u1', 'u2'] });

      expect(mockPrisma.agentGroup.create).toHaveBeenCalledWith({
        data: {
          name: 'Consultor',
          organizationId: 'org-1',
          members: { connect: [{ id: 'u1' }, { id: 'u2' }] },
        },
        include: { members: { select: { id: true, name: true, email: true } } },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('updateAgentGroup', () => {
    it('throws NotFoundException when the agent group does not exist', async () => {
      mockPrisma.agentGroup.findUnique.mockResolvedValue(null);

      await expect(service.updateAgentGroup('org-1', 'missing-group', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.agentGroup.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the agent group belongs to another organization', async () => {
      mockPrisma.agentGroup.findUnique.mockResolvedValue({ id: 'group-1', organizationId: 'org-2' });

      await expect(service.updateAgentGroup('org-1', 'group-1', { name: 'X' })).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.agentGroup.update).not.toHaveBeenCalled();
    });

    it('updates the agent group name and members', async () => {
      mockPrisma.agentGroup.findUnique.mockResolvedValue({ id: 'group-1', organizationId: 'org-1' });
      const expected = { id: 'group-1', name: 'Novo nome', members: [] };
      mockPrisma.agentGroup.update.mockResolvedValue(expected);

      const result = await service.updateAgentGroup('org-1', 'group-1', { name: 'Novo nome', memberIds: ['u1'] });

      expect(mockPrisma.agentGroup.update).toHaveBeenCalledWith({
        where: { id: 'group-1' },
        data: { name: 'Novo nome', members: { set: [{ id: 'u1' }] } },
        include: { members: { select: { id: true, name: true, email: true } } },
      });
      expect(result).toEqual(expected);
    });
  });

  describe('removeAgentGroup', () => {
    it('throws NotFoundException when the agent group does not exist', async () => {
      mockPrisma.agentGroup.findUnique.mockResolvedValue(null);

      await expect(service.removeAgentGroup('org-1', 'missing-group')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.agentGroup.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the agent group belongs to another organization', async () => {
      mockPrisma.agentGroup.findUnique.mockResolvedValue({ id: 'group-1', organizationId: 'org-2' });

      await expect(service.removeAgentGroup('org-1', 'group-1')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.agentGroup.delete).not.toHaveBeenCalled();
    });

    it('deletes the agent group when it belongs to the organization', async () => {
      mockPrisma.agentGroup.findUnique.mockResolvedValue({ id: 'group-1', organizationId: 'org-1' });
      mockPrisma.agentGroup.delete.mockResolvedValue({ id: 'group-1' });

      const result = await service.removeAgentGroup('org-1', 'group-1');

      expect(mockPrisma.agentGroup.delete).toHaveBeenCalledWith({ where: { id: 'group-1' } });
      expect(result).toEqual({ id: 'group-1' });
    });
  });
});
