import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

describe('UsersController', () => {
  let controller: UsersController;
  let service: { findAgents: jest.Mock };

  beforeEach(async () => {
    service = { findAgents: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: UsersService, useValue: service }],
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
});
