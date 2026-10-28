import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { AppointmentType, Role } from '@prisma/client';
import { AgendaController } from './agenda.controller';
import { AgendaService } from './agenda.service';
import { PERMISSIONS_KEY } from '../auth/decorators/require-permission.decorator';
import { PermissionsService } from '../permissions/permissions.service';
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
        { provide: PermissionsService, useValue: { hasPermission: jest.fn() } },
        Reflector,
      ],
    }).compile();

    controller = module.get<AgendaController>(AgendaController);
    jest.clearAllMocks();
  });

  it('is defined', () => {
    expect(controller).toBeDefined();
  });

  describe('@RequirePermission metadata', () => {
    it('requires VIEW_ALL_SCHEDULES on findAll', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findAll)).toEqual([
        'VIEW_ALL_SCHEDULES',
      ]);
    });

    it('requires VIEW_ALL_SCHEDULES on findOne', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.findOne)).toEqual([
        'VIEW_ALL_SCHEDULES',
      ]);
    });

    it('requires CREATE_TICKET_SCHEDULING on create', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.create)).toEqual([
        'CREATE_TICKET_SCHEDULING',
      ]);
    });

    it('requires CREATE_TICKET_SCHEDULING on update', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.update)).toEqual([
        'CREATE_TICKET_SCHEDULING',
      ]);
    });

    it('requires CREATE_TICKET_SCHEDULING on remove', () => {
      expect(Reflect.getMetadata(PERMISSIONS_KEY, controller.remove)).toEqual([
        'CREATE_TICKET_SCHEDULING',
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
        type: AppointmentType.AGENDA,
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
