import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role, TicketStatus } from '@prisma/client';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';
import { PermissionsService } from '../permissions/permissions.service';

const mockTicketsService = {
  create: jest.fn(),
  findAll: jest.fn(),
  findOne: jest.fn(),
  update: jest.fn(),
  assign: jest.fn(),
  changeStatus: jest.fn(),
  changeStage: jest.fn(),
  changeServiceDesk: jest.fn(),
  findAudits: jest.fn(),
  cancel: jest.fn(),
  addSlaHours: jest.fn(),
};

describe('TicketsController', () => {
  let controller: TicketsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TicketsController],
      providers: [
        { provide: TicketsService, useValue: mockTicketsService },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
      ],
    }).compile();

    controller = module.get<TicketsController>(TicketsController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('creates a ticket as the authenticated user (requesterId = caller id)', async () => {
      const dto = {
        title: 't',
        description: 'd',
        serviceDeskId: 'desk-1',
      };
      const req = { user: { id: 'client-1', role: Role.CLIENT } };
      mockTicketsService.create.mockResolvedValue({ id: 'ticket-1' });

      await controller.create(dto, req as never);

      expect(mockTicketsService.create).toHaveBeenCalledWith(
        dto,
        req.user,
      );
    });
  });

  describe('findAll', () => {
    it('passes the query and the calling user through to the service', async () => {
      const query = { serviceDeskId: 'desk-1' };
      const req = { user: { id: 'agent-1', role: Role.AGENT } };
      mockTicketsService.findAll.mockResolvedValue([]);

      await controller.findAll(query, req as never);

      expect(mockTicketsService.findAll).toHaveBeenCalledWith(query, {
        id: 'agent-1',
        role: Role.AGENT,
      });
    });
  });

  describe('findOne', () => {
    it('passes id and the calling user through to the service', async () => {
      const req = { user: { id: 'client-1', role: Role.CLIENT } };
      mockTicketsService.findOne.mockResolvedValue({ id: 't1' });

      await controller.findOne('t1', req as never);

      expect(mockTicketsService.findOne).toHaveBeenCalledWith('t1', {
        id: 'client-1',
        role: Role.CLIENT,
      });
    });
  });

  describe('@RequirePermission metadata declarations', () => {
    it('does not restrict create to any permission (all authenticated roles can create)', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.create),
      ).toBeUndefined();
    });

    it('does not restrict findAll/findOne to any permission (service filters instead)', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.findOne),
      ).toBeUndefined();
    });

    it('requires EDIT_TICKETS on update', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
        'EDIT_TICKETS',
      ]);
    });

    it('requires EDIT_TICKETS on assign', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.assign)).toEqual([
        'EDIT_TICKETS',
      ]);
    });

    it('requires EDIT_TICKETS on changeStatus', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.changeStatus),
      ).toEqual(['EDIT_TICKETS']);
    });

    it('requires EDIT_TICKETS on changeStage', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.changeStage),
      ).toEqual(['EDIT_TICKETS']);
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
        getClass: () => TicketsController,
      } as unknown as ExecutionContext;
    }

    it('blocks CLIENT without EDIT_TICKETS from update/assign/changeStatus', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(false);
      const client = { id: 'c-1', role: Role.CLIENT };
      await expect(guard.canActivate(contextFor(controller.update, client))).resolves.toBe(false);
      await expect(guard.canActivate(contextFor(controller.assign, client))).resolves.toBe(false);
      await expect(
        guard.canActivate(contextFor(controller.changeStatus, client)),
      ).resolves.toBe(false);
    });

    it('allows ADMIN on update/assign/changeStatus without checking PermissionsService', async () => {
      const admin = { id: 'admin-1', role: Role.ADMIN };
      await expect(guard.canActivate(contextFor(controller.update, admin))).resolves.toBe(true);
      await expect(guard.canActivate(contextFor(controller.assign, admin))).resolves.toBe(true);
      await expect(
        guard.canActivate(contextFor(controller.changeStatus, admin)),
      ).resolves.toBe(true);
      expect(mockPermissionsService.hasPermission).not.toHaveBeenCalled();
    });

    it('allows AGENT holding EDIT_TICKETS on update/assign/changeStatus', async () => {
      mockPermissionsService.hasPermission.mockResolvedValue(true);
      const agent = { id: 'a-1', role: Role.AGENT };
      await expect(guard.canActivate(contextFor(controller.update, agent))).resolves.toBe(true);
      await expect(guard.canActivate(contextFor(controller.assign, agent))).resolves.toBe(true);
      await expect(
        guard.canActivate(contextFor(controller.changeStatus, agent)),
      ).resolves.toBe(true);
    });

    it('allows any authenticated user on create/findAll/findOne', async () => {
      const client = { id: 'c-1', role: Role.CLIENT };
      await expect(guard.canActivate(contextFor(controller.create, client))).resolves.toBe(true);
      await expect(guard.canActivate(contextFor(controller.findAll, client))).resolves.toBe(true);
      await expect(guard.canActivate(contextFor(controller.findOne, client))).resolves.toBe(true);
      expect(mockPermissionsService.hasPermission).not.toHaveBeenCalled();
    });
  });

  describe('@UseGuards registration', () => {

    function methodGuards(handler: (...args: any[]) => unknown): any[] {
      return Reflect.getMetadata(GUARDS_METADATA, handler) ?? [];
    }

    it('registers JwtOrTokenAuthGuard at the class level', () => {
      expect(
        Reflect.getMetadata(GUARDS_METADATA, TicketsController),
      ).toContain(JwtOrTokenAuthGuard);
    });

    it('registers PermissionsGuard on update/assign/changeStatus handlers', () => {
      expect(methodGuards(controller.update)).toContain(PermissionsGuard);
      expect(methodGuards(controller.assign)).toContain(PermissionsGuard);
      expect(methodGuards(controller.changeStatus)).toContain(PermissionsGuard);
    });

    it('does not register PermissionsGuard on create/findAll/findOne handlers', () => {
      expect(methodGuards(controller.create)).not.toContain(PermissionsGuard);
      expect(methodGuards(controller.findAll)).not.toContain(PermissionsGuard);
      expect(methodGuards(controller.findOne)).not.toContain(PermissionsGuard);
    });
  });

  describe('changeStatus/assign delegation', () => {
    it('delegates changeStatus to the service with the caller user', async () => {
      const req = { user: { id: 'agent-1', role: Role.AGENT } };
      mockTicketsService.changeStatus.mockResolvedValue({ id: 't1' });

      await controller.changeStatus(
        't1',
        { status: TicketStatus.IN_PROGRESS },
        req as never,
      );

      expect(mockTicketsService.changeStatus).toHaveBeenCalledWith(
        't1',
        TicketStatus.IN_PROGRESS,
        { id: 'agent-1', role: Role.AGENT },
      );
    });

    it('delegates assign to the service', async () => {
      mockTicketsService.assign.mockResolvedValue({ id: 't1' });
      const req = { user: { id: 'agent-1', role: Role.AGENT } };

      await controller.assign('t1', { agentId: 'agent-1' }, req as never);

      expect(mockTicketsService.assign).toHaveBeenCalledWith(
        't1',
        'agent-1',
        { id: 'agent-1', role: Role.AGENT },
      );
    });
  });

  describe('changeServiceDesk', () => {
    it('delegates to the service with the caller user', async () => {
      const req = { user: { id: 'agent-1', role: Role.AGENT } };
      mockTicketsService.changeServiceDesk.mockResolvedValue({ id: 't1' });

      await controller.changeServiceDesk(
        't1',
        { serviceDeskId: 'desk-2' },
        req as never,
      );

      expect(mockTicketsService.changeServiceDesk).toHaveBeenCalledWith(
        't1',
        'desk-2',
        { id: 'agent-1', role: Role.AGENT },
      );
    });

    it('requires EDIT_TICKETS', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.changeServiceDesk),
      ).toEqual(['EDIT_TICKETS']);
    });
  });

  describe('findAudits', () => {
    it('delegates to the service (any authenticated role can read the trail)', async () => {
      mockTicketsService.findAudits.mockResolvedValue([]);

      await controller.findAudits('t1');

      expect(mockTicketsService.findAudits).toHaveBeenCalledWith('t1');
    });

    it('is not restricted to any permission (service/guard handles visibility upstream via findOne)', () => {
      expect(
        Reflect.getMetadata(PERMISSIONS_KEY, controller.findAudits),
      ).toBeUndefined();
    });
  });

  describe('cancel', () => {
    it('delegates to the service with the caller user', async () => {
      const req = { user: { id: 'agent-1', role: Role.AGENT } };
      mockTicketsService.cancel.mockResolvedValue({ id: 't1' });

      await controller.cancel('t1', req as never);

      expect(mockTicketsService.cancel).toHaveBeenCalledWith('t1', {
        id: 'agent-1',
        role: Role.AGENT,
      });
    });

    it('requires EDIT_TICKETS', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.cancel)).toEqual([
        'EDIT_TICKETS',
      ]);
    });
  });

  describe('addSlaHours', () => {
    it('delegates hours and the caller user to the service', async () => {
      const req = { user: { id: 'agent-1', role: Role.AGENT } };
      mockTicketsService.addSlaHours.mockResolvedValue({ id: 't1' });

      await controller.addSlaHours('t1', { hours: 2 }, req as never);

      expect(mockTicketsService.addSlaHours).toHaveBeenCalledWith(
        't1',
        2,
        { id: 'agent-1', role: Role.AGENT },
      );
    });

    it('requires ADD_SLA_TIME', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.addSlaHours)).toEqual([
        'ADD_SLA_TIME',
      ]);
    });
  });
});
