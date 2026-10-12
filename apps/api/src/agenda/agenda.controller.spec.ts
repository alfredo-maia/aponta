import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AppointmentType, Role } from '@prisma/client';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

const mockAgendaService = {
  findAll: jest.fn(),
  findOne: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
};

describe('AgendaController', () => {
  let controller: AgendaController;

  const mockUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgendaController],
      providers: [
        { provide: AgendaService, useValue: mockAgendaService },
        Reflector,
      ],
    }).compile();

    controller = module.get<AgendaController>(AgendaController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@Roles metadata', () => {
    it('allows ADMIN, AGENT_MASTER, AGENT, CLIENT_MASTER on findAll', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual([
        Role.ADMIN,
        Role.AGENT_MASTER,
        Role.AGENT,
        Role.CLIENT_MASTER,
      ]);
    });

    it('allows ADMIN, AGENT_MASTER, AGENT, CLIENT_MASTER on findOne', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual([
        Role.ADMIN,
        Role.AGENT_MASTER,
        Role.AGENT,
        Role.CLIENT_MASTER,
      ]);
    });

    it('allows ADMIN, AGENT_MASTER, AGENT, CLIENT_MASTER on create', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
        Role.ADMIN,
        Role.AGENT_MASTER,
        Role.AGENT,
        Role.CLIENT_MASTER,
      ]);
    });

    it('allows only ADMIN, AGENT_MASTER, AGENT on update', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
        Role.ADMIN,
        Role.AGENT_MASTER,
        Role.AGENT,
      ]);
    });

    it('allows only ADMIN, AGENT_MASTER, AGENT on remove', () => {
      expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
        Role.ADMIN,
        Role.AGENT_MASTER,
        Role.AGENT,
      ]);
    });
  });

  describe('delegation', () => {
    it('findAll delegates to agendaService.findAll', async () => {
      const query = { userId: 'u1' };
      mockAgendaService.findAll.mockResolvedValue([]);
      await controller.findAll(query, mockUser);
      expect(mockAgendaService.findAll).toHaveBeenCalledWith(query, mockUser);
    });

    it('findOne delegates to agendaService.findOne', async () => {
      mockAgendaService.findOne.mockResolvedValue({ id: 'app-1' });
      await controller.findOne('app-1', mockUser);
      expect(mockAgendaService.findOne).toHaveBeenCalledWith('app-1', mockUser);
    });

    it('create delegates to agendaService.create', async () => {
      const dto = {
        title: 'Teste',
        startTime: '2026-10-15T10:00:00Z',
        endTime: '2026-10-15T11:00:00Z',
        type: AppointmentType.APPOINTMENT,
      };
      mockAgendaService.create.mockResolvedValue({ id: 'app-1', ...dto });
      await controller.create(dto, mockUser);
      expect(mockAgendaService.create).toHaveBeenCalledWith(dto, mockUser);
    });

    it('update delegates to agendaService.update', async () => {
      const dto = { title: 'Atualizado' };
      mockAgendaService.update.mockResolvedValue({ id: 'app-1' });
      await controller.update('app-1', dto, mockUser);
      expect(mockAgendaService.update).toHaveBeenCalledWith('app-1', dto, mockUser);
    });

    it('remove delegates to agendaService.remove', async () => {
      mockAgendaService.remove.mockResolvedValue({ id: 'app-1' });
      await controller.remove('app-1', mockUser);
      expect(mockAgendaService.remove).toHaveBeenCalledWith('app-1', mockUser);
    });
  });
});
