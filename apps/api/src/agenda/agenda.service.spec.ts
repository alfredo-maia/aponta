import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AppointmentType, Role } from '@prisma/client';
import { AgendaService } from './agenda.service';
import { PrismaService } from '../prisma/prisma.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

describe('AgendaService', () => {
  let service: AgendaService;
  let prisma: {
    appointment: {
      findMany: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };

  const adminUser: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };
  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
  const agent2User: CurrentUserPayload = { id: 'agent-2', role: Role.AGENT };
  const clientMasterUser: CurrentUserPayload = {
    id: 'cm-1',
    role: Role.CLIENT_MASTER,
    organizationId: 'org-1',
  };
  const clientUser: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };

  const mockAppointment = {
    id: 'app-1',
    title: 'Reunião de Alinhamento',
    description: 'Sprint planning',
    startTime: new Date('2026-10-15T10:00:00Z'),
    endTime: new Date('2026-10-15T11:00:00Z'),
    type: AppointmentType.APPOINTMENT,
    userId: 'agent-1',
    organizationId: 'org-1',
    ticketId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'agent-1', name: 'Agente 1', email: 'agente1@test.com' },
    organization: { id: 'org-1', name: 'Org 1' },
    ticket: null,
  };

  beforeEach(async () => {
    prisma = {
      appointment: {
        findMany: jest.fn().mockResolvedValue([mockAppointment]),
        findFirst: jest.fn().mockResolvedValue(mockAppointment),
        create: jest.fn().mockResolvedValue(mockAppointment),
        update: jest.fn().mockResolvedValue(mockAppointment),
        delete: jest.fn().mockResolvedValue(mockAppointment),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgendaService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AgendaService>(AgendaService);
  });

  describe('findAll', () => {
    it('should find all appointments with no restrictions for ADMIN', async () => {
      const result = await service.findAll({}, adminUser);
      expect(result).toEqual([mockAppointment]);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        }),
      );
    });

    it('should filter by specific userId if ADMIN passes query.userId', async () => {
      await service.findAll({ userId: 'agent-2' }, adminUser);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'agent-2' },
        }),
      );
    });

    it('should enforce own userId for AGENT even if different userId is passed', async () => {
      await service.findAll({ userId: 'agent-2' }, agentUser);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 'agent-1' },
        }),
      );
    });

    it('should filter by organizationId and hide ABSENCE for CLIENT_MASTER', async () => {
      await service.findAll({}, clientMasterUser);
      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            organizationId: 'org-1',
            type: { not: AppointmentType.ABSENCE },
          },
        }),
      );
    });

    it('should return empty array if CLIENT_MASTER requests type ABSENCE', async () => {
      const result = await service.findAll({ type: AppointmentType.ABSENCE }, clientMasterUser);
      expect(result).toEqual([]);
      expect(prisma.appointment.findMany).not.toHaveBeenCalled();
    });

    it('should apply temporal overlap filter when dates are passed', async () => {
      await service.findAll(
        {
          startTime: '2026-10-15T00:00:00Z',
          endTime: '2026-10-15T23:59:59Z',
        },
        adminUser,
      );

      expect(prisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            startTime: { lte: new Date('2026-10-15T23:59:59Z') },
            endTime: { gte: new Date('2026-10-15T00:00:00Z') },
          }),
        }),
      );
    });
  });

  describe('findOne', () => {
    it('should return appointment if found', async () => {
      const result = await service.findOne('app-1', adminUser);
      expect(result).toEqual(mockAppointment);
    });

    it('should throw NotFoundException if appointment is not found', async () => {
      prisma.appointment.findFirst.mockResolvedValue(null);
      await expect(service.findOne('non-existent', adminUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('should create an appointment for AGENT with current user id', async () => {
      const dto = {
        title: 'Atendimento Remoto',
        startTime: '2026-10-16T14:00:00Z',
        endTime: '2026-10-16T15:00:00Z',
        type: AppointmentType.ALLOCATION,
      };

      await service.create(dto, agentUser);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: 'Atendimento Remoto',
          userId: 'agent-1',
          type: AppointmentType.ALLOCATION,
        }),
        include: expect.any(Object),
      });
    });

    it('should allow ADMIN to specify target userId', async () => {
      const dto = {
        title: 'Treinamento',
        startTime: '2026-10-16T14:00:00Z',
        endTime: '2026-10-16T15:00:00Z',
        userId: 'agent-2',
      };

      await service.create(dto, adminUser);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'agent-2',
        }),
        include: expect.any(Object),
      });
    });

    it('should force organizationId for CLIENT_MASTER', async () => {
      const dto = {
        title: 'Reunião com DM Tech',
        startTime: '2026-10-16T14:00:00Z',
        endTime: '2026-10-16T15:00:00Z',
      };

      await service.create(dto, clientMasterUser);
      expect(prisma.appointment.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          organizationId: 'org-1',
        }),
        include: expect.any(Object),
      });
    });

    it('should throw BadRequestException if endTime is <= startTime', async () => {
      const dto = {
        title: 'Horário Inválido',
        startTime: '2026-10-16T15:00:00Z',
        endTime: '2026-10-16T14:00:00Z',
      };

      await expect(service.create(dto, agentUser)).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if CLIENT tries to create', async () => {
      const dto = {
        title: 'Tentativa Cliente',
        startTime: '2026-10-16T14:00:00Z',
        endTime: '2026-10-16T15:00:00Z',
      };

      await expect(service.create(dto, clientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('should allow author to update appointment', async () => {
      await service.update('app-1', { title: 'Novo Título' }, agentUser);
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({ title: 'Novo Título' }),
        }),
      );
    });

    it('should allow ADMIN to update appointment of another agent', async () => {
      await service.update('app-1', { title: 'Admin Update' }, adminUser);
      expect(prisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'app-1' },
          data: expect.objectContaining({ title: 'Admin Update' }),
        }),
      );
    });

    it('should throw ForbiddenException if another AGENT tries to update', async () => {
      await expect(
        service.update('app-1', { title: 'Invasão' }, agent2User),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw BadRequestException if updated interval is invalid', async () => {
      await expect(
        service.update(
          'app-1',
          {
            startTime: '2026-10-15T12:00:00Z',
            endTime: '2026-10-15T11:00:00Z',
          },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('should allow author to delete appointment', async () => {
      await service.remove('app-1', agentUser);
      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'app-1' },
      });
    });

    it('should allow ADMIN to delete appointment', async () => {
      await service.remove('app-1', adminUser);
      expect(prisma.appointment.delete).toHaveBeenCalledWith({
        where: { id: 'app-1' },
      });
    });

    it('should throw ForbiddenException if non-author AGENT tries to delete', async () => {
      await expect(service.remove('app-1', agent2User)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
