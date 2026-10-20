import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { KnowledgeCatalogController } from './knowledge-catalog.controller';
import { KnowledgeCatalogService } from './knowledge-catalog.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

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
        Reflector,
      ],
    }).compile();

    controller = module.get<KnowledgeCatalogController>(KnowledgeCatalogController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata', () => {
    it('has no @Roles restriction on findAll (public/optional-auth browsing)', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toBeUndefined();
    });

    it('has no @Roles restriction on findOne', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toBeUndefined();
    });

    it('requires AGENT, AGENT_MASTER or ADMIN on create', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
    });

    it('requires AGENT, AGENT_MASTER or ADMIN on update', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
    });

    it('requires strict ADMIN on remove', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([Role.ADMIN]);
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
