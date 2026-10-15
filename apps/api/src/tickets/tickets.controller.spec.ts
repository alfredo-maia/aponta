import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ExecutionContext } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Role, TicketStatus } from '@prisma/client';
import { TicketsController } from './tickets.controller';
import { TicketsService } from './tickets.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtOrTokenAuthGuard } from '../auth/guards/jwt-or-token-auth.guard';

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
      providers: [{ provide: TicketsService, useValue: mockTicketsService }],
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

  describe('@Roles metadata declarations', () => {
    it('does not restrict create to any role (all authenticated roles can create)', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.create),
      ).toBeUndefined();
    });

    it('does not restrict findAll/findOne to any role (service filters instead)', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.findAll),
      ).toBeUndefined();
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.findOne),
      ).toBeUndefined();
    });

    it('requires AGENT or ADMIN on update', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
        Role.AGENT,
        Role.ADMIN,
      ]);
    });

    it('requires AGENT or ADMIN on assign', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.assign)).toEqual([
        Role.AGENT,
        Role.ADMIN,
      ]);
    });

    it('requires AGENT or ADMIN on changeStatus', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.changeStatus),
      ).toEqual([Role.AGENT, Role.ADMIN]);
    });

    it('requires AGENT or ADMIN on changeStage', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.changeStage),
      ).toEqual([Role.AGENT, Role.ADMIN]);
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
       
      handler: (...args: any[]) => unknown,
      role?: Role,
    ): ExecutionContext {
      return {
        switchToHttp: () => ({
          getRequest: () => ({ user: role ? { role } : undefined }),
        }),
        getHandler: () => handler,
        getClass: () => TicketsController,
      } as unknown as ExecutionContext;
    }

    it('blocks CLIENT from update/assign/changeStatus', () => {
      expect(
        guard.canActivate(contextFor(controller.update, Role.CLIENT)),
      ).toBe(false);
      expect(
        guard.canActivate(contextFor(controller.assign, Role.CLIENT)),
      ).toBe(false);
      expect(
        guard.canActivate(contextFor(controller.changeStatus, Role.CLIENT)),
      ).toBe(false);
    });

    it('allows AGENT and ADMIN on update/assign/changeStatus', () => {
      for (const role of [Role.AGENT, Role.ADMIN]) {
        expect(
          guard.canActivate(contextFor(controller.update, role)),
        ).toBe(true);
        expect(
          guard.canActivate(contextFor(controller.assign, role)),
        ).toBe(true);
        expect(
          guard.canActivate(contextFor(controller.changeStatus, role)),
        ).toBe(true);
      }
    });

    it('allows any authenticated role on create/findAll/findOne', () => {
      expect(
        guard.canActivate(contextFor(controller.create, Role.CLIENT)),
      ).toBe(true);
      expect(
        guard.canActivate(contextFor(controller.findAll, Role.CLIENT)),
      ).toBe(true);
      expect(
        guard.canActivate(contextFor(controller.findOne, Role.CLIENT)),
      ).toBe(true);
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

    it('registers RolesGuard on update/assign/changeStatus handlers', () => {
      expect(methodGuards(controller.update)).toContain(RolesGuard);
      expect(methodGuards(controller.assign)).toContain(RolesGuard);
      expect(methodGuards(controller.changeStatus)).toContain(RolesGuard);
    });

    it('does not register RolesGuard on create/findAll/findOne handlers', () => {
      expect(methodGuards(controller.create)).not.toContain(RolesGuard);
      expect(methodGuards(controller.findAll)).not.toContain(RolesGuard);
      expect(methodGuards(controller.findOne)).not.toContain(RolesGuard);
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

    it('requires AGENT or ADMIN', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.changeServiceDesk),
      ).toEqual([Role.AGENT, Role.ADMIN]);
    });
  });

  describe('findAudits', () => {
    it('delegates to the service (any authenticated role can read the trail)', async () => {
      mockTicketsService.findAudits.mockResolvedValue([]);

      await controller.findAudits('t1');

      expect(mockTicketsService.findAudits).toHaveBeenCalledWith('t1');
    });

    it('is not restricted to any role (service/guard handles visibility upstream via findOne)', () => {
      expect(
        Reflect.getMetadata(ROLES_KEY, controller.findAudits),
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

    it('requires AGENT, AGENT_MASTER or ADMIN', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.cancel)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
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

    it('requires AGENT, AGENT_MASTER or ADMIN', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.addSlaHours)).toEqual([
        Role.AGENT,
        Role.AGENT_MASTER,
        Role.ADMIN,
      ]);
    });
  });
});
