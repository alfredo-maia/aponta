import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AttendanceType, Role, TicketStatus, ValuationType } from '@prisma/client';
import { WorklogsService } from './worklogs.service';
import { PrismaService } from '../prisma/prisma.service';
import { CommentsService } from '../comments/comments.service';
import { CurrentUserPayload } from '../tickets/decorators/current-user.decorator';

describe('WorklogsService', () => {
  let service: WorklogsService;
  let mockPrisma: {
    ticket: {
      findUnique: jest.Mock;
      update: jest.Mock;
    };
    user: {
      findUnique: jest.Mock;
    };
    contract: {
      findFirst: jest.Mock;
    };
    worklog: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      delete: jest.Mock;
    };
  };
  let mockCommentsService: { create: jest.Mock };

  const agentUser: CurrentUserPayload = { id: 'agent-1', role: Role.AGENT };
  const adminUser: CurrentUserPayload = { id: 'admin-1', role: Role.ADMIN };
  const clientUser: CurrentUserPayload = { id: 'client-1', role: Role.CLIENT };

  const validTicket = { id: 'ticket-1', title: 'Problema no ERP' };

  beforeEach(async () => {
    mockPrisma = {
      ticket: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
      },
      contract: {
        findFirst: jest.fn(),
      },
      worklog: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    };
    mockCommentsService = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorklogsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: CommentsService, useValue: mockCommentsService },
      ],
    }).compile();

    service = module.get<WorklogsService>(WorklogsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should allow AGENT to create a worklog for themselves, deriving minutes from the time range', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
        minutes: 60,
        description: 'Análise de banco',
        billable: true,
        author: { id: 'agent-1', name: 'Agent One', email: 'agent@test.com' },
      });

      const result = await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Análise de banco',
        },
        agentUser,
      );

      expect(result.id).toBe('wl-1');
      expect(mockPrisma.worklog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-1',
          minutes: 60,
          startTime: new Date('2026-10-13T08:00:00Z'),
          endTime: new Date('2026-10-13T09:00:00Z'),
          attendanceType: AttendanceType.REMOTE,
          description: 'Análise de banco',
          billable: true,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
    });

    it('should accept an explicit ON_SITE attendanceType', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-3' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T08:30:00Z',
          attendanceType: AttendanceType.ON_SITE,
          description: 'Visita técnica',
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ attendanceType: AttendanceType.ON_SITE, minutes: 30 }),
        }),
      );
    });

    it('should throw BadRequestException when endTime is not after startTime', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T09:00:00Z',
            endTime: '2026-10-13T08:00:00Z',
            description: 'Horário inválido',
          },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException when startTime or endTime cannot be parsed', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          { startTime: 'not-a-date', endTime: '2026-10-13T08:00:00Z', description: 'Teste' },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException when AGENT tries to log for another user', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T08:30:00Z',
            description: 'Trabalho',
            authorId: 'other-user',
          },
          agentUser,
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should allow ADMIN to log work for another user if authorId is provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'agent-2', name: 'Agent Two' });
      mockPrisma.worklog.create.mockResolvedValue({
        id: 'wl-2',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
        minutes: 120,
        description: 'Desenvolvimento',
        billable: false,
      });

      const result = await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T10:00:00Z',
          description: 'Desenvolvimento',
          billable: false,
          authorId: 'agent-2',
        },
        adminUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith({
        data: {
          ticketId: 'ticket-1',
          authorId: 'agent-2',
          minutes: 120,
          startTime: new Date('2026-10-13T08:00:00Z'),
          endTime: new Date('2026-10-13T10:00:00Z'),
          attendanceType: AttendanceType.REMOTE,
          description: 'Desenvolvimento',
          billable: false,
        },
        include: {
          author: { select: { id: true, name: true, email: true } },
        },
      });
      expect(result.id).toBe('wl-2');
    });

    it('should throw NotFoundException if ADMIN specifies non-existent authorId', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T08:45:00Z',
            description: 'Task',
            authorId: 'non-existent',
          },
          adminUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if ticket does not exist', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(
        service.create(
          'invalid-ticket',
          { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Task' },
          agentUser,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if CLIENT tries to create a worklog', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T09:00:00Z',
            description: 'Tentativa cliente',
          },
          clientUser,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update the ticket status when nextStatus is provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-4' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Resolvido',
          nextStatus: TicketStatus.RESOLVED,
        },
        agentUser,
      );

      expect(mockPrisma.ticket.update).toHaveBeenCalledWith({
        where: { id: 'ticket-1' },
        data: { status: TicketStatus.RESOLVED },
      });
    });

    it('should not touch the ticket status when nextStatus is not provided', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-5' });

      await service.create(
        'ticket-1',
        { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Sem mudança' },
        agentUser,
      );

      expect(mockPrisma.ticket.update).not.toHaveBeenCalled();
    });

    it('should publish the description as a non-internal comment when sendAsReply is true', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-6' });
      mockCommentsService.create.mockResolvedValue({ id: 'c-1' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Diagnóstico concluído',
          sendAsReply: true,
        },
        agentUser,
      );

      expect(mockCommentsService.create).toHaveBeenCalledWith(
        'ticket-1',
        { content: 'Diagnóstico concluído', isInternal: false },
        agentUser,
      );
    });

    it('should not create a comment when sendAsReply is omitted', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-7' });

      await service.create(
        'ticket-1',
        { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Sem resposta' },
        agentUser,
      );

      expect(mockCommentsService.create).not.toHaveBeenCalled();
    });

    it('should store the manual value when valuationType is MANUAL', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-8' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Ajuste pontual',
          valuationType: ValuationType.MANUAL,
          value: 250,
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ valuationType: ValuationType.MANUAL, value: 250 }) }),
      );
    });

    it('should throw BadRequestException when valuationType is MANUAL without a value', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(
        service.create(
          'ticket-1',
          {
            startTime: '2026-10-13T08:00:00Z',
            endTime: '2026-10-13T09:00:00Z',
            description: 'Sem valor',
            valuationType: ValuationType.MANUAL,
          },
          agentUser,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(mockPrisma.worklog.create).not.toHaveBeenCalled();
    });

    it('should zero the value and default billable to false when valuationType is GUARANTEE', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-9' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Retrabalho em garantia',
          valuationType: ValuationType.GUARANTEE,
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ valuationType: ValuationType.GUARANTEE, value: 0, billable: false }),
        }),
      );
    });

    it('should respect an explicit billable flag even under GUARANTEE', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-10' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Garantia faturável por acordo',
          valuationType: ValuationType.GUARANTEE,
          billable: true,
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ billable: true, value: 0 }) }),
      );
    });

    it('should compute value from the organization active contract when valuationType is CONTRACT', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...validTicket,
        requester: { organization: { id: 'org-1' } },
      });
      mockPrisma.contract.findFirst.mockResolvedValue({
        id: 'contract-1',
        organizationId: 'org-1',
        active: true,
        monthlyValue: 6000,
        hoursLimit: 60,
      });
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-11' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z', // 60 minutes = 1h
          description: 'Atendimento contratual',
          valuationType: ValuationType.CONTRACT,
        },
        agentUser,
      );

      expect(mockPrisma.contract.findFirst).toHaveBeenCalledWith({
        where: { organizationId: 'org-1', active: true },
      });
      // hourlyRate = 6000 / 60 = 100; 1h -> 100
      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ valuationType: ValuationType.CONTRACT, value: 100 }) }),
      );
    });

    it('should leave value null under CONTRACT when there is no active contract', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue({
        ...validTicket,
        requester: { organization: { id: 'org-2' } },
      });
      mockPrisma.contract.findFirst.mockResolvedValue(null);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-12' });

      await service.create(
        'ticket-1',
        {
          startTime: '2026-10-13T08:00:00Z',
          endTime: '2026-10-13T09:00:00Z',
          description: 'Sem contrato ativo',
          valuationType: ValuationType.CONTRACT,
        },
        agentUser,
      );

      expect(mockPrisma.worklog.create).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ valuationType: ValuationType.CONTRACT, value: null }) }),
      );
    });

    it('should not include valuationType/value in the create payload when valuationType is omitted', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.create.mockResolvedValue({ id: 'wl-13' });

      await service.create(
        'ticket-1',
        { startTime: '2026-10-13T08:00:00Z', endTime: '2026-10-13T09:00:00Z', description: 'Padrão' },
        agentUser,
      );

      const callArgs = mockPrisma.worklog.create.mock.calls[0][0];
      expect(callArgs.data).not.toHaveProperty('valuationType');
      expect(callArgs.data).not.toHaveProperty('value');
      expect(mockPrisma.contract.findFirst).not.toHaveBeenCalled();
    });
  });

  describe('findByTicket', () => {
    it('should return worklogs for valid ticket', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);
      mockPrisma.worklog.findMany.mockResolvedValue([
        { id: 'wl-1', minutes: 60, description: 'Log 1' },
      ]);

      const result = await service.findByTicket('ticket-1', agentUser);

      expect(result).toHaveLength(1);
      expect(mockPrisma.worklog.findMany).toHaveBeenCalledWith({
        where: { ticketId: 'ticket-1' },
        include: { author: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: 'desc' },
      });
    });

    it('should throw NotFoundException when ticket not found', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(null);

      await expect(service.findByTicket('none', agentUser)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException for CLIENT', async () => {
      mockPrisma.ticket.findUnique.mockResolvedValue(validTicket);

      await expect(service.findByTicket('ticket-1', clientUser)).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('should allow AGENT to delete their own worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-1',
      });
      mockPrisma.worklog.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await service.delete('ticket-1', 'wl-1', agentUser);
      expect(result.id).toBe('wl-1');
      expect(mockPrisma.worklog.delete).toHaveBeenCalledWith({ where: { id: 'wl-1' } });
    });

    it('should forbid AGENT from deleting another user worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });

      await expect(service.delete('ticket-1', 'wl-1', agentUser)).rejects.toThrow(ForbiddenException);
    });

    it('should allow ADMIN to delete any worklog', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'ticket-1',
        authorId: 'agent-2',
      });
      mockPrisma.worklog.delete.mockResolvedValue({ id: 'wl-1' });

      const result = await service.delete('ticket-1', 'wl-1', adminUser);
      expect(result.id).toBe('wl-1');
    });

    it('should throw NotFoundException when worklog not found or ticket mismatch', async () => {
      mockPrisma.worklog.findUnique.mockResolvedValue({
        id: 'wl-1',
        ticketId: 'other-ticket',
        authorId: 'agent-1',
      });

      await expect(service.delete('ticket-1', 'wl-1', agentUser)).rejects.toThrow(NotFoundException);
    });
  });
});
