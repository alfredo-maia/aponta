import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsService } from '../permissions/permissions.service';

const mockArticlesService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  create: jest.fn(),
};

describe('ArticlesController', () => {
  let controller: ArticlesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ArticlesController],
      providers: [
        { provide: ArticlesService, useValue: mockArticlesService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@RequirePermission metadata', () => {
    it('requires MANAGE_KNOWLEDGE_BASE on create', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
        'MANAGE_KNOWLEDGE_BASE',
      ]);
    });

    it('requires MANAGE_KNOWLEDGE_BASE on update', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
        'MANAGE_KNOWLEDGE_BASE',
      ]);
    });

    it('requires MANAGE_KNOWLEDGE_BASE on remove', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.remove)).toEqual([
        'MANAGE_KNOWLEDGE_BASE',
      ]);
    });

    it('has no @RequirePermission restriction on findAll', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toBeUndefined();
    });

    it('has no @RequirePermission restriction on findOne (same public/optional-auth shape as findAll)', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findOne)).toBeUndefined();
    });
  });

  describe('delegation', () => {
    const agent = { id: 'agent-1', role: Role.AGENT };

    it('findAll delegates to the service with the current user and query', async () => {
      mockArticlesService.findAll.mockResolvedValue([]);

      await controller.findAll(agent, { search: 'test' });

      expect(mockArticlesService.findAll).toHaveBeenCalledWith(agent, { search: 'test' });
    });

    it('findOne delegates to the service with the id and current user', async () => {
      mockArticlesService.findOne.mockResolvedValue({ id: 'article-1' });

      await controller.findOne('article-1', agent);

      expect(mockArticlesService.findOne).toHaveBeenCalledWith('article-1', agent);
    });

    it('create delegates to the service with the dto and current user', async () => {
      const dto = { title: 'Como abrir um chamado', content: '...' };
      mockArticlesService.create.mockResolvedValue({ id: 'article-1' });

      await controller.create(dto, agent);

      expect(mockArticlesService.create).toHaveBeenCalledWith(dto, agent);
    });

    it('update delegates to the service', async () => {
      const dto = { title: 'Novo' };
      mockArticlesService.update.mockResolvedValue({ id: 'article-1' });

      await controller.update('article-1', dto, agent);

      expect(mockArticlesService.update).toHaveBeenCalledWith('article-1', dto, agent);
    });

    it('remove delegates to the service', async () => {
      mockArticlesService.remove.mockResolvedValue({ id: 'article-1' });

      await controller.remove('article-1', agent);

      expect(mockArticlesService.remove).toHaveBeenCalledWith('article-1', agent);
    });
  });
});
