import { NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { CatalogService } from './catalog.service';

describe('CatalogService', () => {
  let service: CatalogService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      serviceCatalogCategory: {
        findMany: jest.fn().mockResolvedValue([]),
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      serviceCatalogItem: {
        create: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      serviceDesk: {
        findUnique: jest.fn(),
      },
    };
    service = new CatalogService(mockPrisma as any);
  });

  describe('findAllCategories', () => {
    it('defaults to no filters and no item include (public overview defaults)', async () => {
      await service.findAllCategories();
      expect(mockPrisma.serviceCatalogCategory.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: undefined,
        orderBy: { name: 'asc' },
      });
    });

    it('filters active-only categories and active-only items when both flags are set', async () => {
      await service.findAllCategories(true, true);
      expect(mockPrisma.serviceCatalogCategory.findMany).toHaveBeenCalledWith({
        where: { isActive: true },
        include: { items: { where: { isActive: true }, orderBy: { title: 'asc' } } },
        orderBy: { name: 'asc' },
      });
    });

    it('includes ALL items (no isActive filter) when includeItems=true but onlyActive=false', async () => {
      await service.findAllCategories(true, false);
      expect(mockPrisma.serviceCatalogCategory.findMany).toHaveBeenCalledWith({
        where: undefined,
        include: { items: { orderBy: { title: 'asc' } } },
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('findActiveCatalog (DMTE-485)', () => {
    const desk = (overrides: Record<string, unknown> = {}) => ({
      active: true,
      acceptingNewTickets: true,
      internalUse: false,
      openByAgentsOnly: false,
      listedGroupsOnly: false,
      unlistedCanCreateTicket: true,
      allowCrossDeskInteraction: true,
      agents: [],
      agentGroups: [],
      organizations: [],
      ...overrides,
    });
    const item = (id: string, deskOverrides: Record<string, unknown> = {}) => ({
      id,
      title: id,
      description: null,
      icon: null,
      categoryId: 'cat-1',
      defaultServiceDeskId: `desk-${id}`,
      defaultPriority: 'MEDIUM',
      isActive: true,
      defaultServiceDesk: desk(deskOverrides),
    });
    const category = (id: string, ...items: unknown[]) => ({
      id,
      name: id,
      description: null,
      isActive: true,
      items,
    });
    const returns = (...categories: unknown[]) =>
      mockPrisma.serviceCatalogCategory.findMany.mockResolvedValue(categories);
    const itemIds = (result: { items: { id: string }[] }[]) =>
      result.flatMap((c) => c.items.map((i) => i.id));

    const admin = { id: 'admin-1', role: Role.ADMIN };
    const agent = { id: 'agent-1', role: Role.AGENT };
    const client = { id: 'client-1', role: Role.CLIENT, organizationId: 'org-1' };

    it('AC-01: pede ao banco só categorias e itens ativos, ordenados', async () => {
      returns();
      await service.findActiveCatalog(admin);
      expect(mockPrisma.serviceCatalogCategory.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isActive: true },
          orderBy: { name: 'asc' },
          include: {
            items: expect.objectContaining({
              where: { isActive: true },
              orderBy: { title: 'asc' },
            }),
          },
        }),
      );
    });

    it('AC-01: ADMIN recebe item de mesa aberta e não recebe mesa inativa nem mesa fora de recebimento', async () => {
      returns(
        category(
          'cat-1',
          item('open'),
          item('inactive', { active: false }),
          item('closed', { acceptingNewTickets: false }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(admin))).toEqual(['open']);
    });

    it('AC-01: CLIENT não recebe item de mesa de uso interno nem só de atendentes', async () => {
      returns(
        category(
          'cat-1',
          item('open'),
          item('internal', { internalUse: true }),
          item('agents-only', { openByAgentsOnly: true }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(client))).toEqual(['open']);
    });

    it('AC-01: atendente de mesa listada-apenas só recebe o item onde está listado ou onde não listados podem criar', async () => {
      const listedOnly = { listedGroupsOnly: true, unlistedCanCreateTicket: false };
      returns(
        category(
          'cat-1',
          item('not-listed', listedOnly),
          item('listed-as-agent', { ...listedOnly, agents: [{ id: 'agent-1' }] }),
          item('listed-in-group', {
            ...listedOnly,
            agentGroups: [{ members: [{ id: 'agent-1' }] }],
          }),
          item('unlisted-allowed', { listedGroupsOnly: true, unlistedCanCreateTicket: true }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(agent))).toEqual([
        'listed-as-agent',
        'listed-in-group',
        'unlisted-allowed',
      ]);
    });

    it('AC-01: atendente não recebe item de mesa que não enxerga (nem listado, nem interação entre mesas)', async () => {
      returns(
        category(
          'cat-1',
          item('hidden', { allowCrossDeskInteraction: false }),
          item('mine', { allowCrossDeskInteraction: false, agents: [{ id: 'agent-1' }] }),
          item('cross', { allowCrossDeskInteraction: true }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(agent))).toEqual(['mine', 'cross']);
    });

    it('AC-01: a resposta não vaza os dados internos da mesa', async () => {
      returns(category('cat-1', item('open', { agents: [{ id: 'agent-9' }] })));
      const [first] = await service.findActiveCatalog(admin);
      expect(first.items).toHaveLength(1);
      expect(first.items[0]).not.toHaveProperty('defaultServiceDesk');
      expect(first.items[0]).toHaveProperty('defaultServiceDeskId', 'desk-open');
    });

    it('AC-02: omite a categoria cujos itens ficaram todos fora e mantém as demais', async () => {
      returns(
        category('cat-empty', item('inactive', { active: false })),
        category('cat-ok', item('open')),
      );
      const result = await service.findActiveCatalog(admin);
      expect(result.map((c: { id: string }) => c.id)).toEqual(['cat-ok']);
    });

    it('AC-03: atendente com organizationId recebe itens da mesa do Cliente e de mesa global, e não de mesa de outro Cliente', async () => {
      returns(
        category(
          'cat-1',
          item('mine', { organizations: [{ id: 'org-9' }] }),
          item('shared', { organizations: [{ id: 'org-1' }, { id: 'org-9' }] }),
          item('global', { organizations: [] }),
          item('other', { organizations: [{ id: 'org-1' }] }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(agent, 'org-9'))).toEqual([
        'mine',
        'shared',
        'global',
      ]);
    });

    it('AC-03: sem organizationId o atendente não é filtrado por Cliente', async () => {
      returns(
        category(
          'cat-1',
          item('a', { organizations: [{ id: 'org-1' }] }),
          item('b', { organizations: [{ id: 'org-2' }] }),
          item('c', { organizations: [] }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(agent))).toEqual(['a', 'b', 'c']);
    });

    it('AC-04: CLIENT ignora o organizationId recebido e fica na própria organização', async () => {
      returns(
        category(
          'cat-1',
          item('mine', { organizations: [{ id: 'org-1' }] }),
          item('global', { organizations: [] }),
          item('other', { organizations: [{ id: 'org-2' }] }),
        ),
      );
      expect(itemIds(await service.findActiveCatalog(client, 'org-2'))).toEqual(['mine', 'global']);
    });

    it('AC-04: CLIENT sem organização só recebe itens de mesa global', async () => {
      returns(
        category(
          'cat-1',
          item('mine', { organizations: [{ id: 'org-1' }] }),
          item('global', { organizations: [] }),
        ),
      );
      const orphan = { id: 'client-2', role: Role.CLIENT, organizationId: null };
      expect(itemIds(await service.findActiveCatalog(orphan))).toEqual(['global']);
    });
  });

  describe('createCategory', () => {
    it('creates the category with the given dto', async () => {
      const dto = { name: 'Infra', isActive: true } as any;
      mockPrisma.serviceCatalogCategory.create.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await service.createCategory(dto);

      expect(mockPrisma.serviceCatalogCategory.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'cat-1', ...dto });
    });
  });

  describe('updateCategory', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue(null);

      await expect(service.updateCategory('missing-id', { name: 'X' } as any)).rejects.toThrow(
        NotFoundException,
      );
      expect(mockPrisma.serviceCatalogCategory.update).not.toHaveBeenCalled();
    });

    it('updates the category when it exists', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.serviceCatalogCategory.update.mockResolvedValue({ id: 'cat-1', name: 'New Name' });

      const result = await service.updateCategory('cat-1', { name: 'New Name' } as any);

      expect(mockPrisma.serviceCatalogCategory.update).toHaveBeenCalledWith({
        where: { id: 'cat-1' },
        data: { name: 'New Name' },
      });
      expect(result).toEqual({ id: 'cat-1', name: 'New Name' });
    });
  });

  describe('deleteCategory', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue(null);

      await expect(service.deleteCategory('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceCatalogCategory.delete).not.toHaveBeenCalled();
    });

    it('deletes the category when it exists', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue({ id: 'cat-1' });

      await service.deleteCategory('cat-1');

      expect(mockPrisma.serviceCatalogCategory.delete).toHaveBeenCalledWith({ where: { id: 'cat-1' } });
    });
  });

  describe('createItem', () => {
    const dto = { categoryId: 'cat-1', defaultServiceDeskId: 'sd-1', title: 'Novo acesso' } as any;

    it('throws NotFoundException when the category does not exist', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue(null);

      await expect(service.createItem(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceDesk.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.serviceCatalogItem.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the service desk does not exist', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.serviceDesk.findUnique.mockResolvedValue(null);

      await expect(service.createItem(dto)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceCatalogItem.create).not.toHaveBeenCalled();
    });

    it('creates the item when both category and service desk exist', async () => {
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue({ id: 'cat-1' });
      mockPrisma.serviceDesk.findUnique.mockResolvedValue({ id: 'sd-1' });
      mockPrisma.serviceCatalogItem.create.mockResolvedValue({ id: 'item-1', ...dto });

      const result = await service.createItem(dto);

      expect(mockPrisma.serviceCatalogItem.create).toHaveBeenCalledWith({ data: dto });
      expect(result).toEqual({ id: 'item-1', ...dto });
    });
  });

  describe('updateItem', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue(null);

      await expect(service.updateItem('missing-id', {} as any)).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceCatalogItem.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when changing to a category that does not exist', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem('item-1', { categoryId: 'missing-cat' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceCatalogItem.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when changing to a service desk that does not exist', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.serviceDesk.findUnique.mockResolvedValue(null);

      await expect(
        service.updateItem('item-1', { defaultServiceDeskId: 'missing-sd' } as any),
      ).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceCatalogItem.update).not.toHaveBeenCalled();
    });

    it('does not re-validate categoryId/defaultServiceDeskId when they are not part of the update', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.serviceCatalogItem.update.mockResolvedValue({ id: 'item-1', title: 'Novo título' });

      const result = await service.updateItem('item-1', { title: 'Novo título' } as any);

      expect(mockPrisma.serviceCatalogCategory.findUnique).not.toHaveBeenCalled();
      expect(mockPrisma.serviceDesk.findUnique).not.toHaveBeenCalled();
      expect(result).toEqual({ id: 'item-1', title: 'Novo título' });
    });

    it('updates the item when the new category and service desk both exist', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });
      mockPrisma.serviceCatalogCategory.findUnique.mockResolvedValue({ id: 'cat-2' });
      mockPrisma.serviceDesk.findUnique.mockResolvedValue({ id: 'sd-2' });
      mockPrisma.serviceCatalogItem.update.mockResolvedValue({ id: 'item-1', categoryId: 'cat-2' });

      const result = await service.updateItem('item-1', {
        categoryId: 'cat-2',
        defaultServiceDeskId: 'sd-2',
      } as any);

      expect(mockPrisma.serviceCatalogItem.update).toHaveBeenCalledWith({
        where: { id: 'item-1' },
        data: { categoryId: 'cat-2', defaultServiceDeskId: 'sd-2' },
      });
      expect(result).toEqual({ id: 'item-1', categoryId: 'cat-2' });
    });
  });

  describe('deleteItem', () => {
    it('throws NotFoundException when the item does not exist', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue(null);

      await expect(service.deleteItem('missing-id')).rejects.toThrow(NotFoundException);
      expect(mockPrisma.serviceCatalogItem.delete).not.toHaveBeenCalled();
    });

    it('deletes the item when it exists', async () => {
      mockPrisma.serviceCatalogItem.findUnique.mockResolvedValue({ id: 'item-1' });

      await service.deleteItem('item-1');

      expect(mockPrisma.serviceCatalogItem.delete).toHaveBeenCalledWith({ where: { id: 'item-1' } });
    });
  });
});
