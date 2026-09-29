import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { Role } from '@prisma/client';
import { ServiceDesksController } from './service-desks.controller';
import { ServiceDesksService } from './service-desks.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';

const mockServiceDesksService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
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

    it('allows any authenticated role on findAll/findOne (no @Roles metadata)', () => {
      expect(
        guard.canActivate(contextFor(controller.findAll, Role.CLIENT)),
      ).toBe(true);
      expect(
        guard.canActivate(contextFor(controller.findOne, Role.AGENT)),
      ).toBe(true);
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
  });
});
