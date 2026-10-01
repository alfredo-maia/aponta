import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ArticlesController } from './articles.controller';
import { ArticlesService } from './articles.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

const mockArticlesService = {
  findAll: jest.fn(),
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
        Reflector,
      ],
    }).compile();

    controller = module.get<ArticlesController>(ArticlesController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata', () => {
    it('requires AGENT, AGENT_MASTER or ADMIN on create (CLIENT cannot author articles)', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
    });

    it('requires AGENT, AGENT_MASTER or ADMIN on update/remove', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
      expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
    });

    it('has no @Roles restriction on findAll', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toBeUndefined();
    });
  });

  describe('delegation', () => {
    const agent = { id: 'agent-1', role: Role.AGENT };

    it('findAll delegates to the service with the current user and query', async () => {
      mockArticlesService.findAll.mockResolvedValue([]);

      await controller.findAll(agent, { search: 'test' });

      expect(mockArticlesService.findAll).toHaveBeenCalledWith(agent, { search: 'test' });
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
