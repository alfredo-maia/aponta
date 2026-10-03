import { NotFoundException } from '@nestjs/common';
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
