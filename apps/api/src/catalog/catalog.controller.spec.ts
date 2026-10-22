import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { CatalogController } from './catalog.controller';
import { CatalogService } from './catalog.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsService } from '../permissions/permissions.service';

const mockCatalogService = {
  findAllCategories: jest.fn(),
  createCategory: jest.fn(),
  updateCategory: jest.fn(),
  deleteCategory: jest.fn(),
  createItem: jest.fn(),
  updateItem: jest.fn(),
  deleteItem: jest.fn(),
};

describe('CatalogController', () => {
  let controller: CatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CatalogController],
      providers: [
        { provide: CatalogService, useValue: mockCatalogService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<CatalogController>(CatalogController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@RequirePermission metadata (admin-only mutation endpoints)', () => {
    it.each([
      ['getAllCategories', 'getAllCategories'],
      ['createCategory', 'createCategory'],
      ['updateCategory', 'updateCategory'],
      ['deleteCategory', 'deleteCategory'],
      ['createItem', 'createItem'],
      ['updateItem', 'updateItem'],
      ['deleteItem', 'deleteItem'],
    ])('requires MANAGE_SERVICE_CATALOGS on %s', (_label, methodName) => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, (controller as any)[methodName]),
      ).toEqual(['MANAGE_SERVICE_CATALOGS']);
    });

    it('getActiveCatalog has NO permission restriction (any authenticated user)', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.getActiveCatalog)).toBeUndefined();
    });
  });

  describe('getActiveCatalog', () => {
    it('delegates to findAllCategories(includeItems=true, onlyActive=true)', async () => {
      mockCatalogService.findAllCategories.mockResolvedValue([{ id: 'cat-1' }]);

      const result = await controller.getActiveCatalog();

      expect(mockCatalogService.findAllCategories).toHaveBeenCalledWith(true, true);
      expect(result).toEqual([{ id: 'cat-1' }]);
    });
  });

  describe('getAllCategories', () => {
    it('delegates to findAllCategories(includeItems=true, onlyActive=false)', async () => {
      mockCatalogService.findAllCategories.mockResolvedValue([{ id: 'cat-1' }, { id: 'cat-2' }]);

      const result = await controller.getAllCategories();

      expect(mockCatalogService.findAllCategories).toHaveBeenCalledWith(true, false);
      expect(result).toEqual([{ id: 'cat-1' }, { id: 'cat-2' }]);
    });
  });

  describe('createCategory', () => {
    it('delegates to the service with the given dto', async () => {
      const dto = { name: 'Infra' } as any;
      mockCatalogService.createCategory.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await controller.createCategory(dto);

      expect(mockCatalogService.createCategory).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'cat-1', ...dto });
    });
  });

  describe('updateCategory', () => {
    it('delegates to the service with id and dto', async () => {
      const dto = { name: 'New Name' } as any;
      mockCatalogService.updateCategory.mockResolvedValue({ id: 'cat-1', ...dto });

      const result = await controller.updateCategory('cat-1', dto);

      expect(mockCatalogService.updateCategory).toHaveBeenCalledWith('cat-1', dto);
      expect(result).toEqual({ id: 'cat-1', ...dto });
    });
  });

  describe('deleteCategory', () => {
    it('delegates to the service and returns { success: true }', async () => {
      mockCatalogService.deleteCategory.mockResolvedValue(undefined);

      const result = await controller.deleteCategory('cat-1');

      expect(mockCatalogService.deleteCategory).toHaveBeenCalledWith('cat-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('createItem', () => {
    it('delegates to the service with the given dto', async () => {
      const dto = { categoryId: 'cat-1', defaultServiceDeskId: 'sd-1', title: 'Novo acesso' } as any;
      mockCatalogService.createItem.mockResolvedValue({ id: 'item-1', ...dto });

      const result = await controller.createItem(dto);

      expect(mockCatalogService.createItem).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: 'item-1', ...dto });
    });
  });

  describe('updateItem', () => {
    it('delegates to the service with id and dto', async () => {
      const dto = { title: 'Novo título' } as any;
      mockCatalogService.updateItem.mockResolvedValue({ id: 'item-1', ...dto });

      const result = await controller.updateItem('item-1', dto);

      expect(mockCatalogService.updateItem).toHaveBeenCalledWith('item-1', dto);
      expect(result).toEqual({ id: 'item-1', ...dto });
    });
  });

  describe('deleteItem', () => {
    it('delegates to the service and returns { success: true }', async () => {
      mockCatalogService.deleteItem.mockResolvedValue(undefined);

      const result = await controller.deleteItem('item-1');

      expect(mockCatalogService.deleteItem).toHaveBeenCalledWith('item-1');
      expect(result).toEqual({ success: true });
    });
  });
});
