import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';
import { PermissionsService } from '../permissions/permissions.service';

describe('UsersController', () => {
  let controller: UsersController;
  let service: {
    findAgents: jest.Mock;
    findAll: jest.Mock;
    findOne: jest.Mock;
    setActive: jest.Mock;
  };

  beforeEach(async () => {
    service = {
      findAgents: jest.fn(),
      findAll: jest.fn(),
      findOne: jest.fn(),
      setActive: jest.fn(),
    };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: service },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getAgents', () => {
    it('returns a list of agents and admins', async () => {
      const mockAgents = [
        { id: '1', name: 'Agent A', email: 'a@ex.com', role: Role.AGENT },
        { id: '2', name: 'Admin B', email: 'b@ex.com', role: Role.ADMIN },
      ];
      service.findAgents.mockResolvedValueOnce(mockAgents);

      const fakeUser = { id: 'admin-1', role: Role.ADMIN };
      const result = await controller.getAgents({ user: fakeUser } as any);

      expect(service.findAgents).toHaveBeenCalledWith(fakeUser);
      expect(result).toEqual(mockAgents);
    });
  });

  it('forwards the authenticated agent identity to the tenant-scoped directory', async () => {
    const currentUser = { id: 'agent-scoped', role: Role.AGENT };
    const permittedAgents = [{ id: 'same-desk-agent', role: Role.AGENT }];
    service.findAgents.mockResolvedValueOnce(permittedAgents);

    const result = await controller.getAgents({ user: currentUser } as any);

    expect(service.findAgents).toHaveBeenCalledWith(currentUser);
    expect(result).toEqual(permittedAgents);
  });

  describe('findAll', () => {
    it('forwards the query params to the service', async () => {
      const query = { q: 'jane', page: '1' };
      service.findAll.mockResolvedValueOnce({ data: [], meta: {} });

      await controller.findAll(query as never);

      expect(service.findAll).toHaveBeenCalledWith(query);
    });
  });

  describe('findOne', () => {
    it('returns the user enriched with groups', async () => {
      const mockUser = { id: 'user-1', name: 'Jane', permissionGroups: [] };
      service.findOne.mockResolvedValueOnce(mockUser);

      const result = await controller.findOne('user-1');

      expect(service.findOne).toHaveBeenCalledWith('user-1');
      expect(result).toEqual(mockUser);
    });
  });

  describe('setActive', () => {
    it('toggles the active flag via the service', async () => {
      const mockUser = { id: 'user-1', active: false };
      service.setActive.mockResolvedValueOnce(mockUser);

      const result = await controller.setActive('user-1', { active: false });

      expect(service.setActive).toHaveBeenCalledWith('user-1', false);
      expect(result).toEqual(mockUser);
    });
  });
});
