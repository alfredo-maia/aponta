import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { KnowledgeCatalogController } from './knowledge-catalog.controller';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsService } from '../permissions/permissions.service';

const mockKnowledgeCatalogService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('KnowledgeCatalogController', () => {
  let controller: KnowledgeCatalogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeCatalogController],
      providers: [
        { provide: KnowledgeCatalogService, useValue: mockKnowledgeCatalogService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<KnowledgeCatalogController>(KnowledgeCatalogController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@RequirePermission metadata', () => {
    it('has no @RequirePermission restriction on findAll (public/optional-auth browsing)', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toBeUndefined();
    });

    it('has no @RequirePermission restriction on findOne', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findOne)).toBeUndefined();
    });

    it('requires MANAGE_SERVICE_CATALOGS on create', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
        'MANAGE_SERVICE_CATALOGS',
      ]);
    });

    it('requires MANAGE_SERVICE_CATALOGS on update', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
        'MANAGE_SERVICE_CATALOGS',
      ]);
    });

    it('requires MANAGE_SERVICE_CATALOGS on remove', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.remove)).toEqual([
        'MANAGE_SERVICE_CATALOGS',
      ]);
    });
  });

  describe('delegation', () => {
    it('findAll delegates to the service with the query', async () => {
      mockKnowledgeCatalogService.findAll.mockResolvedValue([]);

      await controller.findAll({ search: 'trein' });

      expect(mockKnowledgeCatalogService.findAll).toHaveBeenCalledWith({ search: 'trein' });
    });

    it('findOne delegates to the service with the id', async () => {
      mockKnowledgeCatalogService.findOne.mockResolvedValue({ id: 'item-1' });

      await controller.findOne('item-1');

      expect(mockKnowledgeCatalogService.findOne).toHaveBeenCalledWith('item-1');
    });

    it('create delegates to the service with the dto', async () => {
      const dto = { name: 'Treinamento' };
      mockKnowledgeCatalogService.create.mockResolvedValue({ id: 'item-1', ...dto });

      await controller.create(dto as any);

      expect(mockKnowledgeCatalogService.create).toHaveBeenCalledWith(dto);
    });

    it('update delegates to the service with the id and dto', async () => {
      const dto = { name: 'Novo nome' };
      mockKnowledgeCatalogService.update.mockResolvedValue({ id: 'item-1', ...dto });

      await controller.update('item-1', dto as any);

      expect(mockKnowledgeCatalogService.update).toHaveBeenCalledWith('item-1', dto);
    });

    it('remove delegates to the service with the id', async () => {
      mockKnowledgeCatalogService.remove.mockResolvedValue({ id: 'item-1' });

      await controller.remove('item-1');

      expect(mockKnowledgeCatalogService.remove).toHaveBeenCalledWith('item-1');
    });
  });
});
