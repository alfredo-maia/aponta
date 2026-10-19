import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { KnowledgeFoldersController } from './knowledge-folders.controller';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';

const mockKnowledgeFoldersService = {
  findAll: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('KnowledgeFoldersController', () => {
  let controller: KnowledgeFoldersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeFoldersController],
      providers: [
        { provide: KnowledgeFoldersService, useValue: mockKnowledgeFoldersService },
        Reflector,
      ],
    }).compile();

    controller = module.get<KnowledgeFoldersController>(KnowledgeFoldersController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata', () => {
    it('has no @Roles restriction on findAll (public listing)', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toBeUndefined();
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

    it('requires AGENT, AGENT_MASTER or ADMIN on remove (same as create/update, NOT admin-only)', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
    });
  });

  describe('delegation', () => {
    it('findAll delegates to the service', async () => {
      mockKnowledgeFoldersService.findAll.mockResolvedValue([]);

      await controller.findAll();

      expect(mockKnowledgeFoldersService.findAll).toHaveBeenCalled();
    });

    it('create delegates to the service with the dto', async () => {
      const dto = { name: 'Financeiro' };
      mockKnowledgeFoldersService.create.mockResolvedValue({ id: 'f-1' });

      await controller.create(dto);

      expect(mockKnowledgeFoldersService.create).toHaveBeenCalledWith(dto);
    });

    it('update delegates to the service with the id and dto', async () => {
      const dto = { name: 'Novo nome' };
      mockKnowledgeFoldersService.update.mockResolvedValue({ id: 'f-1' });

      await controller.update('f-1', dto);

      expect(mockKnowledgeFoldersService.update).toHaveBeenCalledWith('f-1', dto);
    });

    it('remove delegates to the service with the id', async () => {
      mockKnowledgeFoldersService.remove.mockResolvedValue({ id: 'f-1' });

      await controller.remove('f-1');

      expect(mockKnowledgeFoldersService.remove).toHaveBeenCalledWith('f-1');
    });
  });
});
