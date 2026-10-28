import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { ServiceDesksController } from './service-desks.controller';
import { ServiceDesksService } from './service-desks.service';
import { TicketStagesService } from './ticket-stages.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsService } from '../permissions/permissions.service';

const mockTicketStagesService = {
  list: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  reorder: jest.fn(),
  remove: jest.fn(),
};

const mockServiceDesksService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  getBusinessHours: jest.fn(),
  updateBusinessHours: jest.fn(),
  importNationalHolidays: jest.fn(),
};

describe('ServiceDesksController', () => {
  let controller: ServiceDesksController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ServiceDesksController],
      providers: [
        { provide: ServiceDesksService, useValue: mockServiceDesksService },
        { provide: TicketStagesService, useValue: mockTicketStagesService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
      ],
    }).compile();

    controller = module.get<ServiceDesksController>(ServiceDesksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@RequirePermission metadata declarations', () => {
    it('requires MANAGE_SERVICE_DESKS on create', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
    });

    it('requires MANAGE_SERVICE_DESKS on update', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
    });

    it('requires MANAGE_SERVICE_DESKS on remove', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.remove)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
    });

    it('requires MANAGE_SERVICE_DESKS on updateBusinessHours', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.updateBusinessHours),
      ).toEqual(['MANAGE_SERVICE_DESKS']);
    });

    it('does not restrict getBusinessHours to any permission', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.getBusinessHours),
      ).toBeUndefined();
    });

    it('requires MANAGE_SERVICE_DESKS on importNationalHolidays', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.importNationalHolidays),
      ).toEqual(['MANAGE_SERVICE_DESKS']);
    });

    it('requires MANAGE_SERVICE_DESKS on stage mutations', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.createStage)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.updateStage)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.reorderStages)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.removeStage)).toEqual([
        'MANAGE_SERVICE_DESKS',
      ]);
    });

    it('does not restrict listStages to any permission', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.listStages),
      ).toBeUndefined();
    });

    it('does not restrict findAll to any permission', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toBeUndefined();
    });

    it('does not restrict findOne to any permission', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findOne)).toBeUndefined();
    });
  });

  describe('PermissionsGuard behavior against the declared metadata', () => {
    let reflector: Reflector;
    let mockPermissionsService: { hasPermission: jest.Mock };
    let guard: PermissionsGuard;

    beforeEach(() => {
      reflector = new Reflector();
      mockPermissionsService = { hasPermission: jest.fn() };
      guard = new PermissionsGuard(reflector, mockPermissionsService as any);
    });

    function contextFor(

      handler: (...args: any[]) => unknown,
      user?: { id: string; role: Role },
    ): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user }),
        }),
        getHandler: () => handler,
        getClass: () => ServiceDesksController,
      } as unknown as ExecutionContext;
    }

    it('blocks CLIENT without MANAGE_SERVICE_DESKS on create', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(false);
      await expect(
        guard.canActivate(contextFor(controller.create, { id: 'c-1', role: Role.CLIENT })),
      ).resolves.toBe(false);
    });

    it('blocks AGENT without MANAGE_SERVICE_DESKS on update', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(false);
      await expect(
        guard.canActivate(contextFor(controller.update, { id: 'a-1', role: Role.AGENT })),
      ).resolves.toBe(false);
    });

    it('blocks unauthenticated (no user) on remove', async () => {
      await expect(guard.canActivate(contextFor(controller.remove))).resolves.toBe(false);
    });

    it('allows ADMIN on create/update/remove without checking PermissionsService', async () => {
      const admin = { id: 'admin-1', role: Role.ADMIN };
      await expect(guard.canActivate(contextFor(controller.create, admin))).resolves.toBe(true);
      await expect(guard.canActivate(contextFor(controller.update, admin))).resolves.toBe(true);
      await expect(guard.canActivate(contextFor(controller.remove, admin))).resolves.toBe(true);
      expect(mockPermissionsService.hasPermission).not.toHaveBeenCalled();
    });

    it('allows AGENT_MASTER holding MANAGE_SERVICE_DESKS on updateBusinessHours, blocks one without it', async () => {
      mockPermissionsService.hasPermission.mockResolvedValueOnce(true);
      await expect(
        guard.canActivate(
          contextFor(controller.updateBusinessHours, { id: 'm-1', role: Role.AGENT_MASTER }),
        ),
      ).resolves.toBe(true);

      mockPermissionsService.hasPermission.mockResolvedValueOnce(false);
      await expect(
        guard.canActivate(
          contextFor(controller.updateBusinessHours, { id: 'a-1', role: Role.AGENT }),
        ),
      ).resolves.toBe(false);
    });

    it('allows any authenticated user on findAll/findOne (no @RequirePermission metadata)', async () => {
      await expect(
        guard.canActivate(contextFor(controller.findAll, { id: 'c-1', role: Role.CLIENT })),
      ).resolves.toBe(true);
      await expect(
        guard.canActivate(contextFor(controller.findOne, { id: 'a-1', role: Role.AGENT })),
      ).resolves.toBe(true);
      expect(mockPermissionsService.hasPermission).not.toHaveBeenCalled();
    });
  });

  describe('@UseGuards registration (catches decorator removal/reordering)', () => {
    // These assertions read NestJS's own GUARDS_METADATA (set by @UseGuards)
    // rather than instantiating PermissionsGuard by hand. Unlike the
    // "PermissionsGuard behavior against the declared metadata" suite above -
    // which manually builds an ExecutionContext and never asks whether
    // NestJS would actually apply PermissionsGuard to the route - these tests
    // fail if @UseGuards(PermissionsGuard) is deleted or reordered on a
    // handler, even though @RequirePermission(...) metadata is untouched.
    function methodGuards(

      handler: (...args: any[]) => unknown,

    ): any[] {
      return Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    }

    it('registers JwtAuthGuard at the class level', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ServiceDesksController),
      ).toContain(JwtAuthGuard);
    });

    it('registers PermissionsGuard on the create handler', () => {
      expect(methodGuards(controller.create)).toContain(PermissionsGuard);
    });

    it('registers PermissionsGuard on the update handler', () => {
      expect(methodGuards(controller.update)).toContain(PermissionsGuard);
    });

    it('registers PermissionsGuard on the remove handler', () => {
      expect(methodGuards(controller.remove)).toContain(PermissionsGuard);
    });

    it('registers PermissionsGuard on the updateBusinessHours handler', () => {
      expect(methodGuards(controller.updateBusinessHours)).toContain(
        PermissionsGuard,
      );
    });

    it('does not register PermissionsGuard on getBusinessHours (no method-level @UseGuards)', () => {
      expect(methodGuards(controller.getBusinessHours)).not.toContain(
        PermissionsGuard,
      );
    });

    it('does not register PermissionsGuard on findAll/findOne (no method-level @UseGuards)', () => {
      expect(methodGuards(controller.findAll)).not.toContain(PermissionsGuard);
      expect(methodGuards(controller.findOne)).not.toContain(PermissionsGuard);
    });
  });

  describe('CRUD delegation', () => {
    it('create delegates to the service', async () => {
      const dto = { name: 'Front Desk' };
      mockServiceDesksService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto, { id: 'admin-1', role: Role.ADMIN });

      expect(mockServiceDesksService.create).toHaveBeenCalledWith(dto, 'admin-1');
      expect(result).toEqual({ id: '1', ...dto });
    });

    it('findAll delegates to the service', async () => {
      mockServiceDesksService.findAll.mockResolvedValue([]);

      const user = { id: 'admin-1', role: Role.ADMIN };
      const result = await controller.findAll(user);

      expect(mockServiceDesksService.findAll).toHaveBeenCalledWith(user);
      expect(result).toEqual([]);
    });

    it('findOne delegates to the service', async () => {
      mockServiceDesksService.findOne.mockResolvedValue({ id: '1' });

      const result = await controller.findOne('1');

      expect(mockServiceDesksService.findOne).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1' });
    });

    it('update delegates to the service', async () => {
      const dto = { name: 'New Name' };
      mockServiceDesksService.update.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.update('1', dto, { id: 'admin-1', role: Role.ADMIN });

      expect(mockServiceDesksService.update).toHaveBeenCalledWith('1', dto, 'admin-1');
      expect(result).toEqual({ id: '1', ...dto });
    });

    it('remove delegates to the service', async () => {
      mockServiceDesksService.remove.mockResolvedValue({ id: '1' });

      const result = await controller.remove('1');

      expect(mockServiceDesksService.remove).toHaveBeenCalledWith('1');
      expect(result).toEqual({ id: '1' });
    });

    it('getBusinessHours delegates to the service', async () => {
      const expected = { businessHours: [], holidays: [] };
      mockServiceDesksService.getBusinessHours.mockResolvedValue(expected);

      const result = await controller.getBusinessHours('1');

      expect(mockServiceDesksService.getBusinessHours).toHaveBeenCalledWith(
        '1',
      );
      expect(result).toEqual(expected);
    });

    it('updateBusinessHours delegates to the service', async () => {
      const dto = {
        businessHours: [{ weekday: 1, startTime: '08:00', endTime: '18:00' }],
        holidays: [],
      };
      const expected = { businessHours: dto.businessHours, holidays: [] };
      mockServiceDesksService.updateBusinessHours.mockResolvedValue(expected);

      const result = await controller.updateBusinessHours('1', dto);

      expect(
        mockServiceDesksService.updateBusinessHours,
      ).toHaveBeenCalledWith('1', dto);
      expect(result).toEqual(expected);
    });

    it('importNationalHolidays delegates to the service with the parsed year', async () => {
      const expected = [{ date: '2026-01-01', name: 'Confraternização mundial' }];
      mockServiceDesksService.importNationalHolidays.mockResolvedValue(
        expected,
      );

      const result = await controller.importNationalHolidays('2026');

      expect(
        mockServiceDesksService.importNationalHolidays,
      ).toHaveBeenCalledWith(2026);
      expect(result).toEqual(expected);
    });
  });
});
