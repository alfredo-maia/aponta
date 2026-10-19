import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { KnowledgeFoldersController } from './knowledge-folders.controller';
import { KnowledgeFoldersService } from './knowledge-folders.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { OptionalJwtOrTokenAuthGuard } from '../auth/guards/optional-jwt-or-token-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

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

  describe('guard declarations', () => {
    it('registers OptionalJwtOrTokenAuthGuard at the class level (so RolesGuard sees request.user)', () => {
      // Regression test for a bug caught in code review: without an
      // authentication guard populating request.user, RolesGuard always
      // reads user as undefined and rejects every caller with 403 -
      // including a legitimate ADMIN holding a valid JWT. See the
      // "real HTTP proof" integration spec in this same directory.
      expect(
        Reflect.getMetadata(GUARDS_METADATA, KnowledgeFoldersController),
      ).toContain(OptionalJwtOrTokenAuthGuard);
    });

    it('registers RolesGuard on create/update/remove but not on findAll', () => {
      expect(Reflect.getMetadata(GUARDS_METADATA, controller.findAll)).toBeUndefined();

      for (const handler of [controller.create, controller.update, controller.remove]) {
        expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toContain(RolesGuard);
      }
    });
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
