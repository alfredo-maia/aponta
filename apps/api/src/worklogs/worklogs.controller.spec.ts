import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { WorklogsController } from './worklogs.controller';
import { WorklogsService } from './worklogs.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

describe('WorklogsController', () => {
  let controller: WorklogsController;
  let service: {
    create: jest.Mock;
    findByTicket: jest.Mock;
    delete: jest.Mock;
  };

  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findByTicket: jest.fn(),
      delete: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorklogsController],
      providers: [{ provide: WorklogsService, useValue: service }],
    }).compile();

    controller = module.get<WorklogsController>(WorklogsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should delegate to service with ticketId, dto and user', async () => {
      const dto = { minutes: 90, description: 'Correção bug' };
      service.create.mockResolvedValue({ id: 'wl-1', ...dto });

      const result = await controller.create('t-1', dto, { user: agentUser });

      expect(service.create).toHaveBeenCalledWith('t-1', dto, agentUser);
      expect(result).toEqual({ id: 'wl-1', ...dto });
    });
  });

  describe('findByTicket', () => {
    it('should delegate to service with ticketId and user', async () => {
      service.findByTicket.mockResolvedValue([{ id: 'wl-1' }]);

      const result = await controller.findByTicket('t-1', { user: agentUser });

      expect(service.findByTicket).toHaveBeenCalledWith('t-1', agentUser);
      expect(result).toEqual([{ id: 'wl-1' }]);
    });
  });

  describe('delete', () => {
    it('should delegate to service with ticketId, worklogId and user', async () => {
      service.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await controller.delete('t-1', 'wl-1', { user: agentUser });

      expect(service.delete).toHaveBeenCalledWith('t-1', 'wl-1', agentUser);
      expect(result).toEqual({ id: 'wl-1' });
    });
  });
});
