import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { WorklogsController } from './worklogs.controller';
import { WorklogsService } from './worklogs.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';
import { PermissionsService } from '../permissions/permissions.service';

describe('WorklogsController', () => {
  let controller: WorklogsController;
  let service: {
    create: jest.Mock;
    findByTicket: jest.Mock;
    delete: jest.Mock;
    createPreAppointment: jest.Mock;
    findPreAppointments: jest.Mock;
    stopPreAppointment: jest.Mock;
    deletePreAppointment: jest.Mock;
  };

  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };

  beforeEach(async () => {
    service = {
      create: jest.fn(),
      findByTicket: jest.fn(),
      delete: jest.fn(),
      createPreAppointment: jest.fn(),
      findPreAppointments: jest.fn(),
      stopPreAppointment: jest.fn(),
      deletePreAppointment: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [WorklogsController],
      providers: [
        { provide: WorklogsService, useValue: service },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
      ],
    }).compile();

    controller = module.get<WorklogsController>(WorklogsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should delegate to service with ticketId, dto and user', async () => {
      const dto = {
        startTime: '2026-10-13T08:00:00Z',
        endTime: '2026-10-13T09:30:00Z',
        description: 'Correção bug',
      };
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

  describe('pre-appointments', () => {
    it('should create a pré-apontamento', async () => {
      const dto = { beginning: '2026-10-15T14:36:00.000Z' };
      service.createPreAppointment.mockResolvedValue({ id: 'pre-1', ...dto });

      const result = await controller.createPreAppointment('t-1', dto, { user: agentUser });

      expect(service.createPreAppointment).toHaveBeenCalledWith('t-1', dto, agentUser);
      expect(result).toEqual({ id: 'pre-1', ...dto });
    });

    it('should list pré-apontamentos', async () => {
      service.findPreAppointments.mockResolvedValue([{ id: 'pre-1' }, { id: 'pre-2' }]);

      const result = await controller.findPreAppointments('t-1', { user: agentUser });

      expect(service.findPreAppointments).toHaveBeenCalledWith('t-1', agentUser);
      expect(result).toHaveLength(2);
    });

    it('should stop a pré-apontamento', async () => {
      const dto = { ending: '2026-10-15T15:10:00.000Z' };
      service.stopPreAppointment.mockResolvedValue({ id: 'pre-1' });

      await controller.stopPreAppointment('t-1', 'pre-1', dto, { user: agentUser });

      expect(service.stopPreAppointment).toHaveBeenCalledWith('t-1', 'pre-1', dto, agentUser);
    });

    it('should delete a pré-apontamento', async () => {
      service.deletePreAppointment.mockResolvedValue({ id: 'pre-1' });

      await controller.deletePreAppointment('t-1', 'pre-1', { user: agentUser });

      expect(service.deletePreAppointment).toHaveBeenCalledWith('t-1', 'pre-1', agentUser);
    });
  });
});
