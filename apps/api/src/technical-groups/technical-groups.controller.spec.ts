import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { TechnicalGroupsController } from './technical-groups.controller';
import { TechnicalGroupsService } from './technical-groups.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { PermissionsService } from '../permissions/permissions.service';

const mockService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  addMember: jest.fn(),
  removeMember: jest.fn(),
  addOrganization: jest.fn(),
  removeOrganization: jest.fn(),
  addServiceDesk: jest.fn(),
  removeServiceDesk: jest.fn(),
};

describe('TechnicalGroupsController', () => {
  let controller: TechnicalGroupsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TechnicalGroupsController],
      providers: [
        { provide: TechnicalGroupsService, useValue: mockService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<TechnicalGroupsController>(TechnicalGroupsController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  it('registers JwtAuthGuard and PermissionsGuard at the class level', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, TechnicalGroupsController)).toEqual([
      JwtAuthGuard,
      PermissionsGuard,
    ]);
  });

  it('requires MANAGE_USERS on every handler', () => {
    const handlers = [
      controller.findAll,
      controller.findOne,
      controller.create,
      controller.update,
      controller.remove,
      controller.addMember,
      controller.removeMember,
      controller.addOrganization,
      controller.removeOrganization,
      controller.addServiceDesk,
      controller.removeServiceDesk,
    ];

    for (const handler of handlers) {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, handler)).toEqual(['MANAGE_USERS']);
    }
  });

  describe('delegation', () => {
    it('findAll delegates to the service', async () => {
      await controller.findAll();
      expect(mockService.findAll).toHaveBeenCalled();
    });

    it('addMember delegates to the service with group and user ids', async () => {
      await controller.addMember('t-1', 'u-1');
      expect(mockService.addMember).toHaveBeenCalledWith('t-1', 'u-1');
    });

    it('removeMember delegates to the service with group and user ids', async () => {
      await controller.removeMember('t-1', 'u-1');
      expect(mockService.removeMember).toHaveBeenCalledWith('t-1', 'u-1');
    });

    it('addOrganization delegates to the service with group and organization ids', async () => {
      await controller.addOrganization('t-1', 'o-1');
      expect(mockService.addOrganization).toHaveBeenCalledWith('t-1', 'o-1');
    });

    it('removeOrganization delegates to the service with group and organization ids', async () => {
      await controller.removeOrganization('t-1', 'o-1');
      expect(mockService.removeOrganization).toHaveBeenCalledWith('t-1', 'o-1');
    });

    it('addServiceDesk delegates to the service with group and service desk ids', async () => {
      await controller.addServiceDesk('t-1', 'sd-1');
      expect(mockService.addServiceDesk).toHaveBeenCalledWith('t-1', 'sd-1');
    });

    it('removeServiceDesk delegates to the service with group and service desk ids', async () => {
      await controller.removeServiceDesk('t-1', 'sd-1');
      expect(mockService.removeServiceDesk).toHaveBeenCalledWith('t-1', 'sd-1');
    });
  });
});
