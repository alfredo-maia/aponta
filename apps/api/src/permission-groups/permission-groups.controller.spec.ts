import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { PermissionGroupsController } from './permission-groups.controller';
import { PermissionGroupsService } from './permission-groups.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  updatePermissions: jest.fn(),
  remove: jest.fn(),
  addUser: jest.fn(),
  removeUser: jest.fn(),
  addTechnicalGroup: jest.fn(),
  removeTechnicalGroup: jest.fn(),
};

describe('PermissionGroupsController', () => {
  let controller: PermissionGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionGroupsController],
      providers: [
        { provide: PermissionGroupsService, useValue: mockService },
        Reflector,
      ],
    }).compile();

    controller = module.get<PermissionGroupsController>(PermissionGroupsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('registers JwtAuthGuard and RolesGuard at the class level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, PermissionGroupsController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
  });

  it('requires ADMIN on every handler', () => {
    const handlers = [
      controller.getCatalog,
      controller.findAll,
      controller.findOne,
      controller.create,
      controller.update,
      controller.updatePermissions,
      controller.remove,
      controller.addUser,
      controller.removeUser,
      controller.addTechnicalGroup,
      controller.removeTechnicalGroup,
    ];

    for (const handler of handlers) {
      expect(Reflect.getMetadata(ROLES_KEY, handler)).toEqual([Role.ADMIN]);
    }
  });

  describe('delegation', () => {
    it('getCatalog returns the static permission catalog', () => {
      const catalog = controller.getCatalog();
      expect(Array.isArray(catalog)).toBe(true);
      expect(catalog.length).toBeGreaterThan(0);
    });

    it('findAll delegates to the service', async () => {
      await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it('findOne delegates to the service with the id', async () => {
      await controller.findOne('g-1');
      expect(mockService.findOne).toHaveBeenCalledWith('g-1');
    });

    it('create delegates to the service with the dto', async () => {
      const dto = { name: 'Consultor' };
      await controller.create(dto as any);
      expect(mockService.create).toHaveBeenCalledWith(dto);
    });

    it('update delegates to the service with id and dto', async () => {
      const dto = { name: 'Novo nome' };
      await controller.update('g-1', dto as any);
      expect(mockService.update).toHaveBeenCalledWith('g-1', dto);
    });

    it('updatePermissions delegates to the service with id and dto', async () => {
      const dto = { permissions: ['MANAGE_USERS'] };
      await controller.updatePermissions('g-1', dto as any);
      expect(mockService.updatePermissions).toHaveBeenCalledWith('g-1', dto);
    });

    it('remove delegates to the service with the id', async () => {
      await controller.remove('g-1');
      expect(mockService.remove).toHaveBeenCalledWith('g-1');
    });

    it('addUser delegates to the service with group and user ids', async () => {
      await controller.addUser('g-1', 'u-1');
      expect(mockService.addUser).toHaveBeenCalledWith('g-1', 'u-1');
    });

    it('removeUser delegates to the service with group and user ids', async () => {
      await controller.removeUser('g-1', 'u-1');
      expect(mockService.removeUser).toHaveBeenCalledWith('g-1', 'u-1');
    });

    it('addTechnicalGroup delegates to the service with group and technical-group ids', async () => {
      await controller.addTechnicalGroup('g-1', 't-1');
      expect(mockService.addTechnicalGroup).toHaveBeenCalledWith('g-1', 't-1');
    });

    it('removeTechnicalGroup delegates to the service with group and technical-group ids', async () => {
      await controller.removeTechnicalGroup('g-1', 't-1');
      expect(mockService.removeTechnicalGroup).toHaveBeenCalledWith('g-1', 't-1');
    });
  });
});
