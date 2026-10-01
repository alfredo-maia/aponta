import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role } from '@prisma/client';
import { ServiceDesksController } from './service-desks.controller';
import { ServiceDesksService } from './service-desks.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

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
      ],
    }).compile();

    controller = module.get<ServiceDesksController>(ServiceDesksController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata declarations', () => {
    it('requires ADMIN on create', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
        Role.ADMIN,
      ]);
    });

    it('requires ADMIN on update', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
        Role.ADMIN,
      ]);
    });

    it('requires ADMIN on remove', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
        Role.ADMIN,
      ]);
    });

    it('requires ADMIN or AGENT_MASTER on updateBusinessHours', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.updateBusinessHours),
      ).toEqual([Role.ADMIN, Role.AGENT_MASTER]);
    });

    it('does not restrict getBusinessHours to any role', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.getBusinessHours),
      ).toBeUndefined();
    });

    it('requires ADMIN or AGENT_MASTER on importNationalHolidays', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.importNationalHolidays),
      ).toEqual([Role.ADMIN, Role.AGENT_MASTER]);
    });

    it('does not restrict findAll to any role', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toBeUndefined();
    });

    it('does not restrict findOne to any role', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toBeUndefined();
    });
  });

  describe('RolesGuard behavior against the declared metadata', () => {
    let reflector: Reflector;
    let guard: RolesGuard;

    beforeEach(() => {
      reflector = new Reflector();
      guard = new RolesGuard(reflector);
    });

    function contextFor(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: (...args: any[]) => unknown,
      role?: Role,
    ): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user: role ? { role } : undefined }),
        }),
        getHandler: () => handler,
        getClass: () => ServiceDesksController,
      } as unknown as ExecutionContext;
    }

    it('blocks CLIENT on create', () => {
      expect(
        guard.canActivate(contextFor(controller.create, Role.CLIENT)),
      ).toBe(false);
    });

    it('blocks AGENT on update', () => {
      expect(
        guard.canActivate(contextFor(controller.update, Role.AGENT)),
      ).toBe(false);
    });

    it('blocks unauthenticated (no user) on remove', () => {
      expect(guard.canActivate(contextFor(controller.remove))).toBe(false);
    });

    it('allows ADMIN on create/update/remove', () => {
      expect(
        guard.canActivate(contextFor(controller.create, Role.ADMIN)),
      ).toBe(true);
      expect(
        guard.canActivate(contextFor(controller.update, Role.ADMIN)),
      ).toBe(true);
      expect(
        guard.canActivate(contextFor(controller.remove, Role.ADMIN)),
      ).toBe(true);
    });

    it('allows ADMIN and AGENT_MASTER on updateBusinessHours, blocks AGENT/CLIENT', () => {
      expect(
        guard.canActivate(
          contextFor(controller.updateBusinessHours, Role.ADMIN),
        ),
      ).toBe(true);
      expect(
        guard.canActivate(
          contextFor(controller.updateBusinessHours, Role.AGENT_MASTER),
        ),
      ).toBe(true);
      expect(
        guard.canActivate(
          contextFor(controller.updateBusinessHours, Role.AGENT),
        ),
      ).toBe(false);
      expect(
        guard.canActivate(
          contextFor(controller.updateBusinessHours, Role.CLIENT),
        ),
      ).toBe(false);
    });

    it('allows ADMIN and AGENT_MASTER on importNationalHolidays, blocks AGENT/CLIENT', () => {
      expect(
        guard.canActivate(
          contextFor(controller.importNationalHolidays, Role.ADMIN),
        ),
      ).toBe(true);
      expect(
        guard.canActivate(
          contextFor(controller.importNationalHolidays, Role.AGENT_MASTER),
        ),
      ).toBe(true);
      expect(
        guard.canActivate(
          contextFor(controller.importNationalHolidays, Role.AGENT),
        ),
      ).toBe(false);
      expect(
        guard.canActivate(
          contextFor(controller.importNationalHolidays, Role.CLIENT),
        ),
      ).toBe(false);
    });

    it('allows any authenticated role on findAll/findOne (no @Roles metadata)', () => {
      expect(
        guard.canActivate(contextFor(controller.findAll, Role.CLIENT)),
      ).toBe(true);
      expect(
        guard.canActivate(contextFor(controller.findOne, Role.AGENT)),
      ).toBe(true);
    });
  });

  describe('@UseGuards registration (catches decorator removal/reordering)', () => {
    // These assertions read NestJS's own GUARDS_METADATA (set by @UseGuards)
    // rather than instantiating RolesGuard by hand. Unlike the
    // "RolesGuard behavior against the declared metadata" suite above -
    // which manually builds an ExecutionContext and never asks whether
    // NestJS would actually apply RolesGuard to the route - these tests
    // fail if @UseGuards(RolesGuard) is deleted or reordered on a handler,
    // even though @Roles(...) metadata is untouched.
    function methodGuards(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      handler: (...args: any[]) => unknown,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ): any[] {
      return Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    }

    it('registers JwtAuthGuard at the class level', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, ServiceDesksController),
      ).toContain(JwtAuthGuard);
    });

    it('registers RolesGuard on the create handler', () => {
      expect(methodGuards(controller.create)).toContain(RolesGuard);
    });

    it('registers RolesGuard on the update handler', () => {
      expect(methodGuards(controller.update)).toContain(RolesGuard);
    });

    it('registers RolesGuard on the remove handler', () => {
      expect(methodGuards(controller.remove)).toContain(RolesGuard);
    });

    it('registers RolesGuard on the updateBusinessHours handler', () => {
      expect(methodGuards(controller.updateBusinessHours)).toContain(
        RolesGuard,
      );
    });

    it('does not register RolesGuard on getBusinessHours (no method-level @UseGuards)', () => {
      expect(methodGuards(controller.getBusinessHours)).not.toContain(
        RolesGuard,
      );
    });

    it('does not register RolesGuard on findAll/findOne (no method-level @UseGuards)', () => {
      expect(methodGuards(controller.findAll)).not.toContain(RolesGuard);
      expect(methodGuards(controller.findOne)).not.toContain(RolesGuard);
    });
  });

  describe('CRUD delegation', () => {
    it('create delegates to the service', async () => {
      const dto = { name: 'Front Desk' };
      mockServiceDesksService.create.mockResolvedValue({ id: '1', ...dto });

      const result = await controller.create(dto);

      expect(mockServiceDesksService.create).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ id: '1', ...dto });
    });

    it('findAll delegates to the service', async () => {
      mockServiceDesksService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(mockServiceDesksService.findAll).toHaveBeenCalled();
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

      const result = await controller.update('1', dto);

      expect(mockServiceDesksService.update).toHaveBeenCalledWith('1', dto);
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
